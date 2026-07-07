
-- 1) video_approval_tokens: revoke table-level SELECT and grant SELECT only on non-secret columns
REVOKE SELECT ON public.video_approval_tokens FROM authenticated;
REVOKE SELECT ON public.video_approval_tokens FROM anon;
GRANT SELECT (id, task_id, workspace_id, token_hash, client_email, client_name, expires_at, is_active, created_by, created_at, project_id) ON public.video_approval_tokens TO authenticated;

-- 2) workspace_invitations: same treatment — hide plaintext token column from client SELECT
REVOKE SELECT ON public.workspace_invitations FROM authenticated;
REVOKE SELECT ON public.workspace_invitations FROM anon;
GRANT SELECT (id, workspace_id, email, role, invited_by, expires_at, accepted_at, created_at, token_hash, email_hash, email_masked) ON public.workspace_invitations TO authenticated;

-- 3) Fix broken self-referential comparison in workspaces visibility policy
DROP POLICY IF EXISTS "Invited users can view workspace name" ON public.workspaces;

CREATE POLICY "Invited users can view workspace name"
ON public.workspaces
FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), id)
  OR EXISTS (
    SELECT 1
    FROM public.workspace_invitations wi
    WHERE wi.workspace_id = workspaces.id
      AND wi.accepted_at IS NULL
      AND wi.expires_at > now()
      AND auth.email() IS NOT NULL
      AND lower(wi.email) = lower(auth.email())
  )
);
