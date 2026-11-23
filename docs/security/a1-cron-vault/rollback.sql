-- Repõe os jobs originais guardados em job_backup e remove os novos.
BEGIN;
DO $rb$
DECLARE b record; n text;
BEGIN
  FOR b IN SELECT * FROM willflow_cron_private.job_backup ORDER BY jobid LOOP
    FOR n IN SELECT jobname FROM cron.job WHERE command LIKE '%willflow_cron_private.dispatch(%'
             AND command LIKE '%' || substring(b.command FROM '/functions/v1/([a-z0-9-]+)') || '%' LOOP
      PERFORM cron.unschedule(n);
    END LOOP;
    PERFORM cron.schedule(coalesce(b.jobname, 'restored-' || b.jobid), b.schedule, b.command);
    DELETE FROM willflow_cron_private.job_backup WHERE jobid = b.jobid;
  END LOOP;
END $rb$;
COMMIT;
-- O segredo do Vault e verify_cron_digest podem ficar: as funções continuam a aceitar as credenciais antigas.
