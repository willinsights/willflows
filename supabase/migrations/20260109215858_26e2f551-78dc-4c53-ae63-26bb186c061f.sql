-- Simplify the profiles policy for workspace members
-- Drop the complex recursive policy
DROP POLICY IF EXISTS "Workspace members can view profiles of other members" ON public.profiles;

-- Create a simpler policy that allows viewing profiles of workspace members
-- Using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User can view their own profile
    SELECT 1 WHERE _profile_id = auth.uid()
    UNION
    -- User can view profiles of members in their workspaces
    SELECT 1
    FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
      AND wm2.user_id = _profile_id
      AND wm1.is_active = true
      AND wm2.is_active = true
  )
$$;

-- Create new policy using the function
CREATE POLICY "Users can view accessible profiles"
ON public.profiles
FOR SELECT
USING (public.can_view_profile(id));