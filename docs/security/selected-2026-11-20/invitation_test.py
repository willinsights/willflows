"""Actual invitation migration against disposable Unix-socket fixtures only."""
import os,subprocess,tempfile,shutil
from pathlib import Path
root=Path(tempfile.mkdtemp(prefix='invitation-security-'));os.chmod(root,0o777)
prefix=['setpriv','--reuid=1000','--regid=1000','--clear-groups'] if os.geteuid()==0 else []
env={k:v for k,v in os.environ.items() if not k.startswith(('PG','SUPABASE','DATABASE','LOVABLE'))}
def cmd(args,**kw):return subprocess.run(prefix+args,env=env,check=True,**kw)
def sql(text):return cmd(['/bin/psql','-X','-h',str(root),'-p','55451','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True).stdout.strip()
user='11111111-1111-4111-8111-111111111111';ws='22222222-2222-4222-8222-222222222222'
started=False
try:
 cmd(['/bin/initdb','-D',str(root/'data'),'-A','trust','-U','postgres','--no-locale'],stdout=subprocess.DEVNULL)
 cmd(['/bin/pg_ctl','-D',str(root/'data'),'-l',str(root/'log'),'-o',f"-k {root} -p 55451 -c listen_addresses=''",'-w','start'],stdout=subprocess.DEVNULL);started=True
 sql("""CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid,email text,email_confirmed_at timestamptz);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.uid',true),'')::uuid$$;
 CREATE FUNCTION public.hash_email(text) RETURNS text LANGUAGE sql AS $$SELECT md5(lower(trim($1)))$$;
 CREATE FUNCTION public.hash_invitation_token(text) RETURNS text LANGUAGE sql AS $$SELECT md5($1)$$;
 CREATE TABLE workspaces(id uuid,name text);
 CREATE TABLE workspace_invitations(id uuid,workspace_id uuid,token_hash text,email_hash text,role text,expires_at timestamptz,accepted_at timestamptz);
 CREATE TABLE workspace_members(id uuid DEFAULT gen_random_uuid(),workspace_id uuid,user_id uuid,role text,joined_at timestamptz,is_active boolean);
 """)
 sql(Path('drizzle/migrations/0011_require_verified_invitation_email.sql').read_text())
 sql(f"INSERT INTO auth.users VALUES('{user}','fixture@example.invalid',NULL);INSERT INTO workspaces VALUES('{ws}','Fictitious');INSERT INTO workspace_invitations VALUES(gen_random_uuid(),'{ws}',md5('fixture-token'),md5('fixture@example.invalid'),'edicao',now()+interval '1 hour',NULL);")
 def accept():return sql(f"SET fixture.uid='{user}';SELECT accept_workspace_invitation('fixture-token')->>'success';").splitlines()[-1]
 assert accept()=='false';assert sql('SELECT count(*) FROM workspace_members;')=='0'
 assert sql('SELECT count(*) FROM workspace_invitations WHERE accepted_at IS NOT NULL;')=='0'
 print('PASS unverified mailbox rejected without membership or invite consumption')
 sql(f"UPDATE auth.users SET email_confirmed_at=now(),email='other@example.invalid' WHERE id='{user}';")
 assert accept()=='false';print('PASS verified but different mailbox rejected')
 sql(f"UPDATE auth.users SET email='fixture@example.invalid' WHERE id='{user}';")
 assert accept()=='true';assert sql('SELECT role,is_active FROM workspace_members;')=='edicao|t'
 print('PASS verified matching email preserves invited role and membership')
 assert accept()=='false';assert sql('SELECT count(*) FROM workspace_members;')=='1'
 print('PASS consumed invitation cannot add another membership')
 assert sql("SELECT accept_workspace_invitation('fixture-token')->>'success';")=='false'
 print('PASS anonymous caller rejected')
finally:
 if started:cmd(['/bin/pg_ctl','-D',str(root/'data'),'-m','immediate','stop'],stdout=subprocess.DEVNULL)
 shutil.rmtree(root)