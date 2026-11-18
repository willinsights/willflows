BEGIN;
-- Independent Stripe-only candidate; no Phase-A quota/push dependency.
-- Abort rather than silently deduplicate existing records.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.subscription_discrepancies WHERE resolved_at IS NULL AND (stripe_subscription_id IS NULL OR btrim(stripe_subscription_id)=''))
    OR EXISTS(SELECT 1 FROM public.subscription_discrepancies WHERE resolved_at IS NULL GROUP BY stripe_subscription_id HAVING count(*)>1)
  THEN RAISE EXCEPTION 'Existing open discrepancy identities need authorised review'; END IF;
END $$;
CREATE UNIQUE INDEX subscription_discrepancies_one_open ON public.subscription_discrepancies(stripe_subscription_id) WHERE resolved_at IS NULL;
ALTER TABLE public.subscription_discrepancies ADD CONSTRAINT open_discrepancy_identity CHECK(resolved_at IS NOT NULL OR (stripe_subscription_id IS NOT NULL AND btrim(stripe_subscription_id)<>'')) NOT VALID;
CREATE FUNCTION public.record_stripe_discrepancy(p_subscription text,p_stripe_status text,p_db_status text,
  p_user uuid DEFAULT NULL,p_customer text DEFAULT NULL,p_details jsonb DEFAULT '{}'::jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted integer; linked_workspace uuid; matches integer;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_subscription IS NULL OR length(btrim(p_subscription)) NOT BETWEEN 1 AND 255 OR p_stripe_status IS NULL OR p_db_status IS NULL OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' THEN RAISE EXCEPTION 'Invalid observation'; END IF;
  IF p_user IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND stripe_subscription_id=p_subscription) THEN RAISE EXCEPTION 'Subscription user mismatch'; END IF;
  SELECT count(*) INTO matches FROM public.workspaces WHERE stripe_subscription_id=p_subscription;
  IF matches>1 THEN RAISE EXCEPTION 'Ambiguous subscription workspace'; END IF;
  SELECT id INTO linked_workspace FROM public.workspaces WHERE stripe_subscription_id=p_subscription;
  INSERT INTO public.subscription_discrepancies(workspace_id,user_id,stripe_customer_id,stripe_subscription_id,stripe_status,db_status,discrepancy_type,details)
  VALUES(linked_workspace,p_user,p_customer,p_subscription,p_stripe_status,p_db_status,CASE WHEN p_stripe_status='not_found' THEN 'missing_in_stripe' ELSE 'status_mismatch' END,p_details)
  ON CONFLICT(stripe_subscription_id) WHERE resolved_at IS NULL DO NOTHING;
  GET DIAGNOSTICS inserted=ROW_COUNT; RETURN inserted=1;
END $$;

CREATE TABLE public.safe_cron_runs (
  handler text PRIMARY KEY CHECK(handler IN ('check-deadlines','cleanup-expired-videos','check-payment-alerts','send-weekly-summary','stripe-reconcile')),
  token uuid NOT NULL DEFAULT gen_random_uuid(), state text NOT NULL CHECK(state IN ('running','idle','uncertain')),updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.safe_cron_runs TO service_role;
REVOKE ALL ON public.safe_cron_runs FROM PUBLIC,anon,authenticated;
ALTER TABLE public.safe_cron_runs ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.claim_safe_cron(p_handler text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owned uuid;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.safe_cron_runs(handler,state) VALUES(p_handler,'running')
  ON CONFLICT(handler) DO UPDATE SET state='running',token=gen_random_uuid(),updated_at=now() WHERE safe_cron_runs.state='idle'
  RETURNING token INTO owned; RETURN owned;
END $$;
CREATE FUNCTION public.finish_safe_cron(p_handler text,p_token uuid,p_uncertain boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_uncertain IS NULL THEN RAISE EXCEPTION 'Missing result'; END IF;
  UPDATE public.safe_cron_runs SET state=CASE WHEN p_uncertain THEN 'uncertain' ELSE 'idle' END,updated_at=now() WHERE handler=p_handler AND token=p_token AND state='running';
  IF NOT FOUND THEN RAISE EXCEPTION 'Stale cron claim'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_stripe_discrepancy(text,text,text,uuid,text,jsonb),public.claim_safe_cron(text),public.finish_safe_cron(text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_discrepancy(text,text,text,uuid,text,jsonb),public.claim_safe_cron(text),public.finish_safe_cron(text,uuid,boolean) TO service_role;
COMMIT;
