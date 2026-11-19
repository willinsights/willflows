"""Private Unix socket fixture only; no production env or TCP fallback."""
import os, subprocess, tempfile, shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]
hard=root.parent/'hardening'
previous=root.parent/'next'
pg=next(iter(Path('/nix/store').glob('*-postgresql-17.*/bin')),None)
if pg is None:
    system_versions=sorted(Path('/usr/lib/postgresql').glob('*/bin'),reverse=True)
    if not system_versions: raise RuntimeError('No PostgreSQL binaries: install a local disposable PostgreSQL server')
    pg=system_versions[0]
tmp=Path(tempfile.mkdtemp(prefix='fase-a-hardening-'));os.chmod(tmp,0o777)
env={k:v for k,v in os.environ.items() if not k.startswith(('PG','SUPABASE','DATABASE','LOVABLE'))}
prefix=['setpriv','--reuid=1000','--regid=1000','--clear-groups'] if os.geteuid()==0 else []
def cmd(args,**kw):return subprocess.run(prefix+[str(x) for x in args],env=kw.pop('env',env),check=True,**kw)
def sql(s, database="postgres"):
    try:
        result=cmd([pg/'psql','-X','-h',tmp,'-p','55448','-U','fixture','-d',database,'-At','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as exc:
        print('DISPOSABLE_FIXTURE_SQL_ERROR:',exc.stderr[-2200:] if exc.stderr else type(exc).__name__,flush=True)
        raise
def reject(s):
    try:sql(s)
    except subprocess.CalledProcessError:return
    raise AssertionError('Unexpected acceptance')
def assert_writer_blocks(script, table):
    # Hold the same table lock acquired by an ordinary INSERT/UPDATE.
    args = [pg/'psql', '-XqAt', '-h', tmp, '-p', '55448', '-U', 'fixture', '-d', 'postgres']
    with subprocess.Popen(prefix + list(map(str, args)), env=env, stdin=subprocess.PIPE,
                          stdout=subprocess.PIPE, text=True) as writer:
        try:
            writer.stdin.write(f"BEGIN; LOCK TABLE {table} IN ROW EXCLUSIVE MODE; SELECT 'ready';\n")
            writer.stdin.flush()
            assert writer.stdout.readline().strip() == 'ready'
            try:
                sql("SET statement_timeout='3s';" + (root/script).read_text())
            except subprocess.CalledProcessError as error:
                assert 'could not obtain lock' in error.stderr, error.stderr
            else:
                raise AssertionError(f'{script} ran during an active writer on {table}')
        finally:
            writer.stdin.close()
            writer.wait(timeout=5)

def parallel(fn,n=8):
    with ThreadPoolExecutor(max_workers=n) as pool:return list(pool.map(fn,range(n)))
c="SET request.jwt.claims='{\"role\":\"service_role\"}';"
ws='11111111-1111-4111-8111-111111111111';v='22222222-2222-4222-8222-222222222222';qid='33333333-3333-4333-8333-333333333333'
started=False
try:
    cmd([pg/'initdb','-D',tmp/'data','-A','trust','-U','fixture','--no-locale'],stdout=subprocess.DEVNULL)
    cmd([pg/'pg_ctl','-D',tmp/'data','-l',tmp/'log','-o',f"-k {tmp} -p 55448 -c listen_addresses=''",'-w','start'],stdout=subprocess.DEVNULL);started=True
    sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE TABLE video_versions(id uuid PRIMARY KEY,workspace_id uuid,file_size_bytes bigint,replacement_file_size_bytes bigint,is_deleted boolean,deleted_at timestamptz); CREATE TABLE workspace_storage(workspace_id uuid PRIMARY KEY,storage_used_bytes bigint,last_calculated_at timestamptz,storage_limit_bytes bigint,extra_storage_bytes bigint DEFAULT 0); CREATE TABLE push_notification_queue(id uuid PRIMARY KEY,status text DEFAULT \'pending\',attempts int DEFAULT 0,processed_at timestamptz); CREATE TABLE subscription_discrepancies(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),stripe_subscription_id text,stripe_status text,db_status text,discrepancy_type text,details jsonb,resolved_at timestamptz);')
    sql('CREATE TABLE workspaces(id uuid PRIMARY KEY,stripe_subscription_id text); CREATE TABLE user_subscriptions(user_id uuid,stripe_subscription_id text); CREATE TABLE projects(id uuid PRIMARY KEY,workspace_id uuid REFERENCES workspaces ON DELETE CASCADE); CREATE TABLE tasks(id uuid PRIMARY KEY,project_id uuid REFERENCES projects ON DELETE CASCADE); ALTER TABLE workspace_storage ADD FOREIGN KEY(workspace_id) REFERENCES workspaces ON DELETE CASCADE; ALTER TABLE video_versions ADD FOREIGN KEY(workspace_id) REFERENCES workspaces ON DELETE CASCADE, ADD project_id uuid REFERENCES projects ON DELETE CASCADE, ADD task_id uuid REFERENCES tasks ON DELETE CASCADE; ALTER TABLE push_notification_queue ADD created_at timestamptz DEFAULT now(); ALTER TABLE subscription_discrepancies ADD workspace_id uuid REFERENCES workspaces ON DELETE SET NULL, ADD user_id uuid, ADD stripe_customer_id text;')
    sql(f"INSERT INTO workspaces VALUES('{ws}',NULL);")
    sql('ALTER TABLE workspace_storage ADD base_storage_bytes bigint DEFAULT 10000; ALTER TABLE video_versions ADD r2_key text,ADD replacement_r2_key text,ADD cloudflare_stream_uid text,ADD replacement_stream_uid text,ADD version_number int,ADD file_path text,ADD file_name text,ADD uploaded_by uuid,ADD stream_status text,ADD stream_playback_url text; ALTER TABLE video_versions ADD thumbnail_path text,ADD duration_seconds numeric,ADD replacement_playback_url text,ADD replacement_status text,ADD replacement_file_name text,ADD replacement_thumbnail_path text,ADD replaced_at timestamptz; CREATE TABLE workspace_members(workspace_id uuid,user_id uuid,role text,is_active boolean);')
    sql("""
        CREATE TABLE video_approval_tokens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token text UNIQUE NOT NULL,
            workspace_id uuid REFERENCES workspaces ON DELETE CASCADE, project_id uuid REFERENCES projects ON DELETE CASCADE,
            task_id uuid REFERENCES tasks ON DELETE CASCADE, is_active boolean NOT NULL DEFAULT true);
        CREATE TABLE video_comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_version_id uuid NOT NULL REFERENCES video_versions ON DELETE CASCADE,
            workspace_id uuid REFERENCES workspaces ON DELETE CASCADE, parent_id uuid REFERENCES video_comments ON DELETE CASCADE,
            timestamp_seconds numeric NOT NULL DEFAULT 0, body text NOT NULL, created_at timestamptz DEFAULT now());
        CREATE TABLE video_approvals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_version_id uuid NOT NULL REFERENCES video_versions ON DELETE CASCADE,
            workspace_id uuid REFERENCES workspaces ON DELETE CASCADE, approved_at timestamptz NOT NULL DEFAULT now(), notes text);
    """)
    # Independent Stripe package FIRST: no phase-A schema exists.
    sql((previous/'stripe-minimal/candidate.sql').read_text())
    assert sql("SELECT to_regclass('push_delivery_claims') IS NULL AND to_regclass('weekly_summary_deliveries') IS NULL")=='t'
    values=parallel(lambda _:sql(c+"SELECT record_stripe_discrepancy('sub_fixture','past_due','active');").splitlines()[-1])
    assert values.count('t')==1
    assert sql('SELECT count(*) FROM subscription_discrepancies')=='1'
    sql((previous/'stripe-minimal/rollback.sql').read_text())
    assert sql('SELECT count(*) FROM subscription_discrepancies')=='1'
    print('PASS independent Stripe SQL race and empty-ledger rollback retain discrepancies without phase-A dependencies')
    sql((hard.parent/'candidate.sql').read_text())
    sql((hard/'rollback-sources/quota-trigger.sql').read_text())
    sql((root/'00-accounting.sql').read_text())
    sql((root/'01-upload.sql').read_text())
    assert_writer_blocks('rollback-all-empty.sql', 'video_asset_outbox')
    assert_writer_blocks('rollback-upload.sql', 'video_upload_operations')
    assert_writer_blocks('rollback-accounting-empty.sql', 'video_versions')
    # Atomic rollback before first use restores the legacy trigger, not just tables.
    sql((root/'rollback-all-empty.sql').read_text())
    assert sql("SELECT to_regclass('video_upload_operations') IS NULL")=='t'
    assert sql("SELECT to_regclass('video_asset_outbox') IS NULL")=='t'
    assert sql("SELECT to_regprocedure('public.expire_video_issued_operations(integer)') IS NULL")=='t'
    assert sql("SELECT count(*) FROM pg_trigger WHERE tgname IN ('guard_storage_counter','video_accounting_serial','storage_accounting_serial')")=='0'
    assert sql("SELECT count(*) FROM pg_trigger WHERE tgname='trg_sync_storage_video_versions'")=='1'
    assert_writer_blocks('00-accounting.sql', 'workspace_storage')
    drift_ws='bbbbbbbb-1111-4111-8111-111111111111'
    sql(f"INSERT INTO workspaces VALUES('{drift_ws}',NULL); INSERT INTO workspace_storage(workspace_id,storage_used_bytes,storage_limit_bytes) VALUES('{drift_ws}',5,100);")
    reject((root/'00-accounting.sql').read_text())
    assert sql("SELECT count(*) FROM pg_trigger WHERE tgname='guard_storage_counter'")=='0'
    sql(f"DELETE FROM workspaces WHERE id='{drift_ws}';")
    print('PASS quota migration rejects an unreconciled legacy counter before creating triggers')
    # A version without a counter is invisible to an aggregate led by storage.
    sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,is_deleted) VALUES(gen_random_uuid(),'{ws}',0,true);")
    reject((root/'00-accounting.sql').read_text())
    sql(f"DELETE FROM video_versions WHERE workspace_id='{ws}';")
    bundle = subprocess.check_output([os.sys.executable, root/'assemble_candidate.py'], text=True)
    # A failure at the end of the third stage must undo both preceding stages.
    before_commit, final_commit = bundle.rsplit('COMMIT;', 1)
    reject(before_commit + 'SELECT 1/0; COMMIT;' + final_commit)
    assert sql("SELECT to_regclass('video_upload_operations') IS NULL") == 't'
    assert sql("SELECT count(*) FROM pg_trigger WHERE tgname='guard_storage_counter'") == '0'
    sql(bundle)
    print('PASS atomic three-stage candidate, late failure rolls back schema and triggers')
    # Prove the backup/restore procedure only against a disposable synthetic DB.
    # This is NOT evidence of a live Lovable/PostgreSQL backup being restorable.
    dump=tmp/'synthetic-schema.dump'
    cmd([pg/'pg_dump','-h',tmp,'-p','55448','-U','fixture','-d','postgres','-Fc','-f',dump],stdout=subprocess.DEVNULL)
    assert dump.stat().st_size>0
    cmd([pg/'createdb','-h',tmp,'-p','55448','-U','fixture','restored_fixture'],stdout=subprocess.DEVNULL)
    cmd([pg/'pg_restore','-h',tmp,'-p','55448','-U','fixture','-d','restored_fixture','--exit-on-error',dump],stdout=subprocess.DEVNULL)
    restored=cmd([pg/'psql','-X','-h',tmp,'-p','55448','-U','fixture','-d','restored_fixture','-At','-c',
      "SELECT to_regclass('public.video_upload_operations') IS NOT NULL AND to_regclass('public.video_asset_outbox') IS NOT NULL;"],
      text=True,capture_output=True).stdout.strip()
    assert restored=='t'
    print('PASS synthetic pg_dump/pg_restore to separate fixture database; does not validate real backup')

    print('PASS atomic empty-history rollback restores trigger and permits fresh candidate application')
    sql(f"INSERT INTO workspace_storage(workspace_id,storage_used_bytes,storage_limit_bytes,base_storage_bytes,extra_storage_bytes) VALUES('{ws}',0,12000,10000,2000); INSERT INTO projects VALUES('{v}','{ws}'); INSERT INTO workspace_members VALUES('{ws}','{qid}','edicao',true);")
    op='77777777-7777-4777-8777-777777777777'
    key=f"{ws}/{v}/project/{qid}/fiction.mp4"
    issue=c+f"SELECT version_id FROM issue_video_operation('{op}','{ws}','{v}',NULL,'{qid}','{key}','Corte – ação 🎬.mp4',100);"
    ids=parallel(lambda _:sql(issue).splitlines()[-1]);assert len(set(ids))==1
    persisted=c+f"SELECT version_id FROM persist_video_operation('{op}','{qid}','fixture');"
    ids=parallel(lambda _:sql(persisted).splitlines()[-1]);assert len(set(ids))==1
    vid=ids[0]
    assert sql('SELECT count(*) FROM video_versions')=='1'
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='100'
    print('PASS eight Unicode issuance/persistence retries have one version and one quota credit')
    # Different operation IDs still allocate a unique project sequence atomically.
    def independent(i):
        identity=f'aaaaaaaa-aaaa-4aaa-8aaa-{i:012d}'
        return sql(c+f"SELECT issue_video_operation('{identity}','{ws}','{v}',NULL,'{qid}','{key}_{i}','new.mp4',10); SELECT persist_video_operation('{identity}','{qid}','fixture');")
    parallel(independent)
    assert sql('SELECT count(DISTINCT version_number) FROM video_versions')=='9'
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='180'
    sql(f"DELETE FROM video_versions WHERE id<>'{vid}';")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='100'
    print('PASS distinct simultaneous uploads allocate nine distinct sequences; delete accounting atomic')
    reject(c+f"SELECT issue_video_operation('{op}','{ws}','{v}',NULL,'{qid}','{key}','different.mp4',100);")
    claims=parallel(lambda _:sql(c+f"SELECT claim_video_submission('{op}');").splitlines()[-1]);winner=[x for x in claims if x!='SET'];assert len(winner)==1
    sql(c+f"SELECT finish_video_submission('{op}','{winner[0]}',NULL);")
    assert sql(c+f"SELECT claim_video_submission('{op}');").splitlines()[-1]=='SET'
    print('PASS mismatched operation refused; eight submission claims one owner; uncertain never replayed')
    sql(f"""
        INSERT INTO video_approval_tokens(token,workspace_id,project_id) VALUES('fixture-link','{ws}','{v}');
        INSERT INTO video_comments(video_version_id,workspace_id,timestamp_seconds,body) VALUES('{vid}','{ws}',2.5,'Rever o corte');
        INSERT INTO video_comments(video_version_id,workspace_id,parent_id,timestamp_seconds,body)
            SELECT video_version_id,workspace_id,id,2.5,'Feito' FROM video_comments WHERE video_version_id='{vid}';
        INSERT INTO video_approvals(video_version_id,workspace_id,notes) VALUES('{vid}','{ws}','Aprovado');
    """)
    review_snapshot = """
        SELECT jsonb_build_object('token', to_jsonb(t), 'id', v.id, 'number', v.version_number,
          'comments', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM video_comments c WHERE c.video_version_id=v.id),
          'approval', (SELECT to_jsonb(a) FROM video_approvals a WHERE a.video_version_id=v.id))
        FROM video_approval_tokens t JOIN video_versions v ON v.project_id=t.project_id AND v.workspace_id=t.workspace_id
        WHERE t.token='fixture-link' AND t.is_active;
    """
    prior_review = sql(review_snapshot)
    assert all(value in prior_review for value in ('Rever o corte','Feito','Aprovado','fixture-link'))
    new='88888888-8888-4888-8888-888888888888'
    newkey=f"{ws}/{v}/project/{qid}/replacement.mp4"
    sql(c+f"SELECT issue_video_operation('{new}','{ws}','{v}',NULL,'{qid}','{newkey}','replacement.mp4',200,'{vid}');")
    sql(c+f"SELECT persist_video_operation('{new}','{qid}','fixture');")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='200'
    assert sql(f"SELECT id='{vid}' AND version_number=1 FROM video_versions")=='t'
    assert sql(f"SELECT count(*) FROM video_asset_outbox WHERE asset_key='{key}' AND state='held'")=='1'
    reject(c+f"SELECT persist_video_operation('{op}','{qid}','fixture');")
    assert sql(review_snapshot) == prior_review
    print('PASS same link preserves version, comment, reply, approval and their exact timestamps; old reference held; superseded retry blocked')
    token=sql(c+f"SELECT claim_video_submission('{new}');").splitlines()[-1]
    reject(f"BEGIN; DELETE FROM video_versions; SELECT 1/0; COMMIT;")
    assert sql('SELECT count(*) FROM video_versions')=='1'
    sql('DELETE FROM video_versions;')
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='0'
    sql(c+f"SELECT finish_video_submission('{new}','{token}','stream-late');")
    assert sql("SELECT count(*) FROM video_asset_outbox WHERE asset_key='stream-late' AND state='held'")=='1'
    assert sql('SELECT count(*) FROM video_upload_operations')=='10'
    print('PASS hard delete/rollback retains assets and durable history; late provider result held not lost')
    expired='99999999-9999-4999-8999-999999999999'
    sql(c+f"SELECT issue_video_operation('{expired}','{ws}','{v}',NULL,'{qid}','{key}_expired','expire.mp4',10);")
    sql(f"UPDATE video_upload_operations SET expires_at=now()-interval '1 second' WHERE id='{expired}';")
    reject(c+f"SELECT persist_video_operation('{expired}','{qid}','fixture');")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='0'
    print('PASS expiry refuses mutation and retains quota')
    assert sql(c+"SELECT expire_video_issued_operations(100);").splitlines()[-1]=='1'
    assert sql(c+"SELECT expire_video_issued_operations(100);").splitlines()[-1]=='0'
    assert sql(f"SELECT state FROM video_upload_operations WHERE id='{expired}'")=='aborted'
    assert sql(f"SELECT count(*) FROM video_asset_outbox WHERE asset_key='{key}_expired' AND state='held'")=='1'
    print('PASS expired issued reference is preserved exactly once, without physical deletion')
    # Historical project-only three-part object keys can legitimately contain
    # "undefined" or "null" from older JavaScript tabs.
    for ix,part in enumerate(['undefined','null',v]):
        ident=f'eeeeeeee-eeee-4eee-8eee-{ix:012d}'
        oldkey=f'{ws}/{part}/historical_{ix}.mp4'
        sql(c+f"SELECT issue_video_operation('{ident}','{ws}','{v}',NULL,'{qid}','{oldkey}','old.mp4',1);")
        assert sql(c+f"SELECT state FROM video_upload_operations WHERE id='{ident}';").splitlines()[-1]=='issued'
        sql(c+f"SELECT abort_video_operation('{ident}','{qid}');")
        assert sql(f"SELECT count(*) FROM video_asset_outbox WHERE asset_key='{oldkey}' AND state='held'")=='1'
    print('PASS legacy 3-part project keys undefined/null/project are reserved then aborted safely')
    assert sql("SELECT effective_video_quota(12000,10000,2000,'total')")=='12000'
    assert sql("SELECT effective_video_quota(12000,10000,2000,'base_extra')")=='12000'
    assert sql("SELECT effective_video_quota(12000,NULL,NULL,'total')")=='12000'
    reject("SELECT effective_video_quota(12000,NULL,2000,'base_extra')")
    reject("SELECT effective_video_quota(12000,10000,-1,'total')")
    sql(f"INSERT INTO video_versions(id,workspace_id,project_id,file_size_bytes,is_deleted) VALUES(gen_random_uuid(),'{ws}','{v}',12000,false);")
    reject(f"INSERT INTO video_versions(id,workspace_id,project_id,file_size_bytes,is_deleted) VALUES(gen_random_uuid(),'{ws}','{v}',1,false);")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='12000'
    print('PASS total/base-extra agree at approved fixture entitlement; 12000 limit not double-counted to 14000')
    reject((previous/'quota-reconciliation.sql').read_text())
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='12000'
    print('PASS reconciliation template refuses unspecified baseline; no trigger bypass')
    reject((root/'rollback-upload.sql').read_text())
    for role in ['anon','authenticated']:
        reject(f"SET ROLE {role}; SELECT * FROM video_asset_outbox;")
        reject(f"SET ROLE {role};"+persisted)
    reject(f"SELECT claim_video_submission('{new}');")
    # Second tenant cannot use another tenant's project/operation/replacement.
    other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    sql(f"INSERT INTO workspaces VALUES('{other}',NULL); INSERT INTO workspace_storage(workspace_id,storage_used_bytes,storage_limit_bytes) VALUES('{other}',0,50);")
    reject(c+f"SELECT issue_video_operation(gen_random_uuid(),'{other}','{v}',NULL,'{qid}','{key}','cross.mp4',1);")
    reject(c+f"SELECT abort_video_operation('{op}','{other}');")
    assert sql(f"SELECT storage_used_bytes FROM workspace_storage WHERE workspace_id='{other}'")=='0'
    print('PASS tenant mismatch cannot mutate operations/quota')
    # Remove fixture full version, then reserve remaining quota concurrently.
    sql(f"DELETE FROM video_versions WHERE workspace_id='{ws}';")
    def reserve(i):
        identity=f'cccccccc-cccc-4ccc-8ccc-{i:012d}'
        try:return sql(c+f"SELECT issue_video_operation('{identity}','{ws}','{v}',NULL,'{qid}','{key}_reserve_{i}','reserve.mp4',4000);")
        except subprocess.CalledProcessError:return None
    accepted=parallel(reserve,12)
    assert sum(x is not None for x in accepted)==3
    assert sql(f"SELECT sum(reserved_bytes) FROM video_upload_operations WHERE workspace_id='{ws}' AND state='issued' AND expires_at>now()")=='12000'
    reject(f"INSERT INTO video_versions(id,workspace_id,project_id,file_size_bytes,is_deleted) VALUES(gen_random_uuid(),'{ws}','{v}',1,false);")
    oid=sql("SELECT id FROM video_upload_operations WHERE object_key LIKE '%_reserve_%' LIMIT 1")
    sql(c+f"SELECT abort_video_operation('{oid}','{qid}');")
    reject(c+f"SELECT persist_video_operation('{oid}','{qid}','fixture');")
    assert sql(f"SELECT sum(reserved_bytes) FROM video_upload_operations WHERE workspace_id='{ws}' AND state='issued' AND expires_at>now()")=='8000'
    print('PASS twelve competing reservations accept three at total limit; abort frees only reservation and holds partial asset')
    # Recovery never creates a second copy; ownership is permanent.
    owned=sql("SELECT id FROM video_upload_operations WHERE object_key LIKE '%_reserve_%' AND state='issued' LIMIT 1")
    sql(c+f"SELECT persist_video_operation('{owned}','{qid}','fixture');")
    tk=sql(c+f"SELECT claim_video_submission('{owned}');").splitlines()[-1]
    sql(c+f"SELECT finish_video_submission('{owned}','{tk}',NULL);")
    # Restore a used ledger with an uncertain submission, then recover only the
    # restored operation. No provider calls and no rewriting the original ledger.
    connection = ['-h',tmp,'-p','55448','-U','fixture']
    used_dump = tmp/'used-ledger.dump'
    cmd([pg/'pg_dump',*connection,'-Fc','-d','postgres','-f',used_dump])
    cmd([pg/'createdb',*connection,'recovery_fixture'])
    cmd([pg/'pg_restore',*connection,'-d','recovery_fixture','--exit-on-error',used_dump])
    for table, order in [('video_upload_operations','id'), ('video_versions','id'),
                         ('workspace_storage','workspace_id'),
                         ('video_asset_outbox','workspace_id,provider,asset_key')]:
        rows = f"SELECT row_to_json(t)::text FROM public.{table} t ORDER BY {order}"
        original = sql(rows)
        assert original and sql(rows,'recovery_fixture') == original, table
    sql(c+f"SELECT recover_video_submission('{owned}','{qid}','recovered-fixture');", 'recovery_fixture')
    assert sql(f"SELECT state FROM video_upload_operations WHERE id='{owned}'",'recovery_fixture') == 'processing'
    assert sql(f"SELECT state FROM video_upload_operations WHERE id='{owned}'") == 'uncertain'
    assert sql(c+f"SELECT claim_video_submission('{owned}');",'recovery_fixture').splitlines()[-1]=='SET'
    print('PASS populated isolated restore preserves ledger, held assets, quota and recovers without resubmission')
    sql(c+f"SELECT recover_video_submission('{owned}','{qid}','recovered-fixture');")
    assert sql(c+f"SELECT claim_video_submission('{owned}');").splitlines()[-1]=='SET'
    reject(c+f"SELECT abort_video_operation('{owned}','{qid}');")
    assert sql(c+f"SELECT state FROM recover_video_submission('{owned}','{qid}',NULL);").splitlines()[-1]=='processing'
    reject(c+f"SELECT recover_video_submission('{owned}','{qid}','different-fixture-uid');")
    sql(f"UPDATE video_versions SET is_deleted=true WHERE id=(SELECT version_id FROM video_upload_operations WHERE id='{owned}');")
    reject(c+f"SELECT recover_video_submission('{owned}','{qid}',NULL);")
    print('PASS uncertain recovery attaches existing provider identity without reclaim; persisted abort rejected')
    sql(f"DELETE FROM workspaces WHERE id='{ws}';")
    assert int(sql('SELECT count(*) FROM video_upload_operations'))>=11
    assert int(sql('SELECT count(*) FROM video_asset_outbox'))>=11
    print('PASS ACL/RLS fail closed, populated rollback refused, parent cascade preserves outbox and operations')
finally:
    if started:cmd([pg/'pg_ctl','-D',tmp/'data','-m','immediate','-w','stop'],stdout=subprocess.DEVNULL)
    shutil.rmtree(tmp)
