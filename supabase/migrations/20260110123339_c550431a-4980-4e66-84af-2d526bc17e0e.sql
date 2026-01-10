-- Clamp any existing trial periods to максимум 7 days
UPDATE public.workspaces
SET trial_ends_at = created_at + interval '7 days'
WHERE subscription_status = 'trialing'
  AND trial_ends_at IS NOT NULL
  AND trial_ends_at > created_at + interval '7 days';
