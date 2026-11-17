"""Private Unix socket fixture only; no production env or TCP fallback."""
import os, subprocess, tempfile, shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]
pg=next(Path('/nix/store').glob('*-postgresql-17.*/bin'))
tmp=Path(tempfile.mkdtemp(prefix='fase-a-hardening-'));os.chmod(tmp,0o777)
env={k:v for k,v in os.environ.items() if not k.startswith(('PG','SUPABASE','DATABASE','LOVABLE'))}
prefix=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
def cmd(args,**kw):return subprocess.run(prefix+[str(x) for x in args],env=kw.pop('env',env),check=True,**kw)
def sql(s):return cmd([pg/'psql','-X','-h',tmp,'-p','55448','-U','fixture','-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True).stdout.strip()
def reject(s):
    try:sql(s)
    except subprocess.CalledProcessError:return
    raise AssertionError('Unexpected acceptance')
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
    sql((root.parent/'candidate.sql').read_text())
    sql((root/'rollback-sources/quota-trigger.sql').read_text())
    sql((root/'candidate.sql').read_text())
    sql(f"INSERT INTO workspace_storage(workspace_id,storage_used_bytes,storage_limit_bytes) VALUES('{ws}',0,10000);")
    sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,replacement_file_size_bytes,is_deleted,deleted_at) VALUES('{v}','{ws}',200,50,false,NULL);")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='250'; print('PASS insert counts primary+replacement once')
    sql(f"UPDATE video_versions SET replacement_file_size_bytes=100 WHERE id='{v}';")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='300'; print('PASS replacement size-only update counts delta')
    deletion=c+f"SELECT mark_cleanup_videos_deleted('{ws}',ARRAY['{v}'::uuid]);"
    amounts=parallel(lambda _:int(sql(deletion).splitlines()[-1]));assert sum(amounts)==300
    sql(f"DELETE FROM video_versions WHERE id='{v}';")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='0';print('PASS 8 cleanup claims and hard delete never double debit')
    sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,replacement_file_size_bytes,is_deleted) VALUES('{v}','{ws}',200,50,NULL);")
    parallel(lambda i:sql(c+f"UPDATE video_versions SET file_size_bytes=file_size_bytes+1 WHERE id='{v}';") if i%2 else sql(deletion))
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='0';print('PASS concurrent replacement/cleanup with unified statement lock, null deletion legacy covered')
    reject(f"UPDATE workspace_storage SET storage_used_bytes=123 WHERE workspace_id='{ws}';")
    reject(f"UPDATE video_versions SET file_size_bytes=-1 WHERE id='{v}';")
    reject(f"UPDATE video_versions SET workspace_id='99999999-9999-4999-8999-999999999999' WHERE id='{v}';")
    print('PASS unsafe legacy counter writes/negative sizes/cross-workspace moves refused')
    sql(f"DELETE FROM video_versions WHERE id='{v}';")
    reject(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,replacement_file_size_bytes,is_deleted) VALUES('{v}','{ws}',11000,0,false);")
    assert sql('SELECT count(*) FROM video_versions')=='0';print('PASS over-limit insert fully rolls back')
    sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,replacement_file_size_bytes,is_deleted) VALUES('{v}','{ws}',100,0,false);")
    reject(f"BEGIN; UPDATE video_versions SET file_size_bytes=200 WHERE id='{v}'; SELECT 1/0; COMMIT;")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='100';print('PASS failed writer rolls back quota and row together')
    sql(f"INSERT INTO push_notification_queue(id) VALUES('{qid}');")
    claim=c+f"SELECT claim_push_delivery('{qid}');"
    tokens=parallel(lambda _:sql(claim).splitlines()[-1] if sql('SELECT 1') else '')
    winners=[x for x in tokens if x!='SET'];assert len(winners)==1;token=winners[0];print('PASS 8 push claims have one token')
    reject(c+f"SELECT finish_push_delivery('{qid}','99999999-9999-4999-8999-999999999999','sent');")
    sql(c+f"SELECT finish_push_delivery('{qid}','{token}','retry');")
    assert sql(claim).splitlines()[-1]=='SET'
    sql("UPDATE push_delivery_claims SET retry_at=now()-interval '1 second';") # fixture clock only
    token=sql(claim).splitlines()[-1]
    sql(c+f"SELECT finish_push_delivery('{qid}','{token}','uncertain');")
    assert sql(claim).splitlines()[-1]=='SET';print('PASS explicit retry delayed; uncertain never reclaimed; stale token blocked')
    for handler in ['check-deadlines','cleanup-expired-videos','check-payment-alerts','send-weekly-summary','stripe-reconcile']:
        tokens=parallel(lambda _:sql(c+f"SELECT claim_safe_cron('{handler}');").splitlines()[-1]);winners=[x for x in tokens if x!='SET'];assert len(winners)==1
        sql(c+f"SELECT finish_safe_cron('{handler}','{winners[0]}',true);")
        assert sql(c+f"SELECT claim_safe_cron('{handler}');").splitlines()[-1]=='SET'
    print('PASS all five crons exclude concurrent owners; uncertain is not TTL-reclaimed')
    observed=parallel(lambda _:sql(c+"SELECT record_stripe_discrepancy('sub_fixture','past_due','active');").splitlines()[-1])
    assert observed.count('t')==1;assert sql('SELECT count(*) FROM subscription_discrepancies')=='1'
    sql("UPDATE subscription_discrepancies SET resolved_at=now();")
    assert sql(c+"SELECT record_stripe_discrepancy('sub_fixture','past_due','active');").splitlines()[-1]=='t'
    reject("INSERT INTO subscription_discrepancies(stripe_subscription_id) VALUES(NULL);")
    print('PASS Stripe 8 observations insert once; new post-resolution event retains history; null refused')
    for role in ['anon','authenticated']:
        reject(f"SET ROLE {role};"+claim)
        reject(f"SET ROLE {role}; SELECT * FROM safe_cron_runs;")
    reject(f"SELECT claim_push_delivery('{qid}');")
    print('PASS effective ACL/RLS and missing claims fail closed')
    q2='66666666-6666-4666-8666-666666666666'
    sql(f"INSERT INTO push_notification_queue(id,attempts) VALUES('{q2}',2);")
    token=sql(c+f"SELECT claim_push_delivery('{q2}');").splitlines()[-1]
    sql(c+f"SELECT finish_push_delivery('{q2}','{token}','retry');")
    assert sql(f"SELECT status||':'||attempts FROM push_notification_queue WHERE id='{q2}';")=='failed:3'
    print('PASS legacy attempt count preserved; third explicit rejection terminal')
    sql('CREATE TABLE fixture_counter_baseline AS SELECT * FROM workspace_storage;')
    reject(f"BEGIN; UPDATE video_versions SET file_size_bytes=9000 WHERE id='{v}'; UPDATE video_versions SET file_size_bytes=11000 WHERE id='{v}'; COMMIT;")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='100'
    print('PASS multi-write failure transaction keeps baseline quota')
    assert sql(f"SELECT processed_at IS NOT NULL FROM push_notification_queue WHERE id='{q2}'")=='t'
    print('PASS retry exhaustion has terminal timestamp')
    sql("INSERT INTO push_notification_queue(id,created_at) SELECT gen_random_uuid(),now()-interval '1 year' FROM generate_series(1,50); INSERT INTO push_delivery_claims(queue_id,state) SELECT id,'uncertain' FROM push_notification_queue WHERE created_at<now()-interval '1 day';")
    ready='77777777-7777-4777-8777-777777777777'
    sql(f"INSERT INTO push_notification_queue(id) VALUES('{ready}');")
    assert ready in sql(c+'SELECT id FROM list_ready_push(50);')
    reject('SELECT * FROM list_ready_push(50);')
    print('PASS 50 oldest uncertain claims cannot starve eligible row; read RPC fails closed')
    sql(f"UPDATE workspaces SET stripe_subscription_id='sub_enriched' WHERE id='{ws}'; INSERT INTO user_subscriptions VALUES('{qid}','sub_enriched');")
    calls=parallel(lambda _:sql(c+f"SELECT record_stripe_discrepancy('sub_enriched','past_due','active','{qid}','cus_fixture','{{\"detail\":\"fixture\"}}');").splitlines()[-1])
    assert calls.count('t')==1
    assert sql(f"SELECT workspace_id='{ws}' AND user_id='{qid}' AND stripe_customer_id='cus_fixture' AND details->>'detail'='fixture' FROM subscription_discrepancies WHERE stripe_subscription_id='sub_enriched'")=='t'
    reject(c+f"SELECT record_stripe_discrepancy('sub_enriched','past_due','active','{ready}');")
    print('PASS 8 Stripe enriched observations preserve FK/user/customer/details; wrong association refused')
    parent='88888888-8888-4888-8888-888888888888'
    sql(f"INSERT INTO projects VALUES('{parent}','{ws}'); INSERT INTO tasks VALUES('{parent}','{parent}'); UPDATE video_versions SET project_id='{parent}',task_id='{parent}' WHERE id='{v}'; DELETE FROM tasks WHERE id='{parent}';")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='0'
    print('PASS task cascade debits once and keeps live workspace quota')
    sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,is_deleted,project_id) VALUES('{v}','{ws}',100,false,'{parent}');")
    reject(f"BEGIN; DELETE FROM projects WHERE id='{parent}'; SELECT 1/0; COMMIT;")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='100'
    sql(f"DELETE FROM projects WHERE id='{parent}';")
    assert sql('SELECT storage_used_bytes FROM workspace_storage')=='0'
    print('PASS project cascade and rollback preserve row/counter atomicity')
    sql(f"INSERT INTO video_versions(id,workspace_id,file_size_bytes,is_deleted) VALUES('{v}','{ws}',100,false);")
    reject(f"BEGIN; DELETE FROM workspace_storage WHERE workspace_id='{ws}'; DELETE FROM video_versions WHERE id='{v}'; COMMIT;")
    print('PASS missing quota during live workspace hard delete is refused')
    sql(f"DELETE FROM workspaces WHERE id='{ws}';")
    assert sql('SELECT count(*) FROM video_versions')=='0'
    assert sql("SELECT workspace_id IS NULL FROM subscription_discrepancies WHERE stripe_subscription_id='sub_enriched'")=='t'
    print('PASS workspace cascade tolerates quota cascade order; Stripe FK SET NULL retained')
    sql((root/'tests/producer.sql').read_text())
    sql((root/'push-producer.sql').read_text())
    sql('CREATE TRIGGER on_new_message_notify AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_chat_message();')
    sql(f"INSERT INTO profiles VALUES('{qid}','Fixture','fixture@example.invalid'); INSERT INTO conversations VALUES('{parent}','Fixture'); INSERT INTO conversation_members VALUES('{parent}','{qid}',false,true),('{parent}','{ready}',false,true),('{parent}','{v}',true,true),('{parent}','{ws}',false,false);")
    message='99999999-9999-4999-8999-999999999999'
    sql(f"INSERT INTO messages VALUES('{message}','{parent}','{qid}','Fixture','text',false);")
    assert sql(f"SELECT count(*) FROM push_notification_queue WHERE data->>'message_id'='{message}'")=='1'
    assert sql(f"SELECT user_id='{ready}' AND data->>'entityId'='{parent}' FROM push_notification_queue WHERE data->>'message_id'='{message}'")=='t'
    sql(f"INSERT INTO messages VALUES(gen_random_uuid(),'{parent}','{qid}','Fixture','system',false),(gen_random_uuid(),'{parent}','{qid}','Fixture','text',true);")
    assert sql("SELECT count(*) FROM push_notification_queue WHERE data->>'type'='chat_message'")=='1'
    # Simulate duplicate producer dispatch for the SAME persisted message.
    sql('CREATE TRIGGER fixture_second_dispatch AFTER UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION notify_chat_message();')
    parallel(lambda _:sql(f"UPDATE messages SET body=body WHERE id='{message}';"))
    assert sql(f"SELECT count(*) FROM push_notification_queue WHERE data->>'message_id'='{message}'")=='1'
    sql(f"INSERT INTO messages VALUES(gen_random_uuid(),'{parent}','{qid}','Fixture','text',false);")
    assert sql("SELECT count(*) FROM push_notification_queue WHERE data->>'type'='chat_message'")=='2'
    print('PASS real producer SQL filters sender/muted/inactive/system/deleted; 8 repeated events deduplicate; distinct messages remain distinct')
    cmd(['bun',root/'tests/handler-db.ts'],env={**env,'FIXTURE_SOCKET':str(tmp)})
    # Keep exact source definitions for rollback verification, never execute active services.
    reject((root/'rollback.sql').read_text())
    assert sql("SELECT to_regprocedure('claim_push_delivery(uuid)') IS NOT NULL")=='t'
    print('PASS rollback refuses populated delivery/cron ledgers without losing protections')
finally:
    if started:cmd([pg/'pg_ctl','-D',tmp/'data','-m','immediate','-w','stop'],stdout=subprocess.DEVNULL)
    shutil.rmtree(tmp)