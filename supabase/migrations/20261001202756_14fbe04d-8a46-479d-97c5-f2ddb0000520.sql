CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid() AND public.is_system_admin();
$$;
REVOKE ALL ON FUNCTION public.is_system_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_system_admin(uuid) TO authenticated, service_role;