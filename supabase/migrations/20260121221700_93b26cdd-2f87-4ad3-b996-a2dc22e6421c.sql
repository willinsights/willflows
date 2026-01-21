-- Step 2: Migrate data from 'essencial' to 'starter' (now that enum value exists)

-- Update all workspaces with 'essencial' to 'starter'
UPDATE workspaces 
SET subscription_plan = 'starter' 
WHERE subscription_plan = 'essencial';

-- Update all user_subscriptions with 'essencial' to 'starter'
UPDATE user_subscriptions 
SET subscription_plan = 'starter' 
WHERE subscription_plan = 'essencial';

-- Change the default for workspaces table to 'starter'
ALTER TABLE workspaces ALTER COLUMN subscription_plan SET DEFAULT 'starter';