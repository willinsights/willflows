BEGIN;
-- ISOLATED CANDIDATE; requires phase-A + hardening accounting, not deployable alone.
CREATE FUNCTION public.effective_video_quota(p_total bigint,p_base bigint,p_extra bigint,p_contract text DEFAULT 'total')
RETURNS bigint LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
BEGIN
  IF p_contract IS NULL OR p_contract NOT IN ('total','base_extra') THEN RAISE EXCEPTION 'Invalid quota contract'; END IF;
  -- Existing workspaces may not have populated base/extra columns. The
  -- contractual total is authoritative and must not be increased twice.
  IF p_contract='total' THEN
    IF p_total IS NULL OR p_total<0 OR (p_base IS NOT NULL AND p_base<0) OR (p_extra IS NOT NULL AND p_extra<0) THEN RAISE EXCEPTION 'Invalid quota total'; END IF;
    RETURN p_total;
  END IF;
  IF p_base IS NULL OR p_extra IS NULL OR least(p_base,p_extra)<0 OR p_base>9223372036854775807-p_extra
    THEN RAISE EXCEPTION 'Invalid additive quota'; END IF;
  RETURN p_base+p_extra;
END $$;
REVOKE ALL ON FUNCTION public.effective_video_quota(bigint,bigint,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.effective_video_quota(bigint,bigint,bigint,text) TO service_role;

CREATE TABLE public.video_upload_operations (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL, project_id uuid NOT NULL,task_id uuid,user_id uuid NOT NULL,
  object_key text NOT NULL UNIQUE,file_name text NOT NULL,file_size bigint NOT NULL CHECK(file_size>0),
  replace_id uuid,expected_key text,expires_at timestamptz NOT NULL,reserved_bytes bigint NOT NULL DEFAULT 0 CHECK(reserved_bytes>=0),
  version_id uuid NOT NULL DEFAULT gen_random_uuid(),state text NOT NULL DEFAULT 'issued' CHECK(state IN ('issued','persisted','submitting','processing','uncertain','aborted')),
  submission_token uuid,created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.video_upload_operations TO service_role;
REVOKE ALL ON public.video_upload_operations FROM PUBLIC,anon,authenticated;
ALTER TABLE public.video_upload_operations ENABLE ROW LEVEL SECURITY;
-- No cascading FKs: idempotency and asset evidence must survive parent removal.
CREATE TABLE public.video_asset_outbox (
  version_id uuid NOT NULL,workspace_id uuid NOT NULL,provider text NOT NULL CHECK(provider IN ('r2','stream')),
  asset_key text NOT NULL,state text NOT NULL DEFAULT 'held' CHECK(state IN ('held','released','uncertain','done')),
  reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(workspace_id,provider,asset_key)
);
GRANT SELECT,INSERT ON public.video_asset_outbox TO service_role;
REVOKE ALL ON public.video_asset_outbox FROM PUBLIC,anon,authenticated;
ALTER TABLE public.video_asset_outbox ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.preserve_video_assets() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE asset record;
BEGIN
  FOR asset IN SELECT * FROM (VALUES
    ('r2',OLD.r2_key),('r2',OLD.replacement_r2_key),
    ('stream',OLD.cloudflare_stream_uid),('stream',OLD.replacement_stream_uid)) assets(provider,key)
  LOOP
    IF asset.key IS NOT NULL AND (TG_OP='DELETE' OR
      (asset.provider='r2' AND asset.key IS DISTINCT FROM NEW.r2_key AND asset.key IS DISTINCT FROM NEW.replacement_r2_key) OR
      (asset.provider='stream' AND asset.key IS DISTINCT FROM NEW.cloudflare_stream_uid AND asset.key IS DISTINCT FROM NEW.replacement_stream_uid)) THEN
      INSERT INTO public.video_asset_outbox(version_id,workspace_id,provider,asset_key,reason)
        VALUES(OLD.id,OLD.workspace_id,asset.provider,asset.key,TG_OP) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.preserve_video_assets() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER preserve_video_assets BEFORE DELETE OR UPDATE OF r2_key,replacement_r2_key,cloudflare_stream_uid,replacement_stream_uid ON public.video_versions
FOR EACH ROW EXECUTE FUNCTION public.preserve_video_assets();

CREATE FUNCTION public.issue_video_operation(p_id uuid,p_ws uuid,p_project uuid,p_task uuid,p_user uuid,p_key text,p_name text,p_size bigint,p_replace uuid DEFAULT NULL)
RETURNS public.video_upload_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.video_upload_operations; old_key text; old_bytes bigint:=0; available bigint; reserve bigint; existing public.video_versions;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_id IS NULL OR p_user IS NULL OR p_ws IS NULL OR p_project IS NULL OR p_size IS NULL OR p_size<=0 OR p_name IS NULL OR length(p_name) NOT BETWEEN 1 AND 255 OR p_key IS NULL OR NOT (p_key LIKE p_ws::text||'/'||p_project::text||'/'||coalesce(p_task::text,'project')||'/'||p_user::text||'/%' OR (array_length(string_to_array(p_key,'/'),1)=3 AND split_part(p_key,'/',1)=p_ws::text AND ((p_task IS NOT NULL AND split_part(p_key,'/',2)=p_task::text) OR (p_task IS NULL AND split_part(p_key,'/',2) IN (p_project::text,'undefined','null'))))) OR p_key LIKE '%..%' OR p_key LIKE '%//%' THEN RAISE EXCEPTION 'Invalid issuance'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  IF NOT EXISTS(SELECT 1 FROM public.projects WHERE id=p_project AND workspace_id=p_ws) OR
    (p_task IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tasks WHERE id=p_task AND project_id=p_project)) OR
    NOT EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id=p_ws AND user_id=p_user AND is_active=true AND role::text IN ('admin','edicao')) THEN RAISE EXCEPTION 'Context forbidden'; END IF;
  SELECT * INTO op FROM public.video_upload_operations WHERE id=p_id;
  IF FOUND THEN
    IF ROW(op.workspace_id,op.project_id,op.task_id,op.user_id,op.object_key,op.file_name,op.file_size,op.replace_id)
      IS DISTINCT FROM ROW(p_ws,p_project,p_task,p_user,p_key,p_name,p_size,p_replace) THEN RAISE EXCEPTION 'Idempotency mismatch'; END IF;
    RETURN op;
  END IF;
  IF p_replace IS NOT NULL THEN
    SELECT r2_key,coalesce(file_size_bytes,0)+coalesce(replacement_file_size_bytes,0) INTO old_key,old_bytes FROM public.video_versions WHERE id=p_replace AND workspace_id=p_ws AND coalesce(project_id,(SELECT project_id FROM public.tasks WHERE id=video_versions.task_id))=p_project AND task_id IS NOT DISTINCT FROM p_task AND is_deleted IS NOT TRUE FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Replacement mismatch'; END IF;
  END IF;
  SELECT * INTO existing FROM public.video_versions WHERE r2_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF existing.workspace_id IS DISTINCT FROM p_ws OR coalesce(existing.project_id,(SELECT project_id FROM public.tasks WHERE id=existing.task_id)) IS DISTINCT FROM p_project OR existing.task_id IS DISTINCT FROM p_task OR existing.uploaded_by IS DISTINCT FROM p_user OR existing.is_deleted IS TRUE OR existing.file_size_bytes IS DISTINCT FROM p_size OR existing.file_name IS DISTINCT FROM p_name OR (p_replace IS NOT NULL AND existing.id<>p_replace) THEN RAISE EXCEPTION 'Legacy persisted identity mismatch'; END IF;
    INSERT INTO public.video_upload_operations(id,workspace_id,project_id,task_id,user_id,object_key,file_name,file_size,replace_id,expires_at,version_id,state)
      VALUES(p_id,p_ws,p_project,p_task,p_user,p_key,p_name,p_size,p_replace,now()+interval '4 hours',existing.id,CASE WHEN existing.cloudflare_stream_uid IS NOT NULL THEN 'processing' ELSE 'uncertain' END) RETURNING * INTO op;
    RETURN op;
  END IF;
  reserve:=greatest(0,p_size-old_bytes);
  SELECT storage_limit_bytes-storage_used_bytes-coalesce((SELECT sum(reserved_bytes) FROM public.video_upload_operations WHERE workspace_id=p_ws AND state='issued' AND expires_at>now()),0) INTO available FROM public.workspace_storage WHERE workspace_id=p_ws;
  IF available IS NULL OR reserve>available THEN RAISE EXCEPTION 'Quota unavailable'; END IF;
  INSERT INTO public.video_upload_operations(id,workspace_id,project_id,task_id,user_id,object_key,file_name,file_size,replace_id,expected_key,expires_at,version_id,reserved_bytes)
    VALUES(p_id,p_ws,p_project,p_task,p_user,p_key,p_name,p_size,p_replace,old_key,now()+interval '4 hours',coalesce(p_replace,gen_random_uuid()),reserve) RETURNING * INTO op;
  RETURN op;
END $$;

CREATE FUNCTION public.persist_video_operation(p_id uuid,p_user uuid,p_bucket text)
RETURNS public.video_upload_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.video_upload_operations; seq integer; target public.video_versions;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  SELECT * INTO op FROM public.video_upload_operations WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR p_user IS NULL OR op.user_id<>p_user OR p_bucket IS NULL OR p_bucket !~ '^[a-zA-Z0-9_-]+$' THEN RAISE EXCEPTION 'Operation mismatch'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id=op.workspace_id AND user_id=p_user AND is_active AND role::text IN ('admin','edicao')) THEN RAISE EXCEPTION 'Membership changed'; END IF;
  IF op.state='aborted' THEN RAISE EXCEPTION 'Upload aborted'; END IF;
  IF op.state<>'issued' THEN
    IF NOT EXISTS(SELECT 1 FROM public.video_versions WHERE id=op.version_id AND r2_key=op.object_key AND is_deleted IS NOT TRUE) THEN RAISE EXCEPTION 'Result removed or superseded'; END IF;
    RETURN op;
  END IF;
  IF op.expires_at<=now() THEN RAISE EXCEPTION 'Upload expired'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.projects WHERE id=op.project_id AND workspace_id=op.workspace_id) OR
    (op.task_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tasks WHERE id=op.task_id AND project_id=op.project_id)) THEN RAISE EXCEPTION 'Context removed'; END IF;
  -- Release reservation in the SAME transaction as version accounting; rollback restores it.
  UPDATE public.video_upload_operations SET state='persisted' WHERE id=p_id;
  IF op.replace_id IS NOT NULL THEN
    SELECT * INTO target FROM public.video_versions WHERE id=op.replace_id FOR UPDATE;
    IF NOT FOUND OR target.is_deleted IS TRUE OR target.r2_key IS DISTINCT FROM op.expected_key OR
      ROW(target.workspace_id,coalesce(target.project_id,(SELECT project_id FROM public.tasks WHERE id=target.task_id)),target.task_id) IS DISTINCT FROM ROW(op.workspace_id,op.project_id,op.task_id) THEN RAISE EXCEPTION 'Stale replacement'; END IF;
    UPDATE public.video_versions SET project_id=op.project_id,r2_key=op.object_key,file_path='r2://'||p_bucket||'/'||op.object_key,file_name=op.file_name,file_size_bytes=op.file_size,uploaded_by=op.user_id,
      stream_status='pending',cloudflare_stream_uid=NULL,stream_playback_url=NULL,thumbnail_path=NULL,duration_seconds=NULL,replacement_playback_url=NULL,replacement_status=NULL,replacement_file_name=NULL,replacement_thumbnail_path=NULL,replaced_at=now(),replacement_r2_key=NULL,replacement_stream_uid=NULL,replacement_file_size_bytes=NULL
      WHERE id=op.replace_id;
    -- Preserve version ID and number/comment history; no implicit renumbering.
  ELSE
    SELECT coalesce(max(version_number),0)+1 INTO seq FROM public.video_versions WHERE workspace_id=op.workspace_id AND coalesce(project_id,(SELECT project_id FROM public.tasks WHERE id=video_versions.task_id))=op.project_id AND task_id IS NOT DISTINCT FROM op.task_id;
    INSERT INTO public.video_versions(id,workspace_id,project_id,task_id,version_number,r2_key,file_path,file_name,file_size_bytes,uploaded_by,stream_status)
      VALUES(op.version_id,op.workspace_id,op.project_id,op.task_id,seq,op.object_key,'r2://'||p_bucket||'/'||op.object_key,op.file_name,op.file_size,op.user_id,'pending');
  END IF;
  UPDATE public.video_upload_operations SET state='persisted' WHERE id=p_id RETURNING * INTO op;
  RETURN op;
END $$;

CREATE FUNCTION public.claim_video_submission(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE token uuid;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  UPDATE public.video_upload_operations op SET state='submitting',submission_token=gen_random_uuid()
    WHERE id=p_id AND state='persisted' AND EXISTS(SELECT 1 FROM public.video_versions v WHERE v.id=op.version_id AND v.r2_key=op.object_key AND v.is_deleted IS NOT TRUE)
    RETURNING submission_token INTO token;
  RETURN token;
END $$;
CREATE FUNCTION public.finish_video_submission(p_id uuid,p_token uuid,p_uid text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.video_upload_operations;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  SELECT * INTO op FROM public.video_upload_operations WHERE id=p_id AND submission_token=p_token AND state='submitting' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stale submission'; END IF;
  IF p_uid IS NULL THEN UPDATE public.video_upload_operations SET state='uncertain' WHERE id=p_id; RETURN; END IF;
  IF length(p_uid) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Invalid provider identity'; END IF;
  UPDATE public.video_versions SET cloudflare_stream_uid=p_uid,stream_status='processing' WHERE id=op.version_id AND r2_key=op.object_key AND is_deleted IS NOT TRUE;
  IF NOT FOUND THEN
    INSERT INTO public.video_asset_outbox VALUES(op.version_id,op.workspace_id,'stream',p_uid,'held','late_submission',now()) ON CONFLICT DO NOTHING;
    UPDATE public.video_upload_operations SET state='uncertain' WHERE id=p_id;
  ELSE UPDATE public.video_upload_operations SET state='processing' WHERE id=p_id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.issue_video_operation(uuid,uuid,uuid,uuid,uuid,text,text,bigint,uuid),public.persist_video_operation(uuid,uuid,text),public.claim_video_submission(uuid),public.finish_video_submission(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_video_operation(uuid,uuid,uuid,uuid,uuid,text,text,bigint,uuid),public.persist_video_operation(uuid,uuid,text),public.claim_video_submission(uuid),public.finish_video_submission(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.abort_video_operation(p_id uuid,p_user uuid) RETURNS public.video_upload_operations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.video_upload_operations;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  SELECT * INTO op FROM public.video_upload_operations WHERE id=p_id AND user_id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operation mismatch'; END IF;
  IF op.state NOT IN ('issued','aborted') THEN RAISE EXCEPTION 'Persisted upload cannot be aborted'; END IF;
  INSERT INTO public.video_asset_outbox(version_id,workspace_id,provider,asset_key,reason) VALUES(op.version_id,op.workspace_id,'r2',op.object_key,'abort_or_partial_upload') ON CONFLICT DO NOTHING;
  UPDATE public.video_upload_operations SET state='aborted' WHERE id=p_id RETURNING * INTO op;
  RETURN op;
END $$;
CREATE FUNCTION public.recover_video_submission(p_id uuid,p_user uuid,p_uid text) RETURNS public.video_upload_operations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.video_upload_operations;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  SELECT * INTO op FROM public.video_upload_operations WHERE id=p_id AND user_id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recovery mismatch'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id=op.workspace_id AND user_id=p_user AND is_active AND role::text IN ('admin','edicao')) THEN RAISE EXCEPTION 'Membership changed'; END IF;
  IF op.state='processing' THEN
    PERFORM 1 FROM public.video_versions
      WHERE id=op.version_id AND workspace_id=op.workspace_id AND r2_key=op.object_key AND is_deleted IS NOT TRUE
        AND nullif(cloudflare_stream_uid,'') IS NOT NULL AND (p_uid IS NULL OR cloudflare_stream_uid=p_uid) FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Recovery mismatch'; END IF;
    RETURN op;
  END IF;
  IF op.state NOT IN ('submitting','uncertain') OR p_uid IS NULL OR length(p_uid) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Recovery mismatch'; END IF;
  UPDATE public.video_versions SET cloudflare_stream_uid=p_uid,stream_status='processing' WHERE id=op.version_id AND workspace_id=op.workspace_id AND r2_key=op.object_key AND is_deleted IS NOT TRUE;
  IF NOT FOUND THEN
    INSERT INTO public.video_asset_outbox(version_id,workspace_id,provider,asset_key,reason) VALUES(op.version_id,op.workspace_id,'stream',p_uid,'late_recovery') ON CONFLICT DO NOTHING;
    RETURN op;
  END IF;
  UPDATE public.video_upload_operations SET state='processing' WHERE id=p_id RETURNING * INTO op;RETURN op;
END $$;
-- Opt-in service-only reconciliation. Never schedule or delete physical objects automatically.
-- Expired issued operations may have an already uploaded object; keep the reference held.
CREATE FUNCTION public.expire_video_issued_operations(p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Forbidden or invalid limit'; END IF;
  PERFORM pg_advisory_xact_lock(742019,1);
  WITH selected AS (
    SELECT id FROM public.video_upload_operations
    WHERE state='issued' AND expires_at<=now()
    ORDER BY expires_at,id LIMIT p_limit FOR UPDATE SKIP LOCKED
  ), changed AS (
    UPDATE public.video_upload_operations op SET state='aborted'
    WHERE op.id IN (SELECT id FROM selected) AND op.state='issued'
    RETURNING op.workspace_id,op.version_id,op.object_key
  ), saved AS (
    INSERT INTO public.video_asset_outbox(version_id,workspace_id,provider,asset_key,reason)
      SELECT version_id,workspace_id,'r2',object_key,'expired_unconfirmed_upload' FROM changed
    ON CONFLICT DO NOTHING RETURNING 1
  )
  SELECT count(*)::integer INTO affected FROM changed;
  RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.expire_video_issued_operations(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_video_issued_operations(integer) TO service_role;

REVOKE ALL ON FUNCTION public.abort_video_operation(uuid,uuid),public.recover_video_submission(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.abort_video_operation(uuid,uuid),public.recover_video_submission(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.preserve_issued_assets_on_parent_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.video_asset_outbox(version_id,workspace_id,provider,asset_key,reason)
    SELECT version_id,workspace_id,'r2',object_key,'parent_cascade' FROM public.video_upload_operations
    WHERE (TG_TABLE_NAME='workspaces' AND workspace_id=OLD.id) OR (TG_TABLE_NAME='projects' AND project_id=OLD.id) OR (TG_TABLE_NAME='tasks' AND task_id=OLD.id)
    ON CONFLICT DO NOTHING;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.preserve_issued_assets_on_parent_delete() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER preserve_issued_workspace BEFORE DELETE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.preserve_issued_assets_on_parent_delete();
CREATE TRIGGER preserve_issued_project BEFORE DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.preserve_issued_assets_on_parent_delete();
CREATE TRIGGER preserve_issued_task BEFORE DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.preserve_issued_assets_on_parent_delete();
COMMIT;
