
-- Restore the SELECT policy (it was dropped in failed migration)
-- Create a new policy that allows viewing but sensitive columns handled by view
CREATE POLICY "Members can view workspace members"
ON workspace_members
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

-- Create a secure view that masks hourly_rate for non-admins
CREATE OR REPLACE VIEW workspace_members_secure AS
SELECT 
  id,
  workspace_id,
  user_id,
  role,
  specialization,
  CASE 
    WHEN is_workspace_admin(auth.uid(), workspace_id) OR user_id = auth.uid() 
    THEN hourly_rate 
    ELSE NULL 
  END as hourly_rate,
  is_active,
  invited_at,
  joined_at,
  created_at,
  updated_at
FROM workspace_members
WHERE is_workspace_member(auth.uid(), workspace_id) OR is_system_admin();

-- Grant access to the view
GRANT SELECT ON workspace_members_secure TO authenticated;

-- Add comment documenting security
COMMENT ON VIEW workspace_members_secure IS 'Secure view of workspace_members that masks hourly_rate for non-admins. Only admins and the member themselves can see hourly_rate values.';
