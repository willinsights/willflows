BEGIN;
-- CANDIDATE ONLY. Requires upload-expand.sql in this same assembled transaction.
-- RPC writers set a transaction-local marker AFTER their service/context/ownership checks.
-- PostgREST legacy table writes cannot carry that marker across requests.
CREATE FUNCTION public.fence_managed_video_generation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE marker text:=current_setting('willflow.video_operation',true);
BEGIN
 IF EXISTS(SELECT 1 FROM public.video_upload_operations WHERE version_id=OLD.id AND state<>'issued')
   AND (ROW(NEW.workspace_id,NEW.r2_key,NEW.file_size_bytes,NEW.uploaded_by,NEW.cloudflare_stream_uid,
       NEW.replacement_r2_key,NEW.replacement_file_size_bytes,NEW.replacement_stream_uid)
     IS DISTINCT FROM ROW(OLD.workspace_id,OLD.r2_key,OLD.file_size_bytes,OLD.uploaded_by,OLD.cloudflare_stream_uid,
       OLD.replacement_r2_key,OLD.replacement_file_size_bytes,OLD.replacement_stream_uid)) THEN
   IF NOT EXISTS(SELECT 1 FROM public.video_upload_operations
     WHERE id::text=marker AND version_id=NEW.id AND workspace_id=NEW.workspace_id
       AND object_key=NEW.r2_key AND user_id=NEW.uploaded_by AND file_size=NEW.file_size_bytes
       AND state IN ('persisted','submitting','uncertain','processing')) THEN
     RAISE EXCEPTION 'MANAGED_VIDEO_GENERATION_FENCED';
   END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fence_managed_video_generation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER managed_video_generation BEFORE UPDATE ON public.video_versions
 FOR EACH ROW EXECUTE FUNCTION public.fence_managed_video_generation();
-- NOT a provider-deletion fence, lifecycle fence or complete activation bundle.
COMMIT;