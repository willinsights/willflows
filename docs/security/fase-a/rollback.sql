BEGIN;
-- Restore previous callback sources FIRST. Stop if a delivery is unresolved.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.weekly_summary_deliveries WHERE status IN ('reserved','uncertain')) THEN
    RAISE EXCEPTION 'Unresolved delivery: preserve ledger and reconcile before rollback';
  END IF;
END $$;
DROP FUNCTION public.mark_cleanup_videos_deleted(uuid,uuid[]);
DROP FUNCTION public.finish_weekly_summary_delivery(uuid,uuid,date,text);
DROP FUNCTION public.claim_weekly_summary_delivery(uuid,uuid,date);
-- Keep the private delivery ledger: dropping it would permit historical resends.
COMMIT;