"""Real service RPC pilot on disposable Unix socket; fictitious identities only."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import os, subprocess, tempfile, shutil, json
here=Path(__file__).resolve().parent
pg=next(iter(Path('/nix/store').glob('*-postgresql-17.*/bin')),None)
if pg is None:
    versions=sorted(Path('/usr/lib/postgresql').glob('*/bin'),reverse=True)
    if not versions: raise RuntimeError('Disposable PostgreSQL not installed')
    pg=versions[0]
tmp=Path(tempfile.mkdtemp(prefix='wf-sidecar-'));os.chmod(tmp,0o777)
env={k:v for k,v in os.environ.items() if not k.startswith(('PG','DATABASE','SUPABASE','LOVABLE'))}
prefix=['setpriv','--reuid=1000','--regid=1000','--clear-groups'] if os.geteuid()==0 else []
def run(args,**kw):return subprocess.run(prefix+[str(x) for x in args],env=env,check=True,**kw)
def sql(s):return run([pg/'psql','-X','-h',tmp,'-p','55462','-U','fixture','-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True).stdout.strip()
def reject(s,reason):
    try:sql(s)
    except subprocess.CalledProcessError as e:
        assert reason in e.stderr,e.stderr
        return
    raise AssertionError('Unexpected acceptance')
ws='11111111-1111-4111-8111-111111111111';project='22222222-2222-4222-8222-222222222222'
op='33333333-3333-4333-8333-333333333333';user='44444444-4444-4444-8444-444444444444'
task='55555555-5555-4555-8555-555555555555';uid='a'*32;digest='b'*64;other='c'*64
c="SET request.jwt.claims='{\"role\":\"service_role\"}';"
started=False
try:
    run([pg/'initdb','-D',tmp/'data','-A','trust','-U','fixture','--no-locale'],stdout=subprocess.DEVNULL)
    run([pg/'pg_ctl','-D',tmp/'data','-l',tmp/'log','-o',f"-k {tmp} -p 55462 -c listen_addresses=''",'-w','start'],stdout=subprocess.DEVNULL);started=True
    sql('''CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE workspaces(id uuid PRIMARY KEY);
    CREATE TABLE projects(id uuid PRIMARY KEY,workspace_id uuid);
    CREATE TABLE tasks(id uuid PRIMARY KEY,project_id uuid);
    CREATE TABLE workspace_members(workspace_id uuid,user_id uuid,role text,is_active boolean);
    CREATE TABLE workspace_storage(workspace_id uuid PRIMARY KEY,storage_used_bytes bigint,storage_limit_bytes bigint,base_storage_bytes bigint,extra_storage_bytes bigint,last_calculated_at timestamptz);
    CREATE TABLE video_versions(id uuid PRIMARY KEY,r2_key text,cloudflare_stream_uid text,is_deleted boolean,workspace_id uuid,file_size_bytes bigint,replacement_file_size_bytes bigint,replacement_r2_key text,replacement_stream_uid text);
    CREATE FUNCTION public.add_workspace_storage(p_workspace_id uuid,p_bytes bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$BEGIN UPDATE workspace_storage SET storage_used_bytes=greatest(0,storage_used_bytes+p_bytes) WHERE workspace_id=p_workspace_id;END$$;
    REVOKE ALL ON FUNCTION public.add_workspace_storage(uuid,bigint) FROM PUBLIC,anon,authenticated;
    GRANT EXECUTE ON FUNCTION public.add_workspace_storage(uuid,bigint) TO service_role;
    CREATE FUNCTION sync_workspace_storage_from_video_versions() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$BEGIN RETURN coalesce(NEW,OLD);END$$;
    CREATE TRIGGER trg_sync_storage_video_versions AFTER INSERT OR UPDATE OR DELETE ON video_versions FOR EACH ROW EXECUTE FUNCTION sync_workspace_storage_from_video_versions();
    CREATE TABLE video_approval_tokens(token text PRIMARY KEY,is_active boolean);
    CREATE TABLE video_comments(id uuid PRIMARY KEY,body text);
    CREATE TABLE video_approvals(id uuid PRIMARY KEY,notes text);''')
    sql(f"INSERT INTO workspaces VALUES('{ws}');INSERT INTO projects VALUES('{project}','{ws}');INSERT INTO tasks VALUES('{task}','{project}');INSERT INTO workspace_members VALUES('{ws}','{user}','edicao',true);INSERT INTO workspace_storage VALUES('{ws}',4,100,NULL,0,NULL);")
    sql(f"INSERT INTO video_versions VALUES('{ws}','old-key','old-uid',false,'{ws}',4,0,NULL,NULL);INSERT INTO video_approval_tokens VALUES('old-link',true);INSERT INTO video_comments VALUES('{ws}','Histórico');INSERT INTO video_approvals VALUES('{ws}','Consolidada');")
    before=sql("SELECT row_to_json(t) FROM video_versions t;SELECT row_to_json(t) FROM video_approval_tokens t;SELECT row_to_json(t) FROM video_comments t;SELECT row_to_json(t) FROM video_approvals t;")
    candidate=subprocess.check_output([os.sys.executable,here/'assemble_sidecar.py'],text=True)
    reject(candidate.rsplit('COMMIT;',1)[0]+'SELECT 1/0;COMMIT;','division by zero')
    assert sql("SELECT to_regnamespace('willflow_video_private') IS NULL")=='t'
    assert sql("SELECT row_to_json(t) FROM video_versions t;SELECT row_to_json(t) FROM video_approval_tokens t;SELECT row_to_json(t) FROM video_comments t;SELECT row_to_json(t) FROM video_approvals t;")==before
    sql("UPDATE workspace_storage SET storage_used_bytes=5;")
    reject(candidate,'VIDEO_ACCOUNTING_BASELINE_MISMATCH')
    assert sql("SELECT to_regnamespace('willflow_video_private') IS NULL")=='t'
    sql("UPDATE workspace_storage SET storage_used_bytes=4;")
    sql(candidate)
    assert sql('SELECT count(*) FROM willflow_video_private.enrollment')=='0'
    reject(c+f"SELECT private_video_issue('{op}','{ws}','{project}','{task}','{user}','fixture.mp4',10);",'Private uploads disabled')
    sql(f"INSERT INTO willflow_video_private.enrollment VALUES('{ws}',true);")
    print('PASS additive transaction late failure restores all legacy state')
    for role in ('anon','authenticated'):
        reject(f"SET ROLE {role};SELECT private_video_read('{ws}');",'permission denied')
    reject(f"SET ROLE service_role;SELECT * FROM willflow_video_private.versions;",'permission denied')
    reject(f"SELECT private_video_issue('{op}','{ws}','{project}','{task}','{user}','fixture.mp4',10);",'Forbidden')
    print('PASS service-only RPCs and no private schema access even for service client')
    issue=f"SELECT private_video_issue('{op}','{ws}','{project}','{task}','{user}','fixture.mp4',10);"
    initial=json.loads(sql(c+issue).splitlines()[-1]);vid=initial['id']
    assert initial['object_key']==f'__willflow_v2/{ws}/{op}/input.mp4'
    assert json.loads(sql(c+issue).splitlines()[-1])['id']==vid
    reject(c+issue.replace('10);','11);'),'Operation mismatch')
    assert sql("SELECT count(*) FROM video_versions")=='1'
    print('PASS issuance idempotence, exact operation identity, private namespace never projected')
    with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(lambda _:sql(c+f"SELECT private_video_persist('{op}','{user}');"),range(8)))
    usage=json.loads(sql(c+f"SELECT private_video_usage('{ws}','{user}');").splitlines()[-1]);assert usage=={'legacy_bytes':4,'private_bytes':10,'limit_bytes':100}
    print('PASS eight overlapping commits charge private 10 bytes once; legacy counter remains 4')
    # Real bundle: delayed absolute RMW is accepted but neutralized. Legacy inserts still consume real quota.
    sql(f"UPDATE workspace_storage SET storage_used_bytes=0 WHERE workspace_id='{ws}';")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='4'
    reject(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,r2_key) VALUES(gen_random_uuid(),'{ws}',91,'late-over-budget');",'Private video quota reserved')
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='4'
    claim=sql(c+f"SELECT private_video_claim('{op}','{user}');").splitlines()[-1]
    assert sql(c+f"SELECT private_video_claim('{op}','{user}') IS NULL;").splitlines()[-1]=='t'
    assert sql(c+f"SELECT private_video_finish('{op}','{claim}','{uid}');").splitlines()[-1]=='t'
    reject(f"UPDATE video_versions SET cloudflare_stream_uid='{uid}' WHERE id='{ws}';",'Private assets cannot enter legacy projection')
    reject(f"UPDATE video_versions SET r2_key='{initial['object_key']}' WHERE id='{ws}';",'Private assets cannot enter legacy projection')
    reject(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes) VALUES('{vid}','{ws}',1);",'Private assets cannot enter legacy projection')
    reject(c+f"SELECT private_video_finish('{op}','{claim}','{uid}');",'Stale provider claim')
    print('PASS budget blocks old admission overflow; durable provider claim cannot be repeated')
    sql(c+f"SELECT private_video_link('{digest}','{ws}','{project}','{task}','{user}',now()+interval '1 day');")
    read=f"SELECT private_video_read('{vid}',NULL,'{digest}');"
    assert json.loads(sql(c+read).splitlines()[-1])['version']['stream_uid']==uid
    assert json.loads(sql(c+f"SELECT private_video_list(NULL,'{digest}',NULL);").splitlines()[-1])[0]['id']==vid
    reject(c+read.replace(digest,other),'Forbidden reader')
    sql(f"UPDATE video_approval_tokens SET is_active=false;UPDATE video_versions SET is_deleted=true;")
    assert json.loads(sql(c+read).splitlines()[-1])['version']['state']=='ready'
    assert sql("SELECT active FROM willflow_video_private.links")=='t'
    print('PASS late old cleanup cannot revoke private token, withdraw private version or touch its identity')
    comment=f"SELECT private_video_feedback('{ws}','{vid}','{digest}','comment','Fixture','Corte sintético',0.5);"
    with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(lambda _:sql(c+comment),range(8)))
    assert sql('SELECT count(*) FROM willflow_video_private.comments')=='1'
    reject(c+comment.replace('Corte sintético','Outra intenção'),'Feedback identity mismatch')
    sql(c+f"SELECT private_video_feedback('{op}','{vid}','{digest}','approval','Fixture','Aprovado',0);")
    result=json.loads(sql(c+read).splitlines()[-1]);assert result['comments'][0]['body']=='Corte sintético';assert result['approval']['notes']=='Aprovado'
    assert sql("SELECT body FROM video_comments")=='Histórico';assert sql("SELECT notes FROM video_approvals")=='Consolidada'
    print('PASS comments and approvals roundtrip with private deduplication and preserved legacy history')
    sql(c+f"SELECT private_video_revoke('{digest}','{user}');")
    reject(c+read,'Forbidden reader')
    # Link cannot silently resurrect via a repeated issuance.
    reject(c+f"SELECT private_video_link('{digest}','{ws}','{project}','{task}','{user}',now()+interval '1 day');",'duplicate key')
    sql(c+f"SELECT private_video_link('{other}','{ws}','{project}','{task}','{user}',now()+interval '1 day');")
    sql(f"UPDATE willflow_video_private.links SET expires_at=now()-interval '1 second' WHERE digest='{other}';")
    reject(c+read.replace(digest,other),'Forbidden reader')
    sql(f"UPDATE workspace_members SET is_active=false;");reject(c+f"SELECT private_video_read('{vid}','{user}');",'Forbidden reader')
    sql("UPDATE workspace_members SET is_active=true;")
    print('PASS expiry, explicit revocation, duplicate link and membership revocation fail closed')
    sql(c+f"SELECT private_video_withdraw('{op}','{user}');")
    reject(c+f"SELECT private_video_read('{vid}','{user}');",'Forbidden reader')
    assert sql('SELECT count(*) FROM willflow_video_private.assets')=='2'
    usage=json.loads(sql(c+f"SELECT private_video_usage('{ws}','{user}');").splitlines()[-1]);assert usage['private_bytes']==0
    assert sql('SELECT count(*) FROM willflow_video_private.comments')=='1'
    print('PASS non-destructive withdrawal holds R2/Stream identities and private activity, releases quota once')
    uncertain='66666666-6666-4666-8666-666666666666'
    sql(c+issue.replace(op,uncertain))
    sql(c+f"SELECT private_video_persist('{uncertain}','{user}');")
    claim=sql(c+f"SELECT private_video_claim('{uncertain}','{user}');").splitlines()[-1]
    assert sql(c+f"SELECT private_video_finish('{uncertain}','{claim}',NULL);").splitlines()[-1]=='f'
    assert sql(c+f"SELECT private_video_claim('{uncertain}','{user}') IS NULL;").splitlines()[-1]=='t'
    assert sql("SELECT state FROM willflow_video_private.versions WHERE operation_id='"+uncertain+"'")=='uncertain'
    print('PASS provider uncertainty permanent; no automatic claim expiry or duplicate copy')
    from sidecar_browser_pilot import pilot
    pilot(tmp,pg,env,sql)
    sql(f"DELETE FROM tasks WHERE id='{task}';DELETE FROM projects WHERE id='{project}';")
    reject(c+f"SELECT private_video_read('{vid}','{user}');",'Forbidden reader')
    assert sql('SELECT count(*) FROM willflow_video_private.versions')=='3'
    assert sql('SELECT count(*) FROM willflow_video_private.comments')=='3'
    reject((here/'sidecar-rollback-empty.sql').read_text(),'PRIVATE_HISTORY_REQUIRES_FORWARD_RECOVERY')
    print('PASS parent deletion denies read without cascading evidence; populated rollback refuses data loss')
finally:
    if started:run([pg/'pg_ctl','-D',tmp/'data','-m','immediate','-w','stop'],stdout=subprocess.DEVNULL)
    shutil.rmtree(tmp)