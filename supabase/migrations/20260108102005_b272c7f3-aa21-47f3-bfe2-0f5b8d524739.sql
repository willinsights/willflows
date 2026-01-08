-- Create a function to create workspace with member in one atomic operation
CREATE OR REPLACE FUNCTION public.create_workspace_with_admin(
  p_name TEXT,
  p_slug TEXT,
  p_country country_region,
  p_currency TEXT,
  p_timezone TEXT,
  p_locale TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create workspace
  INSERT INTO public.workspaces (name, slug, country, currency, timezone, locale)
  VALUES (p_name, p_slug, p_country, p_currency, p_timezone, p_locale)
  RETURNING id INTO v_workspace_id;

  -- Add user as admin member
  INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (v_workspace_id, v_user_id, 'admin', NOW());

  RETURN v_workspace_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_workspace_with_admin TO authenticated;