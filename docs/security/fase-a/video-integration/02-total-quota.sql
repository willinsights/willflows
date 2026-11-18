BEGIN;
-- Preferred alternative ONLY after entitlement/baseline approval; no new limits.
-- Existing Stripe writer persists base+addon INTO storage_limit_bytes.
CREATE OR REPLACE FUNCTION public.sync_workspace_storage_from_video_versions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous bigint:=0;following bigint:=0;ws uuid;delta bigint;
BEGIN
  IF TG_OP<>'INSERT' THEN ws:=OLD.workspace_id;
    IF OLD.is_deleted IS NOT TRUE THEN previous:=coalesce(OLD.file_size_bytes,0)+coalesce(OLD.replacement_file_size_bytes,0); END IF;
  END IF;
  IF TG_OP<>'DELETE' THEN
    IF NEW.file_size_bytes<0 OR NEW.replacement_file_size_bytes<0 THEN RAISE EXCEPTION 'Invalid size'; END IF;
    IF TG_OP='UPDATE' AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN RAISE EXCEPTION 'Workspace immutable'; END IF;
    ws:=NEW.workspace_id;
    IF NEW.is_deleted IS NOT TRUE THEN following:=coalesce(NEW.file_size_bytes,0)+coalesce(NEW.replacement_file_size_bytes,0); END IF;
  END IF;
  IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM public.workspaces WHERE id=ws) THEN RETURN OLD; END IF;
  delta:=following-previous;
  UPDATE public.workspace_storage SET storage_used_bytes=storage_used_bytes+delta,last_calculated_at=now()
    WHERE workspace_id=ws AND storage_used_bytes+delta>=0 AND
    (delta<=0 OR storage_used_bytes+delta+coalesce((SELECT sum(reserved_bytes) FROM public.video_upload_operations WHERE workspace_id=ws AND state='issued' AND expires_at>now()),0)<=public.effective_video_quota(storage_limit_bytes,base_storage_bytes,extra_storage_bytes,'total'));
  IF NOT FOUND THEN RAISE EXCEPTION 'Quota missing, inconsistent or exhausted'; END IF;
  RETURN coalesce(NEW,OLD);
END $$;
COMMIT;