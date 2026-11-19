import os,subprocess,tempfile
from pathlib import Path
p=Path(tempfile.mkdtemp(prefix='pr2-pg-'));os.chown(p,1000,1000)
def lower():
 os.setgroups([]);os.setgid(1000);os.setuid(1000)
def cmd(a,**kw):return subprocess.run(a,check=True,preexec_fn=lower,**kw)
args=['psql','-XqAt','-h',str(p),'-p','55479','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1']
def sql(s):return cmd(args,input=s,text=True,capture_output=True).stdout.strip()
started=False
try:
 cmd(['initdb','-D',str(p/'data'),'-A','trust','-U','postgres','--no-locale'],stdout=subprocess.DEVNULL)
 cmd(['pg_ctl','-D',str(p/'data'),'-l',str(p/'log'),'-o',f"-k {p} -p 55479 -c listen_addresses=''",'-w','start'],stdout=subprocess.DEVNULL);started=True
 sql("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;CREATE SCHEMA net;CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE sql AS 'SELECT 1::bigint';")
 sql(Path('/dev-server/docs/security/pr2-canary/install.sql').read_text())
 assert sql("SELECT has_function_privilege('authenticated','public.claim_pr2_video_canary(uuid,text)','EXECUTE'),has_function_privilege('service_role','public.claim_pr2_video_canary(uuid,text)','EXECUTE'),has_function_privilege('service_role','willflow_pr2_canary_private.enqueue()','EXECUTE')")=='f|t|f'
 i=sql('SELECT willflow_pr2_canary_private.enqueue()');d=sql('SELECT encode(signature_digest,\'hex\') FROM willflow_pr2_canary_private.dispatch')
 assert sql(f"SELECT public.claim_pr2_video_canary('{i}','{'0'*64}')")=='f'
 assert sql(f"SET ROLE service_role;SELECT public.claim_pr2_video_canary('{i}','{d}')")=='t'
 assert sql(f"SELECT public.claim_pr2_video_canary('{i}','{d}')")=='f'
 sql("UPDATE willflow_pr2_canary_private.dispatch SET claimed_at=NULL,expires_at=now()-interval '1 second'")
 assert sql(f"SELECT public.claim_pr2_video_canary('{i}','{d}')")=='f'
 r=subprocess.run(args,input='SELECT willflow_pr2_canary_private.enqueue()',text=True,capture_output=True,preexec_fn=lower)
 assert r.returncode!=0
 print('PG17: ACL, wrong digest, valid claim, replay, expiry, singleton: 6 checks passed')
finally:
 if started:cmd(['pg_ctl','-D',str(p/'data'),'-m','immediate','-w','stop'],stdout=subprocess.DEVNULL)
