"""Ensaio do candidato numa PostgreSQL descartável (socket local). Identidades fictícias."""
from pathlib import Path
import os, subprocess, tempfile, shutil, sys
here = Path(__file__).resolve().parent
# Por omissão usa as migrações aplicadas (drizzle 0013–0015); WF_SIDECAR=draft usa o rascunho sidecar.sql.
repo = here.parents[2]
sides = ([here.parent / 'fase-a/video-integration/coexistence/sidecar.sql'] if os.environ.get('WF_SIDECAR') == 'draft'
         else sorted((repo / 'drizzle/migrations').glob('001[345]_*.sql')))
pg = Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))
tmp = Path(tempfile.mkdtemp(prefix='wfr', dir='/tmp'))
env = {k: v for k, v in os.environ.items() if not k.startswith(('PG', 'DATABASE', 'SUPABASE', 'LOVABLE'))}
env['LC_ALL'] = 'C'  # macOS: o postmaster recusa arrancar sem locale válido
def run(a, **kw): return subprocess.run([str(x) for x in a], env=env, check=True, **kw)
def sql(s): return run([pg/'psql', '-X', '-h', tmp, '-p', '55463', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], input=s, text=True, capture_output=True).stdout.strip()
def file(p): return subprocess.run([str(x) for x in [pg/'psql', '-X', '-h', tmp, '-p', '55463', '-U', 'postgres', '-d', 'postgres', '-q', '-1', '-v', 'ON_ERROR_STOP=1', '-f', p]], env=env, capture_output=True, text=True)
SR = "SET request.jwt.claims='{\"role\":\"service_role\"}';"
WS = '11111111-1111-4111-8111-111111111111'; P = '22222222-2222-4222-8222-222222222222'
T1 = '55555555-5555-4555-8555-555555555551'; T2 = '55555555-5555-4555-8555-555555555552'; T3 = '55555555-5555-4555-8555-555555555553'
def vid(n): return f'aaaaaaaa-0000-4000-8000-{n:012d}'
started = False
try:
    run([pg/'initdb', '-D', tmp/'data', '-A', 'trust', '-U', 'postgres', '--no-locale'], stdout=subprocess.DEVNULL)
    run([pg/'pg_ctl', '-D', tmp/'data', '-l', tmp/'log', '-o', f"-k {tmp} -p 55463 -c listen_addresses=''", '-w', 'start'], stdout=subprocess.DEVNULL); started = True
    sql('''CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE workspaces(id uuid PRIMARY KEY,active boolean DEFAULT true,subscription_plan text);
    CREATE FUNCTION workspace_is_active(p_ws uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT active FROM workspaces WHERE id=p_ws$$;
    CREATE TABLE projects(id uuid PRIMARY KEY,workspace_id uuid,name text);
    CREATE TABLE tasks(id uuid PRIMARY KEY,project_id uuid);
    CREATE TABLE workspace_members(workspace_id uuid,user_id uuid,role text,is_active boolean);
    CREATE TABLE workspace_storage(workspace_id uuid PRIMARY KEY,storage_used_bytes bigint,storage_limit_bytes bigint,base_storage_bytes bigint,extra_storage_bytes bigint,last_calculated_at timestamptz);
    CREATE TABLE video_versions(id uuid PRIMARY KEY,r2_key text,cloudflare_stream_uid text,is_deleted boolean,workspace_id uuid,file_size_bytes bigint,replacement_file_size_bytes bigint,replacement_r2_key text,replacement_stream_uid text);
    CREATE TABLE video_approval_tokens(id uuid PRIMARY KEY,token text);
    CREATE FUNCTION noop_trg() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW;END$$;
    CREATE TRIGGER video_accounting_serial BEFORE INSERT OR UPDATE ON video_versions FOR EACH ROW EXECUTE FUNCTION noop_trg();
    CREATE TRIGGER guard_storage_counter BEFORE UPDATE ON workspace_storage FOR EACH ROW EXECUTE FUNCTION noop_trg();
    CREATE FUNCTION has_workspace_permission(p_ws uuid,p_user uuid,p_perm text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT true$$;
    CREATE FUNCTION lock_video_accounting() RETURNS void LANGUAGE sql AS $$SELECT pg_advisory_xact_lock(742019,1)$$;''')
    for side in sides:
        r = file(side)
        if r.returncode: print(side.name, r.stderr[-1500:]); raise SystemExit(1)
    r = file(here/'candidate.sql')
    if r.returncode: print(r.stderr); raise SystemExit(1)
    # Fixtures: 3 tarefas. T1 aprovada há 8 dias (2 versões), T2 aprovada há 2 dias, T3 aprovada há 9 dias mas reaprovada há 1 dia.
    rows = [(1, T1, 'ready', 'uid1'), (2, T1, 'ready', None), (3, T2, 'ready', 'uid3'), (4, T3, 'ready', None), (5, T3, 'ready', None), (6, T1, 'uncertain', None)]
    ins = ''.join(f"INSERT INTO willflow_video_private.versions(id,workspace_id,project_id,task_id,author_id,file_name,bytes,object_key,operation_id,state,stream_uid,expires_at) VALUES('{vid(n)}','{WS}','{P}','{t}','{WS}','demo{n}.mp4',100,'{WS}/obj{n}','{vid(100+n)}','{s}',{('NULL' if u is None else repr(u))},now()+interval '1 day');" for n, t, s, u in rows)
    appr = [(2, 8), (3, 2), (4, 9), (5, 1)]
    ins += ''.join(f"INSERT INTO willflow_video_private.approvals(request_id,version_id,digest,name,approved_at) VALUES('{vid(200+n)}','{vid(n)}','{'b'*64}','Cliente Demo',now()-interval '{d} days');" for n, d in appr)
    sql("SET session_replication_role=replica;" + ins)  # fixtures: ignora triggers de assinatura/quota
    checks = []
    # 1) Desligado por omissão: nada acontece.
    prev = sql(SR + "SELECT jsonb_array_length(public.private_video_retention_preview());").splitlines()[-1]
    checks.append(('preview com interruptor desligado lista T1 (2)', prev == '2'))
    checks.append(('desligado', sql(SR + "SELECT public.private_video_retention_withdraw(100);").splitlines()[-1] == '0'))
    # 2) Sem service_role: recusado.
    try: sql("SELECT public.private_video_retention_withdraw(100);"); checks.append(('sem service_role recusado', False))
    except subprocess.CalledProcessError as e: checks.append(('sem service_role recusado', 'Forbidden' in e.stderr))
    sql("INSERT INTO willflow_video_private.retention_settings(singleton,enabled) VALUES(true,true);")
    n = sql(SR + "SELECT public.private_video_retention_withdraw(100);").splitlines()[-1]
    checks.append(('retira só T1 ready (2 versões)', n == '2'))
    st = dict(l.split('|') for l in sql("SELECT right(id::text,1),state FROM willflow_video_private.versions ORDER BY id;").splitlines())
    checks.append(('T2 recente intacta, T3 reaprovada intacta, uncertain intacta', st == {'1': 'withdrawn', '2': 'withdrawn', '3': 'ready', '4': 'ready', '5': 'ready', '6': 'uncertain'}))
    checks.append(('comentários/aprovações preservados', sql("SELECT count(*) FROM willflow_video_private.approvals;") == '4'))
    pend = sql(SR + "SELECT jsonb_array_length(public.private_video_retention_pending(100));").splitlines()[-1]
    checks.append(('outbox: obj1, uid1, obj2', pend == '3'))
    sql(SR + f"SELECT public.private_video_retention_result('r2','{WS}/obj1',true);SELECT public.private_video_retention_result('stream','uid1',false,'500');")
    pend = sql(SR + "SELECT jsonb_array_length(public.private_video_retention_pending(100));").splitlines()[-1]
    checks.append(('falha fica pendente para nova tentativa', pend == '2'))
    checks.append(('idempotente: segunda corrida não retira mais', sql(SR + "SELECT public.private_video_retention_withdraw(100);").splitlines()[-1] == '0'))
    q = sql("SELECT coalesce(sum(bytes),0) FROM willflow_video_private.versions WHERE state NOT IN ('issued','aborted','withdrawn');")
    checks.append(('quota privada liberta (4 x 100 restantes)', q == '400'))
    r = file(here/'rollback.sql'); checks.append(('rollback aplica', r.returncode == 0))
    for name, ok in checks: print(('OK  ' if ok else 'FAIL') + ' ' + name)
    sys.exit(0 if all(ok for _, ok in checks) else 1)
finally:
    if started: run([pg/'pg_ctl', '-D', tmp/'data', '-m', 'immediate', 'stop'], stdout=subprocess.DEVNULL)
    shutil.rmtree(tmp, ignore_errors=True)
