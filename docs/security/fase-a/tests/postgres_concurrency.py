"""Fictitious PostgreSQL, explicit private Unix socket; no hosted fallback."""
import os, subprocess, tempfile, shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]
pg=next(Path('/nix/store').glob('*-postgresql-17.*/bin'))
tmp=Path(tempfile.mkdtemp(prefix='fase-a-pg-'));os.chmod(tmp,0o777)
prefix=['setpriv','--reuid=1000','--regid=1000','--clear-groups']
env={k:v for k,v in os.environ.items() if not k.startswith(('PG','SUPABASE','DATABASE','LOVABLE'))}
def cmd(args,**kw):return subprocess.run(prefix+[str(a) for a in args],env=env,check=True,**kw)
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
    sql(claims+f"SELECT finish_weekly_summary_delivery('{ws}','{u}','2026-11-16','sent');")
    sql((root/'rollback.sql').read_text())
    assert sql("SELECT to_regprocedure('public.mark_cleanup_videos_deleted(uuid,uuid[])') IS NULL;")=='t'
    assert sql('SELECT count(*) FROM weekly_summary_deliveries;')=='1'
    print('PASS specific rollback removes RPCs and preserves delivery history')
finally:
    if started:cmd([pg/'pg_ctl','-D',tmp/'data','-m','immediate','-w','stop'],stdout=subprocess.DEVNULL)
    shutil.rmtree(tmp)
