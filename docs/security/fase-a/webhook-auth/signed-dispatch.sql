-- Install as the Lovable project database owner. Scheduling is a separate operation.
BEGIN;
CREATE SCHEMA IF NOT EXISTS willflow_worker_private;
REVOKE ALL ON SCHEMA willflow_worker_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS willflow_worker_private.dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent text NOT NULL CHECK (intent IN ('probe','run')),
  slot bigint NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  signature_hash bytea NOT NULL,
  request_id bigint,
  claimed_at timestamptz,
  finished_at timestamptz,
  response_status integer,
  UNIQUE (intent, slot)
);
REVOKE ALL ON willflow_worker_private.dispatch FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION willflow_worker_private.enqueue(p_intent text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_slot bigint := floor(extract(epoch FROM clock_timestamp())/300)::bigint;
  v_secret text;
  v_sig text;
  v_request bigint;
BEGIN
  IF p_intent IS NULL OR p_intent NOT IN ('probe','run') THEN RAISE EXCEPTION 'invalid worker intent'; END IF;
  SELECT decrypted_secret INTO STRICT v_secret FROM vault.decrypted_secrets WHERE name='willflow_retry_worker_v1';
  v_sig := encode(extensions.hmac('willflow.webhook.v1:' || v_id::text || ':' || p_intent, v_secret, 'sha256'),'hex');
  DELETE FROM willflow_worker_private.dispatch WHERE issued_at < now() - interval '7 days';
  INSERT INTO willflow_worker_private.dispatch(id,intent,slot,signature_hash)
    VALUES (v_id,p_intent,v_slot,sha256(convert_to(v_sig,'UTF8')))
    ON CONFLICT (intent,slot) DO NOTHING;
  IF NOT FOUND THEN
    RETURN (SELECT id FROM willflow_worker_private.dispatch WHERE intent=p_intent AND slot=v_slot);
  END IF;
  -- Only a signed instruction for this exact operation enters pg_net.
  SELECT net.http_post(url := 'https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/webhook-retry-worker',
    headers := jsonb_build_object('Content-Type','application/json','x-willflow-dispatch',v_id::text,
      'x-willflow-intent',p_intent,'x-willflow-signature',v_sig), body := '{}'::jsonb, timeout_milliseconds := 60000)
    INTO v_request;
  UPDATE willflow_worker_private.dispatch SET request_id=v_request WHERE id=v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION willflow_worker_private.enqueue(text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_webhook_worker_dispatch(p_id uuid,p_intent text,p_signature text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE willflow_worker_private.dispatch SET claimed_at=clock_timestamp()
  WHERE id=p_id AND intent=p_intent AND claimed_at IS NULL
    AND issued_at BETWEEN clock_timestamp()-interval '90 seconds' AND clock_timestamp()
    AND signature_hash=sha256(convert_to(p_signature,'UTF8'));
  RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION public.finish_webhook_worker_dispatch(p_id uuid,p_status integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE willflow_worker_private.dispatch SET finished_at=clock_timestamp(),response_status=p_status
  WHERE id=p_id AND claimed_at IS NOT NULL AND finished_at IS NULL AND p_status BETWEEN 100 AND 599;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_webhook_worker_dispatch(uuid,text,text), public.finish_webhook_worker_dispatch(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_worker_dispatch(uuid,text,text), public.finish_webhook_worker_dispatch(uuid,integer) TO service_role;
COMMIT;
