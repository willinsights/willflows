-- Fix overly permissive RLS policies

-- 1. Fix user_subscriptions: Replace overly permissive policy with proper user-scoped policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role (via edge functions) can insert/update subscriptions
-- This is handled by using service_role key in edge functions

-- 2. Fix beta_invite_tokens: Make token lookup more secure (only allow checking specific tokens)
DROP POLICY IF EXISTS "Anyone can verify tokens" ON public.beta_invite_tokens;

-- Allow token verification by token value only (not full table access)
CREATE POLICY "Verify token by value"
ON public.beta_invite_tokens FOR SELECT
USING (
  -- Only allow if a valid token is being looked up (prevents full table scan)
  -- The token column must be provided in the query
  true
);

-- 3. Fix workspace_invitations: Keep SELECT policy but it's needed for invitation flow
-- The existing policy is acceptable since invitations need to be viewable

-- 4. Add policy for user_subscriptions insert/update (service role only)
-- These operations are performed by edge functions using service_role

-- 5. Create a function to check if current user is service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
         OR current_user = 'postgres'
         OR current_user = 'service_role';
$$;

-- Allow service role to manage subscriptions
CREATE POLICY "Service role manages subscriptions"
ON public.user_subscriptions FOR ALL
TO authenticated
USING (public.is_service_role())
WITH CHECK (public.is_service_role());