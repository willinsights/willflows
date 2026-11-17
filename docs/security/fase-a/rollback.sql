BEGIN;
-- Disable callbacks and drain in-flight work FIRST. Historical sources ignore the ledger.
-- Never restore the previous weekly callback after any reservation has existed.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.weekly_summary_deliveries) THEN
    RAISE EXCEPTION 'Delivery history exists: retain protected callback and ledger';
  END IF;
END $$;
DROP FUNCTION public.mark_cleanup_videos_deleted(uuid,uuid[]);
DROP FUNCTION public.finish_weekly_summary_delivery(uuid,uuid,date,text);
DROP FUNCTION public.claim_weekly_summary_delivery(uuid,uuid,date);
-- Keep the private delivery ledger: dropping it would permit historical resends.
COMMIT;