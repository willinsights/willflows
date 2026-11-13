-- CANDIDATE ONLY. Never place in an applicable migration journal without approval.
BEGIN;
CREATE FUNCTION public.g04_s03_video_context_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  expected_project uuid;
  expected_workspace uuid;
  version_row public.video_versions%ROWTYPE;
BEGIN
  -- Existing metadata-only updates keep working without rewriting historical rows.
  IF TG_OP = 'UPDATE' AND
     (to_jsonb(NEW)->'workspace_id', to_jsonb(NEW)->'project_id', to_jsonb(NEW)->'task_id', to_jsonb(NEW)->'video_version_id', to_jsonb(NEW)->'parent_id', to_jsonb(NEW)->'r2_key', to_jsonb(NEW)->'replacement_r2_key', to_jsonb(NEW)->'file_path', to_jsonb(NEW)->'uploaded_by', to_jsonb(NEW)->'cloudflare_stream_uid', to_jsonb(NEW)->'replacement_stream_uid', to_jsonb(NEW)->'stream_playback_url', to_jsonb(NEW)->'replacement_playback_url')
     IS NOT DISTINCT FROM
     (to_jsonb(OLD)->'workspace_id', to_jsonb(OLD)->'project_id', to_jsonb(OLD)->'task_id', to_jsonb(OLD)->'video_version_id', to_jsonb(OLD)->'parent_id', to_jsonb(OLD)->'r2_key', to_jsonb(OLD)->'replacement_r2_key', to_jsonb(OLD)->'file_path', to_jsonb(OLD)->'uploaded_by', to_jsonb(OLD)->'cloudflare_stream_uid', to_jsonb(OLD)->'replacement_stream_uid', to_jsonb(OLD)->'stream_playback_url', to_jsonb(OLD)->'replacement_playback_url') THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'video_versions' AND public.is_service_role() IS NOT TRUE THEN
    RAISE EXCEPTION 'Video assets must be managed by the authorized upload service' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME IN ('video_comments','video_approvals') THEN
    SELECT * INTO version_row FROM public.video_versions WHERE id = NEW.video_version_id FOR KEY SHARE;
    IF NOT FOUND OR NEW.workspace_id IS DISTINCT FROM version_row.workspace_id OR
       (NEW.project_id IS NOT NULL AND NEW.project_id IS DISTINCT FROM version_row.project_id) OR
       (NEW.task_id IS NOT NULL AND NEW.task_id IS DISTINCT FROM version_row.task_id) THEN
      RAISE EXCEPTION 'Incoherent video version context' USING ERRCODE = '23514';
    END IF;
    NEW.project_id := version_row.project_id;
    NEW.task_id := version_row.task_id;
    IF TG_TABLE_NAME = 'video_comments' AND (to_jsonb(NEW)->>'parent_id') IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.video_comments c WHERE c.id = (to_jsonb(NEW)->>'parent_id')::uuid AND c.workspace_id = NEW.workspace_id AND c.video_version_id = NEW.video_version_id) THEN
        RAISE EXCEPTION 'Incoherent parent comment' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  IF NEW.task_id IS NOT NULL THEN
    SELECT project_id, workspace_id INTO expected_project, expected_workspace FROM public.tasks WHERE id = NEW.task_id FOR KEY SHARE;
    IF NOT FOUND OR NEW.workspace_id IS DISTINCT FROM expected_workspace OR (NEW.project_id IS NOT NULL AND NEW.project_id IS DISTINCT FROM expected_project) THEN
      RAISE EXCEPTION 'Incoherent video task context' USING ERRCODE = '23514';
    END IF;
    NEW.project_id := expected_project;
  END IF;
  SELECT workspace_id INTO expected_workspace FROM public.projects WHERE id = NEW.project_id FOR KEY SHARE;
  IF NOT FOUND OR NEW.workspace_id IS DISTINCT FROM expected_workspace THEN
    RAISE EXCEPTION 'Incoherent video project context' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'video_versions' THEN
    IF NEW.r2_key IS NOT NULL AND (NEW.r2_key NOT LIKE NEW.workspace_id::text || '/%' OR NEW.r2_key ~ '(^|/)\.{1,2}(/|$)|[%?#\\[:space:]]|//') THEN
      RAISE EXCEPTION 'Incoherent video storage key' USING ERRCODE = '23514';
    END IF;
    IF NEW.replacement_r2_key IS NOT NULL AND (NEW.replacement_r2_key NOT LIKE NEW.workspace_id::text || '/%' OR NEW.replacement_r2_key ~ '(^|/)\.{1,2}(/|$)|[%?#\\[:space:]]|//') THEN
      RAISE EXCEPTION 'Incoherent replacement storage key' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.g04_s03_video_context_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.g04_s03_video_context_guard() TO service_role;
CREATE TRIGGER g04_s03_video_context BEFORE INSERT OR UPDATE ON public.video_versions FOR EACH ROW EXECUTE FUNCTION public.g04_s03_video_context_guard();
CREATE TRIGGER g04_s03_video_context BEFORE INSERT OR UPDATE ON public.video_approval_tokens FOR EACH ROW EXECUTE FUNCTION public.g04_s03_video_context_guard();
CREATE TRIGGER g04_s03_video_context BEFORE INSERT OR UPDATE ON public.video_comments FOR EACH ROW EXECUTE FUNCTION public.g04_s03_video_context_guard();
CREATE TRIGGER g04_s03_video_context BEFORE INSERT OR UPDATE ON public.video_approvals FOR EACH ROW EXECUTE FUNCTION public.g04_s03_video_context_guard();
COMMIT;