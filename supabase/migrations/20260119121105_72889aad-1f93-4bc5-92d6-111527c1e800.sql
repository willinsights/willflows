-- Create secure function to check system admin (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_admins 
    WHERE user_id = auth.uid()
  );
$$;

-- Drop and recreate the system_admins SELECT policy using the function
DROP POLICY IF EXISTS "Only system admins can view system_admins" ON public.system_admins;
CREATE POLICY "Only system admins can view system_admins" 
ON public.system_admins FOR SELECT
TO authenticated
USING (public.is_system_admin());