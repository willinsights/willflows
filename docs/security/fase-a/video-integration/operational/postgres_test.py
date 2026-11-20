"""Private Unix socket fixtures, no hosted database connection."""
import os,subprocess,tempfile,shutil
from pathlib import Path
root=Path(tempfile.mkdtemp(prefix='video-control-'));os.chmod(root,0o777)
prefix=['setpriv','--reuid=1000','--regid=1000','--clear-groups'] if os.geteuid()==0 else []
env={k:v for k,v in os.environ.items() if not k.startswith(('PG','SUPABASE','DATABASE','LOVABLE'))}
def cmd(a,**kw):return subprocess.run(prefix+a,env=env,check=True,**kw)
def sql(s):return cmd(['/bin/psql','-X','-h',str(root),'-p','55450','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True).stdout.strip()
def fail(s):
 try:sql(s)
 except subprocess.CalledProcessError:return
 raise AssertionError('unexpected admission')
c="SET request.jwt.claims='{\"role\":\"service_role\"}';"
a='11111111-1111-4111-8111-111111111111';b='22222222-2222-4222-8222-222222222222'
started=False
try:
 cmd(['/bin/initdb','-D',str(root/'data'),'-A','trust','-U','postgres','--no-locale'],stdout=subprocess.DEVNULL)
 cmd(['/bin/pg_ctl','-D',str(root/'data'),'-l',str(root/'log'),'-o',f"-k {root} -p 55450 -c listen_addresses=''",'-w','start'],stdout=subprocess.DEVNULL);started=True
 sql('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE TABLE video_versions(id int);CREATE TABLE workspace_storage(id int);')
 sql(Path(__file__).with_name('maintenance.sql').read_text())
 assert sql(c+f"SELECT begin_video_execution('{a}','issue');").splitlines()[-1]=='t'
 assert sql(c+f"SELECT begin_video_execution('{a}','issue');").splitlines()[-1]=='f'
 print('PASS observe mode admits once without blocking clients')
 sql(c+f"SELECT record_video_grant('{a}',clock_timestamp()+interval '1 hour');SELECT finish_video_execution('{a}',true);")
 assert sql(c+"SELECT (video_control_status()->>'outstanding_grants')::int;").splitlines()[-1]=='1'
 print('PASS persisted grants survive request completion')
 sql("SELECT willflow_video_control.pause(clock_timestamp(),3600,120);")
 assert sql(c+f"SELECT begin_video_execution('{b}','cleanup');").splitlines()[-1]=='f'
 assert sql(c+f"SELECT begin_video_execution('{b}','process');").splitlines()[-1]=='t'
 fail('SELECT willflow_video_control.freeze();')
 print('PASS pause suppresses cleanup/issuance, allows draining, refuses premature freeze')
 sql(c+f"SELECT finish_video_execution('{b}',false);")
 sql("UPDATE willflow_video_control.grants SET expires_at=clock_timestamp()-interval '1 second';UPDATE willflow_video_control.state SET legacy_not_before=clock_timestamp()-interval '1 second';")
 fail('SELECT willflow_video_control.freeze();')
 print('PASS uncertain or expired leases never prove drain')
 sql('UPDATE willflow_video_control.executions SET finished_at=clock_timestamp(),outcome=\'done\';SELECT willflow_video_control.freeze();')
 fail('INSERT INTO video_versions VALUES(1);')
 fail('INSERT INTO workspace_storage VALUES(1);')
 print('PASS statement fences cover old browser/RPC writers')
 sql("UPDATE willflow_video_control.state SET pause_until=clock_timestamp()-interval '1 second';INSERT INTO video_versions VALUES(1);")
 assert sql(c+"SELECT begin_video_execution(gen_random_uuid(),'cleanup');").splitlines()[-1]=='t'
 print('PASS pre-coordinated timeout automatically restores legacy admission')
 sql("UPDATE willflow_video_control.state SET coordinated=true;")
 assert sql(c+"SELECT begin_video_execution(gen_random_uuid(),'cleanup');").splitlines()[-1]=='f'
 print('PASS coordinated mode never auto-enables incompatible destructive cleanup')
 assert sql("SELECT has_function_privilege('authenticated','video_control_status()','EXECUTE'),has_schema_privilege('service_role','willflow_video_control','USAGE');")=='f|f'
 print('PASS private state and control ACL closed')
finally:
 if started:cmd(['/bin/pg_ctl','-D',str(root/'data'),'-m','immediate','stop'],stdout=subprocess.DEVNULL)
 shutil.rmtree(root)
