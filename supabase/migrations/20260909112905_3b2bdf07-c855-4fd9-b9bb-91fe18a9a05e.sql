-- Ensure the plaintext token column is unreadable at column level for all API roles
REVOKE SELECT (token) ON public.video_approval_tokens FROM authenticated, anon;
GRANT SELECT (id, task_id, project_id, workspace_id, token_hash, client_email, client_name, expires_at, is_active, created_by, created_at)
  ON public.video_approval_tokens TO authenticated;

-- Replace the broad admin SELECT policy with one that documents the metadata-only intent
DROP POLICY IF EXISTS "Admins can read approval token metadata" ON public.video_approval_tokens;
CREATE POLICY "Admins can read approval token metadata"
ON public.video_approval_tokens
FOR SELECT
TO authenticated
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
  AND NOT has_column_privilege('public.video_approval_tokens', 'token', 'SELECT')
);

-- The only path to the plaintext token is this RPC; make every retrieval auditable
CREATE OR REPLACE FUNCTION public.get_video_approval_token_secret(p_token_id uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_id uuid;
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT workspace_id, token
    INTO v_workspace_id, v_token
    FROM public.video_approval_tokens
   WHERE id = p_token_id;

  IF v_workspace_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public.is_workspace_admin(auth.uid(), v_workspace_id) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'video_approval_token_revealed', 'video_approval_token', p_token_id,
          jsonb_build_object('workspace_id', v_workspace_id));

  RETURN v_token;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_video_approval_token_secret(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_video_approval_token_secret(uuid) TO authenticated;