-- Create user_subscriptions table to centralize subscription at user level
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  subscription_plan public.subscription_plan NOT NULL DEFAULT 'essencial',
  subscription_status text NOT NULL DEFAULT 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for Stripe customer lookups
CREATE INDEX idx_user_subscriptions_stripe_customer 
ON public.user_subscriptions(stripe_customer_id);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Policy: Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
ON public.user_subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get user subscription with limits
CREATE OR REPLACE FUNCTION public.get_user_subscription_info(p_user_id uuid)
RETURNS TABLE (
  subscription_plan public.subscription_plan,
  subscription_status text,
  workspaces_limit int,
  users_limit int,
  projects_limit int,
  trial_ends_at timestamptz,
  current_period_end timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(us.subscription_plan, 'essencial'::subscription_plan),
    COALESCE(us.subscription_status, 'trialing'),
    CASE us.subscription_plan
      WHEN 'essencial' THEN 1
      WHEN 'pro' THEN 3
      WHEN 'studio' THEN 10
      ELSE 1
    END,
    CASE us.subscription_plan
      WHEN 'essencial' THEN 2
      WHEN 'pro' THEN 10
      WHEN 'studio' THEN 999
      ELSE 2
    END,
    CASE us.subscription_plan
      WHEN 'essencial' THEN 15
      WHEN 'pro' THEN 100
      WHEN 'studio' THEN 999
      ELSE 15
    END,
    us.trial_ends_at,
    us.current_period_end
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;
$$;

-- Function to count total invited users across all admin workspaces
CREATE OR REPLACE FUNCTION public.count_total_invited_users(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(DISTINCT wm2.user_id)::int, 0)
  FROM public.workspace_members wm1
  JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
  WHERE wm1.user_id = p_user_id
    AND wm1.role = 'admin'
    AND wm1.is_active = true
    AND wm2.is_active = true
    AND wm2.user_id != p_user_id;
$$;

-- Function to count admin workspaces for a user
CREATE OR REPLACE FUNCTION public.count_admin_workspaces(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::int, 0)
  FROM public.workspace_members
  WHERE user_id = p_user_id
    AND role = 'admin'
    AND is_active = true;
$$;

-- Function to count total projects across all admin workspaces
CREATE OR REPLACE FUNCTION public.count_total_projects(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::int, 0)
  FROM public.projects p
  JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
  WHERE wm.user_id = p_user_id
    AND wm.role = 'admin'
    AND wm.is_active = true;
$$;

-- Migrate existing subscription data from workspaces to user_subscriptions
-- Uses the best plan from each user's admin workspaces
INSERT INTO public.user_subscriptions (
  user_id, 
  subscription_plan, 
  subscription_status, 
  stripe_customer_id, 
  stripe_subscription_id, 
  trial_ends_at
)
SELECT DISTINCT ON (wm.user_id)
  wm.user_id,
  w.subscription_plan,
  w.subscription_status,
  w.stripe_customer_id,
  w.stripe_subscription_id,
  w.trial_ends_at
FROM public.workspace_members wm
JOIN public.workspaces w ON wm.workspace_id = w.id
WHERE wm.role = 'admin' AND wm.is_active = true
ORDER BY wm.user_id, 
  CASE w.subscription_plan 
    WHEN 'studio' THEN 3 
    WHEN 'pro' THEN 2 
    WHEN 'essencial' THEN 1 
    ELSE 0 
  END DESC,
  CASE w.subscription_status
    WHEN 'active' THEN 2
    WHEN 'trialing' THEN 1
    ELSE 0
  END DESC
ON CONFLICT (user_id) DO NOTHING;