BEGIN;
-- No historical discrepancy deleted. Stop callbacks and prove drainage first.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.safe_cron_runs) THEN RAISE EXCEPTION 'Keep durable claims; use forward recovery'; END IF;
END $$;
DROP FUNCTION public.record_stripe_discrepancy(text,text,text,uuid,text,jsonb),public.claim_safe_cron(text),public.finish_safe_cron(text,uuid,boolean);
DROP TABLE public.safe_cron_runs;
ALTER TABLE public.subscription_discrepancies DROP CONSTRAINT open_discrepancy_identity;
DROP INDEX public.subscription_discrepancies_one_open;
COMMIT;