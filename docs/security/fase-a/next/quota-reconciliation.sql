BEGIN;
-- Preparation only. Requires total contract, all writers drained and authoritative
-- baseline approval. SET LOCAL willflow.reconcile_workspace/expected/target to
-- individually approved values in a separately hashed production package.
DO $$
DECLARE ws uuid;expected bigint;target bigint;actual bigint;
BEGIN
  ws:=nullif(current_setting('willflow.reconcile_workspace',true),'')::uuid;
  expected:=nullif(current_setting('willflow.reconcile_expected',true),'')::bigint;
  target:=nullif(current_setting('willflow.reconcile_target',true),'')::bigint;
  IF ws IS NULL OR expected IS NULL OR target IS NULL OR target<0 THEN RAISE EXCEPTION 'Explicit approved baseline required'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  SELECT coalesce(sum(coalesce(file_size_bytes,0)+coalesce(replacement_file_size_bytes,0)),0) INTO actual FROM public.video_versions WHERE workspace_id=ws AND is_deleted IS NOT TRUE;
  IF actual<>target THEN RAISE EXCEPTION 'Video baseline changed'; END IF;
  -- Direct counter guard deliberately forbids adjustment after hardening.
  -- This template refuses execution then; do NOT disable triggers to bypass it.
  UPDATE public.workspace_storage SET storage_used_bytes=target,last_calculated_at=now() WHERE workspace_id=ws AND storage_used_bytes=expected;
  IF NOT FOUND THEN RAISE EXCEPTION 'Counter baseline changed'; END IF;
END $$;
COMMIT;