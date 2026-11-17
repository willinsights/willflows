BEGIN;
-- Separate candidate, requires prior phase-A schema. NOT a production migration.
CREATE FUNCTION public.lock_video_accounting() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM pg_advisory_xact_lock(742019,1); RETURN NULL; END $$;
REVOKE ALL ON FUNCTION public.lock_video_accounting() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER video_accounting_serial BEFORE INSERT OR UPDATE OR DELETE ON public.video_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_video_accounting();
CREATE TRIGGER storage_accounting_serial BEFORE INSERT OR UPDATE OR DELETE ON public.workspace_storage
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_video_accounting();

CREATE FUNCTION public.guard_storage_counter() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF pg_trigger_depth()=1 AND
    ((TG_OP='UPDATE' AND NEW.storage_used_bytes IS DISTINCT FROM OLD.storage_used_bytes)
      OR (TG_OP='INSERT' AND NEW.storage_used_bytes<>0)) THEN
    RAISE EXCEPTION 'Counter is owned by video accounting';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_storage_counter() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_storage_counter BEFORE INSERT OR UPDATE ON public.workspace_storage
FOR EACH ROW EXECUTE FUNCTION public.guard_storage_counter();

CREATE OR REPLACE FUNCTION public.sync_workspace_storage_from_video_versions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous bigint:=0; following bigint:=0; ws uuid; delta bigint;
BEGIN
  IF TG_OP<>'INSERT' THEN
    ws:=OLD.workspace_id;
    IF OLD.is_deleted IS NOT TRUE THEN previous:=coalesce(OLD.file_size_bytes,0)+coalesce(OLD.replacement_file_size_bytes,0); END IF;
  END IF;
  IF TG_OP<>'DELETE' THEN
    IF NEW.file_size_bytes<0 OR NEW.replacement_file_size_bytes<0 THEN RAISE EXCEPTION 'Invalid size'; END IF;
    IF TG_OP='UPDATE' AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN RAISE EXCEPTION 'Workspace immutable'; END IF;
    ws:=NEW.workspace_id;
    IF NEW.is_deleted IS NOT TRUE THEN following:=coalesce(NEW.file_size_bytes,0)+coalesce(NEW.replacement_file_size_bytes,0); END IF;
  END IF;
  delta:=following-previous;
  UPDATE public.workspace_storage SET storage_used_bytes=storage_used_bytes+delta,last_calculated_at=now()
    WHERE workspace_id=ws AND storage_used_bytes+delta>=0
      AND (delta<=0 OR storage_used_bytes+delta<=storage_limit_bytes+coalesce(extra_storage_bytes,0));
  IF NOT FOUND THEN RAISE EXCEPTION 'Quota missing, inconsistent or exhausted'; END IF;
  RETURN coalesce(NEW,OLD);
END $$;
DROP TRIGGER trg_sync_storage_video_versions ON public.video_versions;
CREATE TRIGGER trg_sync_storage_video_versions AFTER INSERT OR UPDATE OR DELETE ON public.video_versions
FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_storage_from_video_versions();

CREATE OR REPLACE FUNCTION public.mark_cleanup_videos_deleted(p_workspace uuid,p_ids uuid[])
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE freed bigint;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_workspace IS NULL OR p_ids IS NULL OR cardinality(p_ids) NOT BETWEEN 1 AND 300 OR array_position(p_ids,NULL) IS NOT NULL THEN RAISE EXCEPTION 'Invalid batch'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  IF (SELECT count(*) FROM public.video_versions WHERE workspace_id=p_workspace AND id=ANY(p_ids))<>(SELECT count(DISTINCT id) FROM unnest(p_ids) ids(id)) THEN RAISE EXCEPTION 'Identity mismatch'; END IF;
  WITH changed AS (UPDATE public.video_versions SET is_deleted=true,deleted_at=now()
    WHERE workspace_id=p_workspace AND id=ANY(p_ids) AND is_deleted IS NOT TRUE
    RETURNING coalesce(file_size_bytes,0)+coalesce(replacement_file_size_bytes,0) bytes)
  SELECT coalesce(sum(bytes),0) INTO freed FROM changed;
  RETURN freed; -- trigger owns the debit, never subtract again here
END $$;

CREATE TABLE public.push_delivery_claims (
  queue_id uuid PRIMARY KEY, token uuid NOT NULL DEFAULT gen_random_uuid(),
  state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','retry','uncertain','sent','skipped','failed')),
  attempts integer NOT NULL DEFAULT 1 CHECK(attempts BETWEEN 1 AND 3),
  retry_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.push_delivery_claims TO service_role;
REVOKE ALL ON public.push_delivery_claims FROM PUBLIC,anon,authenticated;
ALTER TABLE public.push_delivery_claims ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.claim_push_delivery(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owned uuid;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.push_notification_queue WHERE id=p_id AND status='pending' AND attempts<3) THEN RETURN NULL; END IF;
  INSERT INTO public.push_delivery_claims(queue_id,attempts)
  SELECT p_id,attempts+1 FROM public.push_notification_queue WHERE id=p_id
  ON CONFLICT(queue_id) DO UPDATE SET state='reserved',token=gen_random_uuid(),attempts=push_delivery_claims.attempts+1,updated_at=now()
    WHERE push_delivery_claims.state='retry' AND push_delivery_claims.retry_at<=now() AND push_delivery_claims.attempts<3
  RETURNING token INTO owned;
  RETURN owned;
END $$;
CREATE FUNCTION public.finish_push_delivery(p_id uuid,p_token uuid,p_state text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_state IS NULL OR p_state NOT IN ('retry','uncertain','sent','skipped','failed') THEN RAISE EXCEPTION 'Invalid result'; END IF;
  UPDATE public.push_delivery_claims SET state=CASE WHEN p_state='retry' AND attempts>=3 THEN 'failed' ELSE p_state END,
    retry_at=CASE WHEN p_state='retry' THEN now()+interval '5 minutes' END,updated_at=now()
    WHERE queue_id=p_id AND token=p_token AND state='reserved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Stale claim'; END IF;
  UPDATE public.push_notification_queue SET status=CASE WHEN p_state='retry' AND (SELECT attempts FROM public.push_delivery_claims WHERE queue_id=p_id)>=3 THEN 'failed' WHEN p_state IN ('retry','uncertain') THEN 'pending' ELSE p_state END,
    attempts=(SELECT attempts FROM public.push_delivery_claims WHERE queue_id=p_id),processed_at=CASE WHEN p_state IN ('sent','failed','skipped') THEN now() END
    WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Queue row missing'; END IF;
END $$;

-- Abort rather than silently deduplicate existing records.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.subscription_discrepancies WHERE resolved_at IS NULL AND stripe_subscription_id IS NULL)
    OR EXISTS(SELECT 1 FROM public.subscription_discrepancies WHERE resolved_at IS NULL GROUP BY stripe_subscription_id HAVING count(*)>1)
  THEN RAISE EXCEPTION 'Existing open discrepancy identities need authorised review'; END IF;
END $$;
CREATE UNIQUE INDEX subscription_discrepancies_one_open ON public.subscription_discrepancies(stripe_subscription_id) WHERE resolved_at IS NULL;
ALTER TABLE public.subscription_discrepancies ADD CONSTRAINT open_discrepancy_identity CHECK(resolved_at IS NOT NULL OR stripe_subscription_id IS NOT NULL) NOT VALID;
CREATE FUNCTION public.record_stripe_discrepancy(p_subscription text,p_stripe_status text,p_db_status text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted integer;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_subscription IS NULL OR length(p_subscription) NOT BETWEEN 1 AND 255 OR p_stripe_status IS NULL OR p_db_status IS NULL THEN RAISE EXCEPTION 'Invalid observation'; END IF;
  INSERT INTO public.subscription_discrepancies(stripe_subscription_id,stripe_status,db_status,discrepancy_type,details)
  VALUES(p_subscription,p_stripe_status,p_db_status,CASE WHEN p_stripe_status='not_found' THEN 'missing_in_stripe' ELSE 'status_mismatch' END,'{}'::jsonb)
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
REVOKE ALL ON FUNCTION public.claim_push_delivery(uuid),public.finish_push_delivery(uuid,uuid,text),public.record_stripe_discrepancy(text,text,text),public.claim_safe_cron(text),public.finish_safe_cron(text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_delivery(uuid),public.finish_push_delivery(uuid,uuid,text),public.record_stripe_discrepancy(text,text,text),public.claim_safe_cron(text),public.finish_safe_cron(text,uuid,boolean) TO service_role;
COMMIT;