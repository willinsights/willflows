BEGIN;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.video_upload_operations) OR EXISTS(SELECT 1 FROM public.video_asset_outbox) THEN
    RAISE EXCEPTION 'Durable operation/asset history requires forward recovery';
  END IF;
END $$;
DROP TRIGGER preserve_video_assets ON public.video_versions;
DROP FUNCTION public.preserve_video_assets();
DROP FUNCTION public.issue_video_operation(uuid,uuid,uuid,uuid,uuid,text,text,bigint,uuid),public.persist_video_operation(uuid,uuid,text),public.claim_video_submission(uuid),public.finish_video_submission(uuid,uuid,text);
DROP TABLE public.video_asset_outbox,public.video_upload_operations;
DROP FUNCTION public.effective_video_quota(bigint,bigint,bigint,text);
COMMIT;