
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

-- RPC: check_storage_quota — single canonical quota check used by client and server
CREATE OR REPLACE FUNCTION public.check_storage_quota(
  p_workspace_id UUID,
  p_file_size_bytes BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used BIGINT := 0;
  v_limit BIGINT := 10737418240; -- 10GB default
  v_extra BIGINT := 0;
  v_total_limit BIGINT;
  v_available BIGINT;
BEGIN
  SELECT
    COALESCE(storage_used_bytes, 0),
    COALESCE(storage_limit_bytes, 10737418240),
    COALESCE(extra_storage_bytes, 0)
  INTO v_used, v_limit, v_extra
  FROM public.workspace_storage
  WHERE workspace_id = p_workspace_id;

  v_total_limit := v_limit + v_extra;
  v_available := GREATEST(0, v_total_limit - v_used);

  RETURN jsonb_build_object(
    'allowed', (v_used + COALESCE(p_file_size_bytes, 0)) <= v_total_limit,
    'used_bytes', v_used,
    'limit_bytes', v_total_limit,
    'available_bytes', v_available,
    'requested_bytes', COALESCE(p_file_size_bytes, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_storage_quota(UUID, BIGINT) TO authenticated, service_role;
