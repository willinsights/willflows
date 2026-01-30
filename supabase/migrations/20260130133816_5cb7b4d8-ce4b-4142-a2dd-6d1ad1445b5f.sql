
-- Fix SECURITY DEFINER view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS workspace_members_secure;

-- Create view with explicit SECURITY INVOKER (default but explicit for clarity)
CREATE VIEW workspace_members_secure 
WITH (security_invoker = true) AS
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
FROM workspace_members;

-- Grant access to the view
GRANT SELECT ON workspace_members_secure TO authenticated;

-- Add comment documenting security
COMMENT ON VIEW workspace_members_secure IS 'Secure view of workspace_members that masks hourly_rate for non-admins. Only admins and the member themselves can see hourly_rate values. Uses SECURITY INVOKER to respect RLS of querying user.';
