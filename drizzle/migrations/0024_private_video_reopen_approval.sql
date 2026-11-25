CREATE TABLE willflow_video_private.approval_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL, version_id uuid NOT NULL, name text NOT NULL, notes text, approved_at timestamptz NOT NULL, reopened_at timestamptz NOT NULL DEFAULT now(), reopened_by uuid NOT NULL);
ALTER TABLE willflow_video_private.approval_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON willflow_video_private.approval_history FROM PUBLIC;

CREATE FUNCTION public.private_video_client_reopen(p_version uuid, p_user uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v willflow_video_private.versions; a willflow_video_private.approvals;
BEGIN
  PERFORM willflow_video_private.service_check();
  PERFORM pg_advisory_xact_lock(742019,1);
  SELECT * INTO v FROM willflow_video_private.versions WHERE id=p_version FOR UPDATE;
  IF NOT FOUND OR v.state NOT IN ('persisted','ready') OR NOT willflow_video_private.context_exists(v.workspace_id,v.project_id,v.task_id) OR NOT willflow_video_private.editor(v.workspace_id,p_user) THEN RAISE EXCEPTION 'Forbidden reopen'; END IF;
  DELETE FROM willflow_video_private.approvals WHERE version_id=p_version RETURNING * INTO a;
  IF a.request_id IS NULL THEN RAISE EXCEPTION 'Not approved'; END IF;
  INSERT INTO willflow_video_private.approval_history(request_id,version_id,name,notes,approved_at,reopened_by) VALUES (a.request_id,a.version_id,a.name,a.notes,a.approved_at,p_user);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.private_video_client_reopen(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.private_video_client_reopen(uuid,uuid) TO service_role;