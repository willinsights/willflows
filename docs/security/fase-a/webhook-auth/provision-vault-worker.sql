-- Run as the database owner. A generated worker bearer stays inside Vault.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('willflow.worker.vault.v1'));
DO $setup$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'willflow_retry_worker_v1') THEN
    PERFORM vault.create_secret('wfworker_' || encode(extensions.gen_random_bytes(32), 'hex'),
      'willflow_retry_worker_v1', 'Dedicated to the scheduled webhook retry worker');
  END IF;
END
$setup$;

CREATE OR REPLACE FUNCTION public.verify_webhook_worker_digest(p_digest text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $verify$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'willflow_retry_worker_v1'
      AND p_digest = encode(pg_catalog.sha256(pg_catalog.convert_to(decrypted_secret, 'UTF8')), 'hex')
  )
$verify$;
REVOKE ALL ON FUNCTION public.verify_webhook_worker_digest(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_webhook_worker_digest(text) TO service_role;
COMMIT;
