"""Targeted coexistence tests. Disposable Unix-socket PostgreSQL; no hosted data/provider."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import os,subprocess,tempfile,shutil
here=Path(__file__).resolve().parent
pg=next(iter(Path('/nix/store').glob('*-postgresql-17.*/bin')),None)
if pg is None:
    versions=sorted(Path('/usr/lib/postgresql').glob('*/bin'),reverse=True)
    if not versions: raise RuntimeError('Disposable PostgreSQL not installed')
    pg=versions[0]
tmp=Path(tempfile.mkdtemp(prefix='wf-coexist-'));os.chmod(tmp,0o777)
env={k:v for k,v in os.environ.items() if not k.startswith(('PG','DATABASE','SUPABASE','LOVABLE'))}
prefix=['setpriv','--reuid=1000','--regid=1000','--clear-groups'] if os.geteuid()==0 else []
def run(args,**kw):return subprocess.run(prefix+[str(x) for x in args],env=env,check=True,**kw)
def sql(s,database='postgres'):
    return run([pg/'psql','-X','-h',tmp,'-p','55461','-U','fixture','-d',database,'-At','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True).stdout.strip()
def rejected(s,reason):
    try:sql(s)
    except subprocess.CalledProcessError as e:
        assert reason in e.stderr,e.stderr
        return
    raise AssertionError('Unexpected acceptance')
ws='11111111-1111-4111-8111-111111111111';v='22222222-2222-4222-8222-222222222222'
c="SET request.jwt.claims='{\"role\":\"service_role\"}';"
started=False
try:
    run([pg/'initdb','-D',tmp/'data','-A','trust','-U','fixture','--no-locale'],stdout=subprocess.DEVNULL)
    run([pg/'pg_ctl','-D',tmp/'data','-l',tmp/'log','-o',f"-k {tmp} -p 55461 -c listen_addresses=''",'-w','start'],stdout=subprocess.DEVNULL);started=True
    sql('''CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.workspaces(id uuid PRIMARY KEY);
    CREATE TABLE public.workspace_storage(workspace_id uuid PRIMARY KEY REFERENCES workspaces ON DELETE CASCADE,storage_used_bytes bigint NOT NULL,storage_limit_bytes bigint NOT NULL,last_calculated_at timestamptz);
    CREATE TABLE public.video_versions(id uuid PRIMARY KEY,workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
    file_size_bytes bigint,replacement_file_size_bytes bigint,is_deleted boolean DEFAULT false,
    r2_key text,replacement_r2_key text,cloudflare_stream_uid text,replacement_stream_uid text);
    CREATE FUNCTION public.add_workspace_storage(p_workspace_id uuid,p_bytes bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
      UPDATE workspace_storage SET storage_used_bytes=greatest(0,storage_used_bytes+p_bytes) WHERE workspace_id=p_workspace_id;
    END $$;
    REVOKE ALL ON FUNCTION public.add_workspace_storage(uuid,bigint) FROM PUBLIC,anon,authenticated;
    GRANT EXECUTE ON FUNCTION public.add_workspace_storage(uuid,bigint) TO service_role;
    CREATE FUNCTION public.sync_workspace_storage_from_video_versions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$BEGIN RETURN coalesce(NEW,OLD);END$$;
    CREATE TRIGGER trg_sync_storage_video_versions AFTER INSERT OR UPDATE OR DELETE ON public.video_versions FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_storage_from_video_versions();''')
    sql(f"INSERT INTO workspaces VALUES('{ws}'); INSERT INTO workspace_storage VALUES('{ws}',0,1000,NULL);")
    candidate=(here/'accounting-expand.sql').read_text()
    before=sql("SELECT md5(pg_get_functiondef('public.add_workspace_storage(uuid,bigint)'::regprocedure))")
    sql('CREATE DATABASE expand_transaction TEMPLATE postgres;')
    rejected(candidate.rsplit('COMMIT;',1)[0]+'SELECT 1/0; COMMIT;','division by zero')
    assert sql("SELECT to_regclass('public.video_legacy_asset_identities') IS NULL")=='t'
    assert sql("SELECT md5(pg_get_functiondef('public.add_workspace_storage(uuid,bigint)'::regprocedure))")==before
    print('PASS late migration failure restores RPC and schema atomically')
    sql(candidate)
    sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,replacement_file_size_bytes,r2_key) VALUES('{v}','{ws}',10,4,'old-input');")
    # Snapshot 14 taken by an old cleanup before a new insert credits 20 bytes.
    stale=sql(f"SELECT storage_used_bytes FROM workspace_storage WHERE workspace_id='{ws}'")
    sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,r2_key) VALUES(gen_random_uuid(),'{ws}',20,'new-input');")
    sql(f"UPDATE workspace_storage SET storage_used_bytes={int(stale)-10} WHERE workspace_id='{ws}';")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='34'
    for delta in (10,10,-10):sql(c+f"SELECT add_workspace_storage('{ws}',{delta});")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='34'
    print('PASS delayed absolute RMW and repeated legacy RPC do not overwrite 34 authoritative bytes')
    def delayed(i):
        sql(f"UPDATE workspace_storage SET storage_used_bytes={i} WHERE workspace_id='{ws}';")
        sql(f"UPDATE video_versions SET is_deleted=true WHERE id='{v}';")
        sql(c+f"SELECT add_workspace_storage('{ws}',-14);")
    with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(delayed,range(8)))
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='20'
    sql(f"DELETE FROM video_versions WHERE id='{v}'; DELETE FROM video_versions WHERE id='{v}';")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='20'
    print('PASS eight overlapping soft deletes plus repeated hard delete debit 14 exactly once')
    rejected(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,r2_key) VALUES(gen_random_uuid(),'{ws}',10,'old-input');",'LEGACY_ASSET_IDENTITY_REUSE')
    assert sql('SELECT count(*) FROM video_versions')=='1'
    print('PASS removed legacy object identity cannot be rebound by delayed repeated INSERT')
    def writer(i):sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,r2_key) VALUES(gen_random_uuid(),'{ws}',3,'late-{i}');")
    with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(writer,range(8)))
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='44'
    print('PASS eight delayed old inserts credit exactly 24 bytes after expansion')
    rejected(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,r2_key) VALUES(gen_random_uuid(),'{ws}',1000,'too-large');",'Quota missing')
    assert sql("SELECT count(*) FROM video_legacy_asset_identities WHERE asset_key='too-large'")=='0'
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='44'
    print('PASS failed quota insert rolls back its asset binding and usage; limit remains 1000')
    for role in ('anon','authenticated'):
        rejected(f'SET ROLE {role}; SELECT * FROM video_legacy_asset_identities;','permission denied')
        rejected(f"SET ROLE {role}; SELECT add_workspace_storage('{ws}',1);",'permission denied')
    assert sql("SELECT has_table_privilege('service_role','public.video_legacy_asset_identities','SELECT') AND NOT has_table_privilege('service_role','public.video_legacy_asset_identities','INSERT')")=='t'
    print('PASS private identity evidence and existing service-only accounting ACLs')
    # Negative proof: identity ownership alone does not bind a newly returned UID to the current generation.
    sql("UPDATE video_versions SET cloudflare_stream_uid='new-generation' WHERE r2_key='new-input';")
    sql("UPDATE video_versions SET cloudflare_stream_uid='late-old-submission' WHERE r2_key='new-input';")
    assert sql("SELECT cloudflare_stream_uid FROM video_versions WHERE r2_key='new-input'")=='late-old-submission'
    print('PASS reproduced late unknown UID overwrite before the generation fence')
    upload_bootstrap='''CREATE TABLE projects(id uuid PRIMARY KEY,workspace_id uuid); CREATE TABLE tasks(id uuid PRIMARY KEY,project_id uuid);
      CREATE TABLE workspace_members(workspace_id uuid,user_id uuid,role text,is_active boolean);
      ALTER TABLE video_versions ADD project_id uuid,ADD task_id uuid,ADD version_number int,ADD file_path text,
      ADD file_name text,ADD uploaded_by uuid,ADD stream_status text,ADD stream_playback_url text,
      ADD thumbnail_path text,ADD duration_seconds numeric,ADD replacement_playback_url text,
      ADD replacement_status text,ADD replacement_file_name text,ADD replacement_thumbnail_path text,ADD replaced_at timestamptz;
      ALTER TABLE workspace_storage ADD base_storage_bytes bigint,ADD extra_storage_bytes bigint;
    '''
    sql(upload_bootstrap)
    sql(f"INSERT INTO projects VALUES('{v}','{ws}'); INSERT INTO workspace_members VALUES('{ws}','{ws}','edicao',true);")
    sql((here/'upload-expand.sql').read_text());sql((here/'generation-fence.sql').read_text())
    sql((here.parent/'02-total-quota.sql').read_text())
    operation='33333333-3333-4333-8333-333333333333';key=f'{ws}/{v}/project/{ws}/managed.mp4'
    sql(c+f"SELECT issue_video_operation('{operation}','{ws}','{v}',NULL,'{ws}','{key}','managed.mp4',7);")
    managed=sql(c+f"SELECT version_id FROM persist_video_operation('{operation}','{ws}','fixture');").splitlines()[-1]
    submission=sql(c+f"SELECT claim_video_submission('{operation}');").splitlines()[-1]
    sql(c+f"SELECT finish_video_submission('{operation}','{submission}','managed-stream');")
    for uid in ('late-old', 'late-old-repeated'):
        rejected(f"UPDATE video_versions SET cloudflare_stream_uid='{uid}' WHERE id='{managed}';",'MANAGED_VIDEO_GENERATION_FENCED')
    rejected(f"UPDATE video_versions SET r2_key='late-old-key',file_size_bytes=99 WHERE id='{managed}';",'MANAGED_VIDEO_GENERATION_FENCED')
    assert sql(f"SELECT cloudflare_stream_uid FROM video_versions WHERE id='{managed}'")=='managed-stream'
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='51'
    assert sql("SELECT count(*) FROM video_legacy_asset_identities WHERE asset_key IN ('late-old','late-old-repeated','late-old-key')")=='0'
    assert sql(c+f"SELECT version_id FROM persist_video_operation('{operation}','{ws}','fixture');").splitlines()[-1]==managed
    print('PASS real candidate RPC persists and confirms generation; old delayed/repeated UID and key writes fenced; 51 bytes counted once')
    replace='44444444-4444-4444-8444-444444444444';newkey=f'{ws}/{v}/project/{ws}/managed-replacement.mp4'
    sql(c+f"SELECT issue_video_operation('{replace}','{ws}','{v}',NULL,'{ws}','{newkey}','replacement.mp4',9,'{managed}'); SELECT persist_video_operation('{replace}','{ws}','fixture');")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='53'
    rejected(f"UPDATE video_versions SET r2_key='{key}',file_size_bytes=7,cloudflare_stream_uid='managed-stream' WHERE id='{managed}';",'MANAGED_VIDEO_GENERATION_FENCED')
    assert sql(f"SELECT r2_key FROM video_versions WHERE id='{managed}'")==newkey
    assert sql(f"SELECT count(*) FROM video_asset_outbox WHERE asset_key='{key}' AND state='held'")=='1'
    print('PASS same-version controlled replacement accepted; repeated late rollback rejected, old asset held, 53 bytes correct')
    reserved='55555555-5555-4555-8555-555555555555'
    reservekey=f'{ws}/{v}/project/{ws}/reserved.mp4'
    sql(c+f"SELECT issue_video_operation('{reserved}','{ws}','{v}',NULL,'{ws}','{reservekey}','reserved.mp4',947);")
    rejected(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,r2_key) VALUES(gen_random_uuid(),'{ws}',1,'late-over-reservation');",'Quota missing')
    sql(c+f"SELECT persist_video_operation('{reserved}','{ws}','fixture');")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='1000'
    print('PASS old insert cannot consume a reserved byte; reservation persists atomically at the 1000-byte total limit')
    # Fresh private database: exercise the FULL expansion transaction and its late failure.
    sql(upload_bootstrap,'expand_transaction')
    bundle=subprocess.check_output([os.sys.executable,here/'assemble_expand.py'],text=True)
    try:sql(bundle.rsplit('COMMIT;',1)[0]+'SELECT 1/0; COMMIT;','expand_transaction')
    except subprocess.CalledProcessError as e:assert 'division by zero' in e.stderr
    else:raise AssertionError('Expected atomic failure')
    assert sql("SELECT to_regclass('video_upload_operations') IS NULL AND to_regclass('video_legacy_asset_identities') IS NULL",'expand_transaction')=='t'
    assert sql("SELECT md5(pg_get_functiondef('public.add_workspace_storage(uuid,bigint)'::regprocedure))",'expand_transaction')==before
    sql(bundle,'expand_transaction')
    assert sql("SELECT count(*) FROM pg_trigger WHERE tgname='managed_video_generation'",'expand_transaction')=='1'
    print('PASS hash-checked complete expansion: late failure rolls back all four pieces, fresh application retains generation fence')
    sql(f"DELETE FROM workspaces WHERE id='{ws}';")
    assert int(sql('SELECT count(*) FROM video_legacy_asset_identities'))>=11
    print('PASS parent cascade retains immutable identity evidence')
finally:
    if started:run([pg/'pg_ctl','-D',tmp/'data','-m','immediate','-w','stop'],stdout=subprocess.DEVNULL)
    shutil.rmtree(tmp)