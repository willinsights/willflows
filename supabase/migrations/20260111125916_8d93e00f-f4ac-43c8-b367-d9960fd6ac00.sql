-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;

-- The service role key bypasses RLS by default, so we don't need a special policy for it
-- Only authenticated users viewing their own subscription need a policy (already created)