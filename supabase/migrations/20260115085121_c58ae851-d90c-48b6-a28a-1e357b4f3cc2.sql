-- Add is_internal_test column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_internal_test BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient queries on internal test accounts
CREATE INDEX IF NOT EXISTS idx_profiles_internal_test ON public.profiles(is_internal_test) 
WHERE is_internal_test = true;

-- Create system_admins table
CREATE TABLE IF NOT EXISTS public.system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on system_admins
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Only system admins can view the system_admins table
CREATE POLICY "Only system admins can view system_admins"
ON public.system_admins FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.system_admins));

-- Policy: Service role can manage system_admins
CREATE POLICY "Service role can manage system_admins"
ON public.system_admins FOR ALL
USING (is_service_role());

-- Insert super admin (willdesign7@gmail.com)
INSERT INTO public.system_admins (user_id)
VALUES ('c13a3906-354b-459d-98a2-293e7a0b68f3')
ON CONFLICT (user_id) DO NOTHING;

-- Create helper function to check if user is system admin
CREATE OR REPLACE FUNCTION public.is_system_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = check_user_id
  )
$$;

-- Create helper function to check if user is internal test account
CREATE OR REPLACE FUNCTION public.is_internal_test_account(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = check_user_id AND is_internal_test = true
  )
$$;