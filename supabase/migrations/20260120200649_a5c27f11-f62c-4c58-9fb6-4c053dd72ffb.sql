-- Adicionar política de SELECT para System Admins lerem todos os perfis
CREATE POLICY "System admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_system_admin());