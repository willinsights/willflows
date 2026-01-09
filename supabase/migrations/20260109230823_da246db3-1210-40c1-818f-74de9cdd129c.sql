-- Fix PUBLIC_DATA_EXPOSURE: Remove overly permissive "Anyone can view invitations by token" policy
-- and replace with a secure RPC function for token-based lookup

-- 1. Drop the dangerous policy that exposes ALL invitations
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.workspace_invitations;

-- 2. Create a secure function for token-based invitation lookup
-- This allows unauthenticated users to look up a SPECIFIC invitation by token
-- without exposing all other invitations
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  workspace_name text,
  email text,
  role app_role,
  expires_at timestamptz,
  accepted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wi.id,
    wi.workspace_id,
    w.name as workspace_name,
    wi.email,
    wi.role,
    wi.expires_at,
    wi.accepted_at
  FROM workspace_invitations wi
  JOIN workspaces w ON w.id = wi.workspace_id
  WHERE wi.token = _token
    AND wi.accepted_at IS NULL
    AND wi.expires_at > now();
$$;