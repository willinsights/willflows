-- Primeiro eliminar qualquer função existente com este nome
DROP FUNCTION IF EXISTS public.is_system_admin();
DROP FUNCTION IF EXISTS public.is_system_admin(uuid);

-- Criar função SECURITY DEFINER para verificar admin sem recursão
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

-- Remover políticas antigas de system_admins
DROP POLICY IF EXISTS "Only system admins can view system_admins" ON public.system_admins;
DROP POLICY IF EXISTS "System admins can view themselves" ON public.system_admins;
DROP POLICY IF EXISTS "System admins can view system_admins" ON public.system_admins;

-- Criar nova política para system_admins usando a função
CREATE POLICY "System admins can view system_admins"
ON public.system_admins FOR SELECT
USING (public.is_system_admin());

-- Remover políticas antigas de blog_auto_settings
DROP POLICY IF EXISTS "Super admins can view auto settings" ON public.blog_auto_settings;
DROP POLICY IF EXISTS "Super admins can update auto settings" ON public.blog_auto_settings;
DROP POLICY IF EXISTS "Super admins can insert auto settings" ON public.blog_auto_settings;
DROP POLICY IF EXISTS "System admins can manage blog_auto_settings" ON public.blog_auto_settings;
DROP POLICY IF EXISTS "System admins can view blog_auto_settings" ON public.blog_auto_settings;
DROP POLICY IF EXISTS "System admins can update blog_auto_settings" ON public.blog_auto_settings;
DROP POLICY IF EXISTS "System admins can insert blog_auto_settings" ON public.blog_auto_settings;

-- Criar novas políticas para blog_auto_settings
CREATE POLICY "System admins can view blog_auto_settings"
ON public.blog_auto_settings FOR SELECT
USING (public.is_system_admin());

CREATE POLICY "System admins can update blog_auto_settings"
ON public.blog_auto_settings FOR UPDATE
USING (public.is_system_admin());

CREATE POLICY "System admins can insert blog_auto_settings"
ON public.blog_auto_settings FOR INSERT
WITH CHECK (public.is_system_admin());

-- Remover políticas antigas de blog_posts que usam system_admins
DROP POLICY IF EXISTS "Super admins can manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "System admins can manage all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "System admins can manage blog_posts" ON public.blog_posts;

-- Criar nova política para blog_posts
CREATE POLICY "System admins can manage blog_posts"
ON public.blog_posts FOR ALL
USING (public.is_system_admin());