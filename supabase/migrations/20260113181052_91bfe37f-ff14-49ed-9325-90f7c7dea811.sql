-- Drop the overly permissive policy on workspace_invitations
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.workspace_invitations;

-- Create a secure function to verify invitation tokens without exposing the table
CREATE OR REPLACE FUNCTION public.verify_invitation_token(_token text)
RETURNS TABLE(
  id uuid,
  email text,
  role public.app_role,
  workspace_id uuid,
  workspace_name text,
  expires_at timestamptz,
  accepted_at timestamptz,
  is_valid boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wi.id,
    wi.email,
    wi.role,
    wi.workspace_id,
    w.name as workspace_name,
    wi.expires_at,
    wi.accepted_at,
    (wi.accepted_at IS NULL AND wi.expires_at > now()) as is_valid
  FROM public.workspace_invitations wi
  JOIN public.workspaces w ON w.id = wi.workspace_id
  WHERE wi.token = _token
  LIMIT 1;
$$;