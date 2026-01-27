-- =====================================================
-- SPRINT 1 - P0 SECURITY HARDENING (CONTINUATION)
-- =====================================================

-- 4. PROTECT PROJECT_TEMPLATES TABLE (fix duplicate policy)
-- =====================================================

-- Drop existing policy first, then recreate
DROP POLICY IF EXISTS "Admins can manage templates" ON project_templates;
DROP POLICY IF EXISTS "Workspace members can view their templates" ON project_templates;

CREATE POLICY "Workspace members can view their templates"
ON project_templates
FOR SELECT
TO authenticated
USING (
  workspace_id IS NULL
  OR is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Admins can manage templates"
ON project_templates
FOR ALL
TO authenticated
USING (
  is_system_admin() 
  OR (workspace_id IS NOT NULL AND is_workspace_admin(auth.uid(), workspace_id))
)
WITH CHECK (
  is_system_admin() 
  OR (workspace_id IS NOT NULL AND is_workspace_admin(auth.uid(), workspace_id))
);

-- 5. ADD PROTECTED FLAG TO SYSTEM_ADMINS TABLE
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'system_admins' 
    AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE public.system_admins ADD COLUMN is_protected BOOLEAN DEFAULT false;
  END IF;
END $$;

UPDATE public.system_admins 
SET is_protected = true 
WHERE user_id IN (
  SELECT id FROM profiles WHERE email IN ('geral@willflow.app', 'willdesign7@gmail.com')
);

-- 6. CREATE PROTECTED_ACCOUNTS TABLE FOR CLEANUP PROTECTION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.protected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  protected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  protected_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.protected_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System admins can view protected accounts" ON protected_accounts;
DROP POLICY IF EXISTS "System admins can manage protected accounts" ON protected_accounts;

CREATE POLICY "System admins can view protected accounts"
ON protected_accounts
FOR SELECT
TO authenticated
USING (is_system_admin());

CREATE POLICY "System admins can manage protected accounts"
ON protected_accounts
FOR ALL
TO authenticated
USING (is_system_admin())
WITH CHECK (is_system_admin());

INSERT INTO public.protected_accounts (email, reason) VALUES
  ('geral@willflow.app', 'Super Admin'),
  ('willdesign7@gmail.com', 'Super Admin'),
  ('moraisdanobrega@gmail.com', 'Cliente real'),
  ('pedro.nobre@phormulagroup.com', 'Cliente real'),
  ('pablosouza7101997@gmail.com', 'Cliente real'),
  ('juniomedialab@gmail.com', 'Cliente real'),
  ('lukasalmeida1500@gmail.com', 'Cliente real')
ON CONFLICT (email) DO NOTHING;

-- 7. CREATE FUNCTION TO CHECK PROTECTED STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_protected_account(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.protected_accounts WHERE email = _email
  ) OR _email LIKE '%@test.willflow.local';
$$;