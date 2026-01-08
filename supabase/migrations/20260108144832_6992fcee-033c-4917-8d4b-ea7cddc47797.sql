-- Update create_workspace_with_admin function with input validation
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
  -- Validate name
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
    RAISE EXCEPTION 'Workspace name cannot be empty';
  END IF;
  
  IF LENGTH(p_name) > 100 THEN
    RAISE EXCEPTION 'Workspace name too long (max 100 characters)';
  END IF;
  
  -- Validate slug
  IF p_slug IS NULL OR LENGTH(TRIM(p_slug)) = 0 THEN
    RAISE EXCEPTION 'Workspace slug cannot be empty';
  END IF;
  
  IF p_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Workspace slug can only contain lowercase letters, numbers, and hyphens';
  END IF;
  
  IF LENGTH(p_slug) > 50 THEN
    RAISE EXCEPTION 'Workspace slug too long (max 50 characters)';
  END IF;
  
  -- Validate currency
  IF p_currency NOT IN ('EUR', 'BRL', 'USD') THEN
    RAISE EXCEPTION 'Invalid currency. Must be EUR, BRL, or USD';
  END IF;
  
  -- Validate timezone (basic check)
  IF p_timezone IS NULL OR LENGTH(TRIM(p_timezone)) = 0 THEN
    RAISE EXCEPTION 'Timezone cannot be empty';
  END IF;
  
  -- Validate locale (basic check)
  IF p_locale IS NULL OR LENGTH(TRIM(p_locale)) = 0 THEN
    RAISE EXCEPTION 'Locale cannot be empty';
  END IF;
  
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create the workspace
  INSERT INTO public.workspaces (name, slug, country, currency, timezone, locale)
  VALUES (TRIM(p_name), LOWER(TRIM(p_slug)), p_country, p_currency, TRIM(p_timezone), TRIM(p_locale))
  RETURNING id INTO v_workspace_id;

  -- Add the creator as admin
  INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (v_workspace_id, v_user_id, 'admin', NOW());

  RETURN v_workspace_id;
END;
$$;