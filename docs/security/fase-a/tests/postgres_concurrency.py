"""Fictitious PostgreSQL, explicit private Unix socket; no hosted fallback."""
import os, subprocess, tempfile, shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]
pg=next(Path('/nix/store').glob('*-postgresql-17.*/bin'))
tmp=Path(tempfile.mkdtemp(prefix='fase-a-pg-'));os.chmod(tmp,0o777)
prefix=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
env={k:v for k,v in os.environ.items() if not k.startswith(('PG','SUPABASE','DATABASE','LOVABLE'))}
def cmd(args,**kw):return subprocess.run(prefix+[str(a) for a in args],env=kw.pop('env',env),check=True,**kw)
def sql(s):
    return cmd([pg/'psql','-X','-h',tmp,'-p','55449','-U','fixture','-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True).stdout.strip()
claims="SET request.jwt.claims='{\"role\":\"service_role\"}';"
ws='11111111-1111-4111-8111-111111111111';v='33333333-3333-4333-8333-333333333333';u='22222222-2222-4222-8222-222222222222'
started=False
try:
    cmd([pg/'initdb','-D',tmp/'data','-A','trust','-U','fixture','--no-locale'],stdout=subprocess.DEVNULL)
    cmd([pg/'pg_ctl','-D',tmp/'data','-l',tmp/'pg.log','-o',f"-k {tmp} -p 55449 -c listen_addresses=''",'-w','start'],stdout=subprocess.DEVNULL);started=True
    sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE TABLE video_versions(id uuid PRIMARY KEY,workspace_id uuid,file_size_bytes bigint,replacement_file_size_bytes bigint,is_deleted boolean,deleted_at timestamptz); CREATE TABLE workspace_storage(workspace_id uuid PRIMARY KEY,storage_used_bytes bigint,last_calculated_at timestamptz);')
    sql((root/'candidate.sql').read_text())
    # Empty-ledger rollback and exact reapply; additive schema must be atomic on collision.
    sql((root/'rollback.sql').read_text())
    assert sql("SELECT to_regprocedure('public.claim_weekly_summary_delivery(uuid,uuid,date)') IS NULL;")=='t'
    sql('DROP TABLE weekly_summary_deliveries;') # fictitious fixture only
    sql((root/'candidate.sql').read_text())
    try:sql((root/'candidate.sql').read_text())
    except subprocess.CalledProcessError:pass
    else:raise AssertionError('name collision not rejected')
    print('PASS empty-ledger rollback, fixture reinstall and atomic collision refusal')
    # Mirror the CURRENT catalog trigger, prove no double accounting on is_deleted.
    old=Path('supabase/migrations/20260617182644_a4741641-7845-4cfc-bb2b-79fac3702685.sql').read_text().split('-- RPC:')[0]
    sql('ALTER TABLE workspace_storage ADD COLUMN storage_limit_bytes bigint;'+old)
    sql(f"INSERT INTO workspace_storage VALUES('{ws}',1000,now(),10000); INSERT INTO video_versions VALUES('{v}','{ws}',200,50,false,NULL); UPDATE workspace_storage SET storage_used_bytes=1000;")
    claim=f"SELECT claim_weekly_summary_delivery('{ws}','{u}','2026-11-16');"
    with ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(lambda _:sql(claims+claim).splitlines()[-1],range(8)))
    assert results.count('t')==1,results
    print('PASS 8 concurrent weekly claims: exactly one winner')
    deletion=f"SELECT mark_cleanup_videos_deleted('{ws}',ARRAY['{v}'::uuid]);"
    def deleter(_):return sql(claims+deletion).splitlines()[-1]
    def upload(_):return sql(f"UPDATE workspace_storage SET storage_used_bytes=storage_used_bytes+100 WHERE workspace_id='{ws}';")
    with ThreadPoolExecutor(max_workers=9) as pool:
        futures=[pool.submit(deleter,i) for i in range(8)]+[pool.submit(upload,0)]
        amounts=[int(f.result()) for f in futures[:8]];futures[-1].result()
    assert sum(amounts)==250,amounts
    assert sql('SELECT storage_used_bytes FROM workspace_storage;')=='850'
    print('PASS duplicate deletion plus concurrent upload: debit 250 once, final quota 850')
    # Missing quota rolls back the video transition, no partial mutation.
    missing='44444444-4444-4444-8444-444444444444'
    sql(f"INSERT INTO video_versions VALUES('{missing}','{ws}',10,0,false,NULL); DELETE FROM workspace_storage;")
    try:sql(claims+f"SELECT mark_cleanup_videos_deleted('{ws}',ARRAY['{missing}'::uuid]);")
    except subprocess.CalledProcessError:pass
    else:raise AssertionError('missing quota accepted')
    assert sql(f"SELECT is_deleted FROM video_versions WHERE id='{missing}';")=='f'
    print('PASS missing quota aborts deletion transaction')
    def rejects(statement):
        try:sql(statement)
        except subprocess.CalledProcessError:return
        raise AssertionError('unexpected acceptance: '+statement)
    # Effective ACL/RLS, not merely SQL text checks.
    for role in ['anon','authenticated']:
        rejects(f'SET ROLE {role}; SELECT * FROM weekly_summary_deliveries;')
        rejects(f'SET ROLE {role};'+claims+claim)
    for identity in ['', '{"role":"authenticated"}', '{"role":null}']:
        rejects("SET request.jwt.claims='"+identity+"';"+claim)
    assert sql("SELECT has_table_privilege('service_role','weekly_summary_deliveries','SELECT,INSERT,UPDATE');")=='t'
    assert sql("SELECT relrowsecurity FROM pg_class WHERE oid='weekly_summary_deliveries'::regclass;")=='t'
    assert sql("SELECT count(*) FROM pg_proc WHERE proname IN ('claim_weekly_summary_delivery','finish_weekly_summary_delivery','mark_cleanup_videos_deleted') AND prosecdef AND 'search_path=public'=ANY(proconfig);")=='3'
    print('PASS effective ACL/RLS and fail-closed authorization for absent/null/invalid claims')
    rejects(claims+f"SELECT claim_weekly_summary_delivery('{ws}','{u}','2026-11-17');")
    rejects(claims+f"SELECT finish_weekly_summary_delivery('{ws}','{u}','2026-11-16',NULL);")
    # Replacement accounting and invalid batches, with existing rows preserved.
    sql(f"INSERT INTO workspace_storage VALUES('{ws}',1000,now(),10000);")
    for batch in ['NULL','ARRAY[]::uuid[]','ARRAY[NULL]::uuid[]',f"ARRAY['{v}'::uuid,'99999999-9999-4999-8999-999999999999'::uuid]"]:
        rejects(claims+f"SELECT mark_cleanup_videos_deleted('{ws}',{batch});")
    ws2='55555555-5555-4555-8555-555555555555'
    rejects(claims+f"SELECT mark_cleanup_videos_deleted('{ws2}',ARRAY['{missing}'::uuid]);")
    sql(f"UPDATE workspace_storage SET storage_used_bytes=5 WHERE workspace_id='{ws}';")
    rejects(claims+f"SELECT mark_cleanup_videos_deleted('{ws}',ARRAY['{missing}'::uuid]);")
    assert sql(f"SELECT is_deleted FROM video_versions WHERE id='{missing}';")=='f'
    print('PASS invalid identities, cross-workspace batch and undercounted quota fail atomically')
    sql(f"UPDATE workspace_storage SET storage_used_bytes=1000 WHERE workspace_id='{ws}';")
    assert sql(claims+f"SELECT mark_cleanup_videos_deleted('{ws}',ARRAY['{missing}'::uuid,'{missing}'::uuid]);").splitlines()[-1]=='10'
    assert sql(claims+f"SELECT mark_cleanup_videos_deleted('{ws}',ARRAY['{missing}'::uuid]);").splitlines()[-1]=='0'
    print('PASS repeated IDs and sequential retry debit once')
    # Reverse input orders across overlapping batches cannot deadlock each other.
    ids=['66666666-6666-4666-8666-666666666661','66666666-6666-4666-8666-666666666662']
    for ident in ids:sql(f"INSERT INTO video_versions VALUES('{ident}','{ws}',20,5,false,NULL);")
    with ThreadPoolExecutor(max_workers=8) as pool:
        amounts=list(pool.map(lambda i:int(sql(claims+f"SELECT mark_cleanup_videos_deleted('{ws}',ARRAY['{ids[i%2]}'::uuid,'{ids[1-i%2]}'::uuid]);").splitlines()[-1]),range(8)))
    assert sum(amounts)==50
    print('PASS overlapping reverse-order batches: 8 callers debit 50 once')
    # Catalog regression: later hard DELETE of a logically deleted row debits again.
    before=int(sql('SELECT storage_used_bytes FROM workspace_storage;'))
    sql(f"DELETE FROM video_versions WHERE id='{ids[0]}';")
    after=int(sql('SELECT storage_used_bytes FROM workspace_storage;'))
    assert before-after==20
    print('KNOWN BLOCKER reproduced: existing hard-delete trigger debits deleted row again (20 bytes)')
    # Mirror catalog uniqueness: Stripe's SELECT-before-INSERT has no unique open identity.
    sql('CREATE TABLE fixture_discrepancies(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,stripe_subscription_id text,resolved_at timestamptz);')
    from threading import Barrier
    barrier=Barrier(8)
    def discrepancy(_):
        assert sql("SELECT count(*) FROM fixture_discrepancies WHERE stripe_subscription_id='sub_fixture' AND resolved_at IS NULL;")=='0'
        barrier.wait(timeout=10)
        sql("INSERT INTO fixture_discrepancies(stripe_subscription_id) VALUES('sub_fixture');")
    with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(discrepancy,range(8)))
    assert sql('SELECT count(*) FROM fixture_discrepancies;')=='8'
    print('KNOWN BLOCKER reproduced: Stripe check-before-insert permits 8 open fictitious duplicates')
    cmd(['bun',root/'tests/handler-postgres.ts'],env={**env,'FASE_A_FIXTURE_SOCKET':str(tmp)})
    sql(claims+f"SELECT finish_weekly_summary_delivery('{ws}','{u}','2026-11-16','sent');")
    try:sql((root/'rollback.sql').read_text())
    except subprocess.CalledProcessError:pass
    else:raise AssertionError('rollback permitted historical resend')
    assert sql("SELECT to_regprocedure('public.mark_cleanup_videos_deleted(uuid,uuid[])') IS NOT NULL;")=='t'
    assert sql('SELECT count(*) FROM weekly_summary_deliveries;')=='2'
    print('PASS rollback refuses removal after sent history and preserves protected RPCs')
finally:
    if started:cmd([pg/'pg_ctl','-D',tmp/'data','-m','immediate','-w','stop'],stdout=subprocess.DEVNULL)
    shutil.rmtree(tmp)
