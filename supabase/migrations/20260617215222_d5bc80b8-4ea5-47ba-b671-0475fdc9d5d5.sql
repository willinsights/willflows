
REVOKE SELECT ON public.video_approval_tokens FROM authenticated;
REVOKE SELECT ON public.video_approval_tokens FROM anon;

GRANT SELECT (
  id, task_id, project_id, workspace_id, token_hash, client_email, client_name,
  expires_at, is_active, created_by, created_at
) ON public.video_approval_tokens TO authenticated;

GRANT ALL ON public.video_approval_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.get_video_approval_token(p_token_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_workspace_id uuid;
  v_created_by uuid;
BEGIN
  SELECT token, workspace_id, created_by
    INTO v_token, v_workspace_id, v_created_by
  FROM public.video_approval_tokens
  WHERE id = p_token_id AND is_active = true;

  IF v_token IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() = v_created_by
     OR EXISTS (
       SELECT 1 FROM public.workspace_members wm
       WHERE wm.workspace_id = v_workspace_id
         AND wm.user_id = auth.uid()
         AND wm.role IN ('owner','admin')
     )
  THEN
    RETURN v_token;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_video_approval_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_video_approval_token(uuid) TO authenticated;
