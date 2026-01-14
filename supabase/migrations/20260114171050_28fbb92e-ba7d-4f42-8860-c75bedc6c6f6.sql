-- Fix workspaces in trial without trial_ends_at
-- Set trial_ends_at to 7 days from creation date for existing workspaces
UPDATE workspaces 
SET trial_ends_at = created_at + INTERVAL '7 days'
WHERE subscription_status = 'trialing' 
  AND trial_ends_at IS NULL;