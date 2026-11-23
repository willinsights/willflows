-- A1 passo 1 — CANDIDATO, NÃO APLICAR sem aprovação. Aditivo: não altera jobs.
-- Cria o token dos jobs agendados no Vault, a verificação por digest (só service_role)
-- e um despachante que lê o token do Vault na hora (o token nunca fica no texto do job).
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('willflow.cron.vault.v1'));
DO $setup$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'willflow_cron_v1') THEN
    PERFORM vault.create_secret('wfcron_' || encode(extensions.gen_random_bytes(32), 'hex'),
      'willflow_cron_v1', 'Bearer dos jobs agendados do WillFlow (A1)');
  END IF;
END
$setup$;

CREATE OR REPLACE FUNCTION public.verify_cron_digest(p_digest text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $verify$
  SELECT p_digest ~ '^[0-9a-f]{64}$' AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'willflow_cron_v1'
      AND p_digest = encode(pg_catalog.sha256(pg_catalog.convert_to(decrypted_secret, 'UTF8')), 'hex'))
$verify$;
REVOKE ALL ON FUNCTION public.verify_cron_digest(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_digest(text) TO service_role;

CREATE SCHEMA IF NOT EXISTS willflow_cron_private;
REVOKE ALL ON SCHEMA willflow_cron_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS willflow_cron_private.job_backup (
  jobid bigint PRIMARY KEY, jobname text, schedule text NOT NULL, command text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON willflow_cron_private.job_backup FROM PUBLIC, anon, authenticated, service_role;

-- Só funções agendadas conhecidas; o URL base é fixo (sem SSRF por parâmetro).
CREATE OR REPLACE FUNCTION willflow_cron_private.dispatch(p_function text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_token text; v_request bigint;
BEGIN
  IF p_function NOT IN ('cleanup-expired-videos','blog-auto-generate','process-push-queue','process-automation-jobs',
                        'check-payment-alerts','send-weekly-summary','stripe-reconcile','check-deadlines') THEN
    RAISE EXCEPTION 'CRON_FUNCTION_NOT_ALLOWED %', p_function;
  END IF;
  SELECT decrypted_secret INTO STRICT v_token FROM vault.decrypted_secrets WHERE name = 'willflow_cron_v1';
  SELECT net.http_post(
    url := 'https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/' || p_function,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_token),
    body := coalesce(p_body, '{}'::jsonb), timeout_milliseconds := 60000) INTO v_request;
  RETURN v_request;
END $$;
REVOKE ALL ON FUNCTION willflow_cron_private.dispatch(text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
