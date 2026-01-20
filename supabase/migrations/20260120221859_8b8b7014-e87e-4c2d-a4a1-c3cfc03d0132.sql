-- Fix: Super Admins should get 'studio' plan + 'active' status when creating workspaces

-- Update the create_workspace_with_admin function to check for super admin status
CREATE OR REPLACE FUNCTION public.create_workspace_with_admin(
  p_name text, 
  p_slug text, 
  p_country country_region DEFAULT 'PT'::country_region, 
  p_currency text DEFAULT 'EUR'::text, 
  p_locale text DEFAULT 'pt-PT'::text, 
  p_timezone text DEFAULT 'Europe/Lisbon'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
  v_is_super_admin boolean;
  v_plan subscription_plan;
  v_status text;
  v_trial_ends timestamptz;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is a Super Admin
  SELECT EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = v_user_id
  ) INTO v_is_super_admin;

  -- Set plan based on user type
  IF v_is_super_admin THEN
    v_plan := 'studio';
    v_status := 'active';
    v_trial_ends := NULL;  -- No expiration for super admins
  ELSE
    v_plan := 'essencial';
    v_status := 'trialing';
    v_trial_ends := now() + interval '30 days';  -- 30-day trial bonus
  END IF;

  -- Create workspace with appropriate values
  INSERT INTO workspaces (
    name, 
    slug, 
    country, 
    currency, 
    locale, 
    timezone,
    subscription_status,
    subscription_plan,
    trial_ends_at
  )
  VALUES (
    p_name, 
    p_slug, 
    p_country, 
    p_currency, 
    p_locale, 
    p_timezone,
    v_status,
    v_plan,
    v_trial_ends
  )
  RETURNING id INTO v_workspace_id;

  -- Add creator as admin
  INSERT INTO workspace_members (workspace_id, user_id, role, is_active, joined_at)
  VALUES (v_workspace_id, v_user_id, 'admin', true, now());

  -- Initialize default permissions
  PERFORM initialize_workspace_permissions(v_workspace_id);

  RETURN v_workspace_id;
END;
$function$;

-- Fix existing workspace created by super admin (ID from query results)
UPDATE workspaces 
SET 
  subscription_plan = 'studio',
  subscription_status = 'active',
  trial_ends_at = NULL
WHERE id = '06926820-b380-40c3-8c10-25802742cf59';