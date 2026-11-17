BEGIN;
-- Only after ALL callbacks/writers paused and drained. Never restore old sending code.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.push_delivery_claims) OR EXISTS(SELECT 1 FROM public.safe_cron_runs WHERE state<>'idle') THEN
   RAISE EXCEPTION 'Delivery/cron history requires protected forward recovery';
 END IF;
 RAISE EXCEPTION 'Quota semantics changed: explicit baseline reconciliation and captured definitions required; automatic rollback refused';
END $$;
COMMIT;