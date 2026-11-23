"""Ensaio A1 numa PostgreSQL descartável com Vault, pg_cron e pg_net simulados. Dados fictícios."""
import sys, hashlib
from pathlib import Path
here = Path(__file__).resolve().parent
sys.path.insert(0, str(here.parent / '_ensaio'))
from pg import disposable, report

STUBS = r'''
CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto SCHEMA extensions;
CREATE SCHEMA vault;
CREATE TABLE vault.secrets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE, secret text, description text);
CREATE VIEW vault.decrypted_secrets AS SELECT id, name, secret AS decrypted_secret, description FROM vault.secrets;
CREATE FUNCTION vault.create_secret(s text, n text, d text) RETURNS uuid LANGUAGE sql AS
  $$INSERT INTO vault.secrets(name,secret,description) VALUES (n,s,d) RETURNING id$$;
-- Como no Supabase: service_role lê o Vault (a verificação do webhook já depende disto).
GRANT USAGE ON SCHEMA vault TO service_role; GRANT SELECT ON vault.decrypted_secrets TO service_role;
CREATE SCHEMA cron;
CREATE TABLE cron.job(jobid bigserial PRIMARY KEY, jobname text UNIQUE, schedule text, command text, active boolean DEFAULT true);
CREATE FUNCTION cron.schedule(n text, s text, c text) RETURNS bigint LANGUAGE sql AS
  $$INSERT INTO cron.job(jobname,schedule,command) VALUES (n,s,c) RETURNING jobid$$;
CREATE FUNCTION cron.unschedule(id bigint) RETURNS boolean LANGUAGE plpgsql AS $$BEGIN DELETE FROM cron.job WHERE jobid=id; RETURN FOUND; END$$;
CREATE FUNCTION cron.unschedule(n text) RETURNS boolean LANGUAGE plpgsql AS $$BEGIN DELETE FROM cron.job WHERE jobname=n; RETURN FOUND; END$$;
CREATE SCHEMA net;
CREATE TABLE net.calls(id bigserial PRIMARY KEY, url text, headers jsonb, body jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) RETURNS bigint LANGUAGE sql AS
  $$INSERT INTO net.calls(url,headers,body) VALUES (url,headers,body) RETURNING id$$;
'''
OLD = "SELECT net.http_post(url:='https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/cleanup-expired-videos', headers:='{\"x-cron-secret\":\"demo-legacy\"}'::jsonb, body:='{}'::jsonb, timeout_milliseconds:=1000)"
with disposable(55472) as db:
    db.sql(STUBS)
    db.sql(f"INSERT INTO cron.job(jobid,jobname,schedule,command) VALUES (6,'cleanup-expired-videos-daily','0 * * * *',$x${OLD}$x$); SELECT setval('cron.job_jobid_seq', 20);")
    checks = []
    db.file(here / '1-provision.sql')
    tok = db.sql("SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='willflow_cron_v1'")
    checks.append(('token no formato wfcron_ + 64 hex', tok.startswith('wfcron_') and len(tok) == 71))
    db.file(here / '1-provision.sql')
    checks.append(('provisionamento idempotente (1 segredo)', db.sql("SELECT count(*) FROM vault.secrets") == '1'))
    dig = hashlib.sha256(tok.encode()).hexdigest()
    sr = "SET LOCAL ROLE service_role;"
    checks.append(('digest certo aceite', db.sql(f"BEGIN; {sr} SELECT public.verify_cron_digest('{dig}'); COMMIT;").splitlines()[-2] == 't'))
    checks.append(('digest errado recusado', db.sql(f"BEGIN; {sr} SELECT public.verify_cron_digest('{'0'*64}'); COMMIT;").splitlines()[-2] == 'f'))
    checks.append(('authenticated não chama verify', db.rejects(lambda: db.sql(f"BEGIN; SET LOCAL ROLE authenticated; SELECT public.verify_cron_digest('{dig}'); COMMIT;"), 'permission denied')))
    checks.append(('despachante recusa função fora da lista', db.rejects(lambda: db.sql("SELECT willflow_cron_private.dispatch('delete-account')"), 'CRON_FUNCTION_NOT_ALLOWED')))
    # Inventário alterado → falha fechada
    db.sql("UPDATE cron.job SET schedule='*/5 * * * *' WHERE jobid=6")
    checks.append(('inventário alterado: migração recusada', db.rejects(lambda: db.file(here / '2-migrar-jobs.sql'), 'A1_INVENTORY_CHANGED')))
    checks.append(('nada mudou após recusa', db.sql("SELECT count(*) FROM cron.job WHERE jobid=6") == '1'))
    db.sql("UPDATE cron.job SET schedule='0 * * * *' WHERE jobid=6")
    db.file(here / '2-migrar-jobs.sql')
    newcmd = db.sql("SELECT command FROM cron.job WHERE jobname='cleanup-expired-videos-hourly'")
    checks.append(('job renomeado para a cadência (hourly)', bool(newcmd)))
    checks.append(('comando sem segredo em claro', tok not in newcmd and 'demo-legacy' not in newcmd and 'dispatch' in newcmd))
    checks.append(('original guardado no backup', db.sql("SELECT count(*) FROM willflow_cron_private.job_backup") == '1'))
    db.sql(newcmd)  # simula uma execução do cron
    call = db.sql("SELECT url || '|' || (headers->>'Authorization') FROM net.calls ORDER BY id DESC LIMIT 1")
    checks.append(('execução envia Bearer do Vault ao URL fixo', call == f"https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/cleanup-expired-videos|Bearer {tok}"))
    db.file(here / 'rollback.sql')
    checks.append(('rollback repõe o job original', db.sql("SELECT jobname || '|' || schedule FROM cron.job") == 'cleanup-expired-videos-daily|0 * * * *'))
    checks.append(('rollback sem jobs novos', db.sql("SELECT count(*) FROM cron.job WHERE command LIKE '%dispatch%'") == '0'))
    sys.exit(report(checks))
