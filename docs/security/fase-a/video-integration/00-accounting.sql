BEGIN;
-- Separate candidate, requires prior phase-A schema. NOT a production migration.
-- Never install the new counter ownership model over an unreconciled
-- legacy drift. One live workspace currently differs; operator must review
-- and approve its exact correction in a separate, audited transaction.
DO $integrity$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.workspace_storage s
   LEFT JOIN (
      SELECT workspace_id,COALESCE(SUM(
        CASE WHEN is_deleted IS NOT TRUE THEN
          COALESCE(file_size_bytes,0)+COALESCE(replacement_file_size_bytes,0)
          ELSE 0 END
      ),0) AS computed
      FROM public.video_versions GROUP BY workspace_id
   ) v ON v.workspace_id=s.workspace_id
   WHERE s.storage_used_bytes IS DISTINCT FROM COALESCE(v.computed,0)
 ) THEN RAISE EXCEPTION 'VIDEO_ACCOUNTING_BASELINE_MISMATCH: reconcile before migration'; END IF;
END $integrity$;
CREATE FUNCTION public.lock_video_accounting() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM pg_advisory_xact_lock(742019,1); RETURN NULL; END $$;
REVOKE ALL ON FUNCTION public.lock_video_accounting() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER video_accounting_serial BEFORE INSERT OR UPDATE OR DELETE ON public.video_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_video_accounting();
CREATE TRIGGER storage_accounting_serial BEFORE INSERT OR UPDATE OR DELETE ON public.workspace_storage
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_video_accounting();

CREATE FUNCTION public.guard_storage_counter() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF pg_trigger_depth()=1 AND
    ((TG_OP='UPDATE' AND NEW.storage_used_bytes IS DISTINCT FROM OLD.storage_used_bytes)
      OR (TG_OP='INSERT' AND NEW.storage_used_bytes<>0)) THEN
    RAISE EXCEPTION 'Counter is owned by video accounting';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_storage_counter() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_storage_counter BEFORE INSERT OR UPDATE ON public.workspace_storage
FOR EACH ROW EXECUTE FUNCTION public.guard_storage_counter();

CREATE OR REPLACE FUNCTION public.sync_workspace_storage_from_video_versions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous bigint:=0; following bigint:=0; ws uuid; delta bigint;
BEGIN
  IF TG_OP<>'INSERT' THEN
    ws:=OLD.workspace_id;
    IF OLD.is_deleted IS NOT TRUE THEN previous:=coalesce(OLD.file_size_bytes,0)+coalesce(OLD.replacement_file_size_bytes,0); END IF;
  END IF;
  IF TG_OP<>'DELETE' THEN
    IF NEW.file_size_bytes<0 OR NEW.replacement_file_size_bytes<0 THEN RAISE EXCEPTION 'Invalid size'; END IF;
    IF TG_OP='UPDATE' AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN RAISE EXCEPTION 'Workspace immutable'; END IF;
    ws:=NEW.workspace_id;
    IF NEW.is_deleted IS NOT TRUE THEN following:=coalesce(NEW.file_size_bytes,0)+coalesce(NEW.replacement_file_size_bytes,0); END IF;
  END IF;
  delta:=following-previous;
  -- Parent workspace DELETE may cascade storage first. Never mask missing quota
  -- for a live workspace or an ordinary version deletion.
  IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM public.workspaces WHERE id=ws) THEN
    RETURN OLD;
  END IF;
  UPDATE public.workspace_storage SET storage_used_bytes=storage_used_bytes+delta,last_calculated_at=now()
    WHERE workspace_id=ws AND storage_used_bytes+delta>=0
      AND (delta<=0 OR storage_used_bytes+delta<=storage_limit_bytes);
  IF NOT FOUND THEN RAISE EXCEPTION 'Quota missing, inconsistent or exhausted'; END IF;
  RETURN coalesce(NEW,OLD);
END $$;
DROP TRIGGER trg_sync_storage_video_versions ON public.video_versions;
CREATE TRIGGER trg_sync_storage_video_versions AFTER INSERT OR UPDATE OR DELETE ON public.video_versions
FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_storage_from_video_versions();

COMMIT;
