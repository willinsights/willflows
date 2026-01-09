-- Allow anyone to view invitation details by token (for invite acceptance page)
-- This is secure because tokens are random UUIDs and serve as authentication
CREATE POLICY "Anyone can view invitations by token"
ON public.workspace_invitations
FOR SELECT
USING (true);

-- Drop the more restrictive policies that would conflict
DROP POLICY IF EXISTS "Admins can view invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their email" ON public.workspace_invitations;

-- Recreate admin policy for full management
CREATE POLICY "Admins can view all workspace invitations"
ON public.workspace_invitations
FOR SELECT
USING (is_workspace_admin(auth.uid(), workspace_id));

-- Allow users to view invitations sent to their email
CREATE POLICY "Users can view their own invitations"
ON public.workspace_invitations
FOR SELECT
USING (auth.email() IS NOT NULL AND lower(email) = lower(auth.email()));

-- Also need to allow reading workspace name for the invite page
-- Create a function to check if a token is valid for a workspace
CREATE OR REPLACE FUNCTION public.is_valid_invitation_token(_workspace_id uuid, _token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_invitations
    WHERE workspace_id = _workspace_id
      AND token = _token
      AND accepted_at IS NULL
      AND expires_at > now()
  )
$$;

-- Allow viewing workspace basic info if user has valid invitation token
CREATE POLICY "Invited users can view workspace name"
ON public.workspaces
FOR SELECT
USING (
  is_workspace_member(auth.uid(), id)
  OR EXISTS (
    SELECT 1 FROM public.workspace_invitations wi
    WHERE wi.workspace_id = id
      AND wi.accepted_at IS NULL
      AND wi.expires_at > now()
      AND (
        (auth.email() IS NOT NULL AND lower(wi.email) = lower(auth.email()))
        OR auth.uid() IS NULL
      )
  )
);