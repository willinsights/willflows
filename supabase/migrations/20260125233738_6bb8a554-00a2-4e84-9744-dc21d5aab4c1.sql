-- =====================================================
-- MIGRATION: Actualizar políticas RLS para usar is_system_admin()
-- Remove referências hardcoded a emails @willflow.pt
-- =====================================================

-- beta_waitlist policies
DROP POLICY IF EXISTS "Only system admins can view waitlist" ON public.beta_waitlist;
CREATE POLICY "Only system admins can view waitlist" 
ON public.beta_waitlist FOR SELECT TO authenticated
USING (public.is_system_admin());

DROP POLICY IF EXISTS "Only system admins can update waitlist" ON public.beta_waitlist;
CREATE POLICY "Only system admins can update waitlist" 
ON public.beta_waitlist FOR UPDATE TO authenticated
USING (public.is_system_admin());

-- beta_invite_tokens policies
DROP POLICY IF EXISTS "Only system admins can view invite tokens" ON public.beta_invite_tokens;
CREATE POLICY "Only system admins can view invite tokens" 
ON public.beta_invite_tokens FOR SELECT TO authenticated
USING (public.is_system_admin());

DROP POLICY IF EXISTS "Only system admins can create invite tokens" ON public.beta_invite_tokens;
CREATE POLICY "Only system admins can create invite tokens" 
ON public.beta_invite_tokens FOR INSERT TO authenticated
WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS "Only system admins can update invite tokens" ON public.beta_invite_tokens;
CREATE POLICY "Only system admins can update invite tokens" 
ON public.beta_invite_tokens FOR UPDATE TO authenticated
USING (public.is_system_admin());

-- feedback policies
DROP POLICY IF EXISTS "System admins can view all feedback" ON public.feedback;
CREATE POLICY "System admins can view all feedback" 
ON public.feedback FOR SELECT TO authenticated
USING (public.is_system_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "System admins can update feedback" ON public.feedback;
CREATE POLICY "System admins can update feedback" 
ON public.feedback FOR UPDATE TO authenticated
USING (public.is_system_admin());

DROP POLICY IF EXISTS "System admins can delete feedback" ON public.feedback;
CREATE POLICY "System admins can delete feedback" 
ON public.feedback FOR DELETE TO authenticated
USING (public.is_system_admin());

-- promo_codes policies
DROP POLICY IF EXISTS "Only system admins can view promo codes" ON public.promo_codes;
CREATE POLICY "Only system admins can view promo codes" 
ON public.promo_codes FOR SELECT TO authenticated
USING (public.is_system_admin());

DROP POLICY IF EXISTS "Only system admins can update promo codes" ON public.promo_codes;
CREATE POLICY "Only system admins can update promo codes" 
ON public.promo_codes FOR UPDATE TO authenticated
USING (public.is_system_admin());

DROP POLICY IF EXISTS "Only system admins can delete promo codes" ON public.promo_codes;
CREATE POLICY "Only system admins can delete promo codes" 
ON public.promo_codes FOR DELETE TO authenticated
USING (public.is_system_admin());

-- blog_share_analytics policies
DROP POLICY IF EXISTS "System admins can view share analytics" ON public.blog_share_analytics;
CREATE POLICY "System admins can view share analytics" 
ON public.blog_share_analytics FOR SELECT TO authenticated
USING (public.is_system_admin());

-- page_views policies
DROP POLICY IF EXISTS "System admins can view page views" ON public.page_views;
CREATE POLICY "System admins can view page views" 
ON public.page_views FOR SELECT TO authenticated
USING (public.is_system_admin());

-- blog_views policies
DROP POLICY IF EXISTS "System admins can view blog views" ON public.blog_views;
CREATE POLICY "System admins can view blog views" 
ON public.blog_views FOR SELECT TO authenticated
USING (public.is_system_admin());