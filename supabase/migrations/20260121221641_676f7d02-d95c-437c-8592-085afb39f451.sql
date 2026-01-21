-- Step 1: Add 'starter' to the subscription_plan enum
-- This must be committed before it can be used in subsequent updates
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'starter';