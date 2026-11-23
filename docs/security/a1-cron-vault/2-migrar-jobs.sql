-- A1 passo 2 — CANDIDATO, NÃO APLICAR sem aprovação e sem preencher a lista a partir do passo 0.
-- Para cada job: guarda o original em job_backup, remove-o e cria-o de novo com nome
-- coerente com a cadência e com o comando a usar o despachante (token lido do Vault).
-- Falha fechada se algum job da lista mudou desde o inventário.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('willflow.cron.vault.v1'));
DO $migrate$
DECLARE r record; j cron.job;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    -- (jobid, função, body jsonb, schedule esperado, novo nome)  ← preencher com o passo 0
    (6::bigint, 'cleanup-expired-videos', '{}'::jsonb, '0 * * * *', 'cleanup-expired-videos-hourly')
  ) AS t(jobid, fn, body, schedule, new_name)
  LOOP
    SELECT * INTO j FROM cron.job WHERE jobid = r.jobid;
    IF NOT FOUND OR j.schedule <> r.schedule OR position('/functions/v1/' || r.fn IN j.command) = 0 THEN
      RAISE EXCEPTION 'A1_INVENTORY_CHANGED job % (%)', r.jobid, r.fn;
    END IF;
    INSERT INTO willflow_cron_private.job_backup(jobid, jobname, schedule, command)
      VALUES (j.jobid, j.jobname, j.schedule, j.command) ON CONFLICT (jobid) DO NOTHING;
    PERFORM cron.unschedule(j.jobid);
    PERFORM cron.schedule(r.new_name, r.schedule,
      format('SELECT willflow_cron_private.dispatch(%L, %L::jsonb);', r.fn, r.body::text));
  END LOOP;
END
$migrate$;
COMMIT;
-- Depois: confirmar HTTP 200 por ciclo em net._http_response (passo 0) antes de retirar
-- CRON_SECRET/AUTOMATION_CRON_SECRET das funções (passo separado, não incluído).
