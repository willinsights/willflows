-- Sync Super Admin workspaces to Studio/Active status
-- This ensures consistency between user_subscriptions and workspaces tables
UPDATE workspaces w
SET 
  subscription_plan = 'studio',
  subscription_status = 'active',
  trial_ends_at = NULL
FROM workspace_members wm
JOIN system_admins sa ON wm.user_id = sa.user_id
WHERE wm.workspace_id = w.id 
  AND wm.role = 'admin'
  AND w.subscription_status != 'active';