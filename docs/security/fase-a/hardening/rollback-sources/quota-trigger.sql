
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

