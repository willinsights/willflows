SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.video_versions,public.workspace_storage IN SHARE ROW EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN
 IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.video_versions'::regclass,'public.workspace_storage'::regclass) AND relowner<>(SELECT oid FROM pg_roles WHERE rolname=current_user)) THEN RAISE EXCEPTION 'ACCOUNTING_EXECUTOR_MISMATCH'; END IF;
 IF NOT pg_try_advisory_xact_lock(742019,1) THEN RAISE EXCEPTION 'ACCOUNTING_WRITER_BUSY'; END IF;
 IF (SELECT storage_used_bytes FROM public.workspace_storage WHERE workspace_id='6ee9555c-1dbd-4503-8889-24f97226b202') IS DISTINCT FROM 92143699665::bigint THEN RAISE EXCEPTION 'REVIEWED_COUNTER_CHANGED'; END IF;
 IF (SELECT md5(string_agg(concat_ws('|',id::text,coalesce(file_size_bytes,0)::text,coalesce(replacement_file_size_bytes,0)::text,coalesce(r2_key,''),coalesce(replacement_r2_key,''),coalesce(cloudflare_stream_uid,''),coalesce(replacement_stream_uid,''),coalesce(project_id::text,''),coalesce(task_id::text,''),coalesce(is_deleted::text,'null')),E'\n' ORDER BY id)) FROM public.video_versions WHERE workspace_id='6ee9555c-1dbd-4503-8889-24f97226b202' AND is_deleted IS NOT TRUE) IS DISTINCT FROM 'b7ad3bc91f130f55293ebc34a2c21e42' THEN RAISE EXCEPTION 'PHYSICAL_INVENTORY_SNAPSHOT_CHANGED'; END IF;
 IF (SELECT count(*) FROM public.video_versions WHERE workspace_id='6ee9555c-1dbd-4503-8889-24f97226b202' AND is_deleted IS NOT TRUE)<>54 OR (SELECT sum(coalesce(file_size_bytes,0)+coalesce(replacement_file_size_bytes,0)) FROM public.video_versions WHERE workspace_id='6ee9555c-1dbd-4503-8889-24f97226b202' AND is_deleted IS NOT TRUE)<>16862211040 THEN RAISE EXCEPTION 'PHYSICAL_INVENTORY_TOTAL_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM public.workspace_storage s LEFT JOIN (SELECT workspace_id,sum(CASE WHEN is_deleted IS NOT TRUE THEN coalesce(file_size_bytes,0)+coalesce(replacement_file_size_bytes,0) ELSE 0 END) computed FROM public.video_versions GROUP BY workspace_id) v USING(workspace_id) WHERE s.workspace_id<>'6ee9555c-1dbd-4503-8889-24f97226b202' AND s.storage_used_bytes IS DISTINCT FROM coalesce(v.computed,0)) THEN RAISE EXCEPTION 'OTHER_COUNTER_DIVERGENCE'; END IF;
 IF EXISTS(SELECT 1 FROM public.video_versions v WHERE NOT EXISTS(SELECT 1 FROM public.workspace_storage s WHERE s.workspace_id=v.workspace_id)) THEN RAISE EXCEPTION 'MISSING_STORAGE_ROW'; END IF;
END $$;
CREATE TABLE public.video_counter_reconciliations (
 workspace_id uuid PRIMARY KEY,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by name NOT NULL DEFAULT current_user,
 previous_bytes bigint NOT NULL,corrected_bytes bigint NOT NULL,active_versions bigint NOT NULL,snapshot_hash text NOT NULL,
 physical_evidence_summary jsonb NOT NULL,previous_functions jsonb NOT NULL,previous_trigger text NOT NULL
);
GRANT SELECT ON public.video_counter_reconciliations TO service_role;
REVOKE ALL ON public.video_counter_reconciliations FROM PUBLIC,anon,authenticated;
ALTER TABLE public.video_counter_reconciliations ENABLE ROW LEVEL SECURITY;
-- Backfill the new reconciliation audit with the guarded existing counter and schema snapshot.
INSERT INTO public.video_counter_reconciliations(workspace_id,previous_bytes,corrected_bytes,active_versions,snapshot_hash,physical_evidence_summary,previous_functions,previous_trigger)
 SELECT workspace_id,storage_used_bytes,16862211040,54,'b7ad3bc91f130f55293ebc34a2c21e42',jsonb_build_object('r2_head_exact_matches',54,'stream_existing_references',54,'missing',0,'mismatched',0,'stable',true),
 jsonb_build_object('add_workspace_storage',pg_get_functiondef('public.add_workspace_storage(uuid,bigint)'::regprocedure),'sync_workspace_storage_from_video_versions',pg_get_functiondef('public.sync_workspace_storage_from_video_versions()'::regprocedure)),
 (SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.video_versions'::regclass AND tgname='trg_sync_storage_video_versions')
 FROM public.workspace_storage WHERE workspace_id='6ee9555c-1dbd-4503-8889-24f97226b202';
-- This correction is part of the additive, immutable reconciliation record above.
UPDATE public.workspace_storage s SET storage_used_bytes=r.corrected_bytes,last_calculated_at=now() FROM public.video_counter_reconciliations r WHERE s.workspace_id=r.workspace_id AND s.storage_used_bytes=r.previous_bytes;
CREATE FUNCTION public.lock_video_accounting() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM pg_advisory_xact_lock(742019,1);RETURN NULL;END $$;
REVOKE ALL ON FUNCTION public.lock_video_accounting() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER video_accounting_serial BEFORE INSERT OR UPDATE OR DELETE ON public.video_versions FOR EACH STATEMENT EXECUTE FUNCTION public.lock_video_accounting();
CREATE TRIGGER storage_accounting_serial BEFORE INSERT OR UPDATE OR DELETE ON public.workspace_storage FOR EACH STATEMENT EXECUTE FUNCTION public.lock_video_accounting();
CREATE FUNCTION public.guard_storage_counter() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF pg_trigger_depth()=1 AND ((TG_OP='UPDATE' AND NEW.storage_used_bytes IS DISTINCT FROM OLD.storage_used_bytes) OR (TG_OP='INSERT' AND NEW.storage_used_bytes<>0)) THEN
  IF TG_OP='UPDATE' THEN NEW.storage_used_bytes:=OLD.storage_used_bytes;ELSE NEW.storage_used_bytes:=0;END IF;
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_storage_counter() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_storage_counter BEFORE INSERT OR UPDATE ON public.workspace_storage FOR EACH ROW EXECUTE FUNCTION public.guard_storage_counter();
CREATE OR REPLACE FUNCTION public.add_workspace_storage(p_workspace_id uuid,p_bytes bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden';END IF;
 IF p_bytes IS NULL OR NOT EXISTS(SELECT 1 FROM public.workspace_storage WHERE workspace_id=p_workspace_id) THEN RAISE EXCEPTION 'Invalid legacy accounting request';END IF;
 -- Legacy callers already persisted their version: its trigger owns the bytes.
END $$;
REVOKE ALL ON FUNCTION public.add_workspace_storage(uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_workspace_storage(uuid,bigint) TO service_role;
CREATE OR REPLACE FUNCTION public.sync_workspace_storage_from_video_versions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous bigint:=0;following bigint:=0;ws uuid;delta bigint;
BEGIN
 IF TG_OP<>'INSERT' THEN ws:=OLD.workspace_id;IF OLD.is_deleted IS NOT TRUE THEN previous:=coalesce(OLD.file_size_bytes,0)+coalesce(OLD.replacement_file_size_bytes,0);END IF;END IF;
 IF TG_OP<>'DELETE' THEN
  IF NEW.file_size_bytes<0 OR NEW.replacement_file_size_bytes<0 THEN RAISE EXCEPTION 'Invalid size';END IF;
  IF TG_OP='UPDATE' AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN RAISE EXCEPTION 'Workspace immutable';END IF;
  ws:=NEW.workspace_id;IF NEW.is_deleted IS NOT TRUE THEN following:=coalesce(NEW.file_size_bytes,0)+coalesce(NEW.replacement_file_size_bytes,0);END IF;
 END IF;
 IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM public.workspaces WHERE id=ws) THEN RETURN OLD;END IF;
 delta:=following-previous;
 UPDATE public.workspace_storage SET storage_used_bytes=storage_used_bytes+delta,last_calculated_at=now() WHERE workspace_id=ws AND storage_used_bytes+delta>=0 AND (delta<=0 OR storage_used_bytes+delta<=storage_limit_bytes);
 IF NOT FOUND THEN RAISE EXCEPTION 'Quota missing, inconsistent or exhausted';END IF;
 RETURN coalesce(NEW,OLD);
END $$;
DROP TRIGGER trg_sync_storage_video_versions ON public.video_versions;
CREATE TRIGGER trg_sync_storage_video_versions AFTER INSERT OR UPDATE OR DELETE ON public.video_versions FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_storage_from_video_versions();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.workspace_storage s LEFT JOIN (SELECT workspace_id,sum(CASE WHEN is_deleted IS NOT TRUE THEN coalesce(file_size_bytes,0)+coalesce(replacement_file_size_bytes,0) ELSE 0 END) computed FROM public.video_versions GROUP BY workspace_id) v USING(workspace_id) WHERE s.storage_used_bytes IS DISTINCT FROM coalesce(v.computed,0)) THEN RAISE EXCEPTION 'FINAL_COUNTER_MISMATCH';END IF;
END $$;