BEGIN;
-- Keep the checked baseline stable until the transaction commits.
LOCK TABLE public.video_versions, public.workspace_storage, public.video_upload_operations, public.video_asset_outbox IN SHARE ROW EXCLUSIVE MODE NOWAIT;
-- Atomic rollback only before any durable operation or asset outbox is used.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.video_upload_operations) OR EXISTS(SELECT 1 FROM public.video_asset_outbox) THEN
    RAISE EXCEPTION 'Durable operation/asset history requires forward recovery';
  END IF;
END $$;
DROP TRIGGER preserve_issued_workspace ON public.workspaces;
DROP TRIGGER preserve_issued_project ON public.projects;
DROP TRIGGER preserve_issued_task ON public.tasks;
DROP FUNCTION public.preserve_issued_assets_on_parent_delete(),public.abort_video_operation(uuid,uuid),public.recover_video_submission(uuid,uuid,text);
DROP TRIGGER preserve_video_assets ON public.video_versions;
DROP FUNCTION public.preserve_video_assets();
DROP FUNCTION public.expire_video_issued_operations(integer);
DROP FUNCTION public.issue_video_operation(uuid,uuid,uuid,uuid,uuid,text,text,bigint,uuid),public.persist_video_operation(uuid,uuid,text),public.claim_video_submission(uuid),public.finish_video_submission(uuid,uuid,text);
DROP TABLE public.video_asset_outbox,public.video_upload_operations;
DROP FUNCTION public.effective_video_quota(bigint,bigint,bigint,text);
DO $$
BEGIN
  IF to_regclass('public.video_upload_operations') IS NOT NULL OR
     to_regclass('public.video_asset_outbox') IS NOT NULL THEN
    RAISE EXCEPTION 'Rollback order invalid: upload ledger still installed';
  END IF;
  -- The old trigger is not replacement-aware and would silently corrupt
  -- counters if non-zero replacement bytes remain.
  IF EXISTS(SELECT 1 FROM public.video_versions
            WHERE coalesce(replacement_file_size_bytes,0)<>0) THEN
    RAISE EXCEPTION 'Legacy trigger cannot account for replacements';
  END IF;
END $$;
DROP TRIGGER guard_storage_counter ON public.workspace_storage;
DROP TRIGGER video_accounting_serial ON public.video_versions;
DROP TRIGGER storage_accounting_serial ON public.workspace_storage;
-- Trigger: keep workspace_storage.storage_used_bytes in sync with video_versions
CREATE OR REPLACE FUNCTION public.sync_workspace_storage_from_video_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta BIGINT := 0;
  v_workspace UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_delta := COALESCE(NEW.file_size_bytes, 0);
    v_workspace := NEW.workspace_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_delta := -COALESCE(OLD.file_size_bytes, 0);
    v_workspace := OLD.workspace_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_delta := COALESCE(NEW.file_size_bytes, 0) - COALESCE(OLD.file_size_bytes, 0);
    v_workspace := NEW.workspace_id;
  END IF;

  IF v_workspace IS NULL OR v_delta = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.workspace_storage
  SET
    storage_used_bytes = GREATEST(0, COALESCE(storage_used_bytes, 0) + v_delta),
    last_calculated_at = NOW()
  WHERE workspace_id = v_workspace;

  -- Ensure a row exists for new workspaces
  IF NOT FOUND THEN
    INSERT INTO public.workspace_storage (workspace_id, storage_used_bytes, storage_limit_bytes)
    VALUES (v_workspace, GREATEST(0, v_delta), 10737418240)
    ON CONFLICT (workspace_id) DO NOTHING;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_storage_video_versions ON public.video_versions;
CREATE TRIGGER trg_sync_storage_video_versions
AFTER INSERT OR UPDATE OF file_size_bytes OR DELETE ON public.video_versions
FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_storage_from_video_versions();
DROP FUNCTION public.guard_storage_counter();
DROP FUNCTION public.lock_video_accounting();
COMMIT;
