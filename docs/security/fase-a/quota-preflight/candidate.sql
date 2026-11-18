BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $guard$
BEGIN
 IF md5(pg_get_functiondef('public.check_storage_quota(uuid,bigint)'::regprocedure)) <> 'be51bf6cac9f628f6c155a3f2ef5aa36' THEN RAISE EXCEPTION 'FUNCTION_VERSION_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM public.workspace_storage WHERE storage_limit_bytes IS NULL OR storage_limit_bytes < 0 OR storage_limit_bytes <> coalesce(base_storage_bytes,0) + coalesce(extra_storage_bytes,0)) THEN RAISE EXCEPTION 'QUOTA_CONTRACT_NOT_VALIDATED'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.check_storage_quota(p_workspace_id uuid, p_file_size_bytes bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_used BIGINT := 0;
  v_limit BIGINT := 10737418240; -- 10GB default
  v_extra BIGINT := 0;
  v_total_limit BIGINT;
  v_available BIGINT;
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.is_workspace_member(auth.uid(), p_workspace_id) OR public.is_system_admin()) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  SELECT
    COALESCE(storage_used_bytes, 0),
    COALESCE(storage_limit_bytes, 10737418240),
    COALESCE(extra_storage_bytes, 0)
  INTO v_used, v_limit, v_extra
  FROM public.workspace_storage
  WHERE workspace_id = p_workspace_id;

  v_total_limit := v_limit;
  v_available := GREATEST(0, v_total_limit - v_used);

  RETURN jsonb_build_object(
    'allowed', (v_used + COALESCE(p_file_size_bytes, 0)) <= v_total_limit,
    'used_bytes', v_used,
    'limit_bytes', v_total_limit,
    'available_bytes', v_available,
    'requested_bytes', COALESCE(p_file_size_bytes, 0)
  );
END;
$function$;
COMMIT;
