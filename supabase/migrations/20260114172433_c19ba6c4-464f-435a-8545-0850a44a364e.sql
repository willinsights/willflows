-- ============================================
-- TRIAL 30 DIAS - BÓNUS DE LANÇAMENTO
-- ============================================

-- 1. Atualizar workspaces existentes em trial para terem 30 dias desde criação
UPDATE public.workspaces 
SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE subscription_status = 'trialing';

-- 2. Alterar DEFAULT para 30 dias (novos workspaces)
ALTER TABLE public.workspaces 
ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days');

-- 3. Dropar função antiga e recriar com 30 dias
DROP FUNCTION IF EXISTS public.create_workspace_with_admin(text,text,country_region,text,text,text);

CREATE FUNCTION public.create_workspace_with_admin(
  p_name text,
  p_slug text,
  p_country country_region DEFAULT 'PT',
  p_currency text DEFAULT 'EUR',
  p_locale text DEFAULT 'pt-PT',
  p_timezone text DEFAULT 'Europe/Lisbon'
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

  -- Create workspace with 30-day trial (BÓNUS DE LANÇAMENTO)
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
    'trialing',
    'essencial',
    now() + interval '30 days'
  )
  RETURNING id INTO v_workspace_id;

  -- Add creator as admin
  INSERT INTO workspace_members (workspace_id, user_id, role, is_active, joined_at)
  VALUES (v_workspace_id, v_user_id, 'admin', true, now());

  -- Initialize default permissions
  PERFORM initialize_workspace_permissions(v_workspace_id);

  RETURN v_workspace_id;
END;
$$;