-- FASE 1: Correções de Segurança Críticas - RLS Policies (Corrigido)

-- 1. beta_waitlist - Remover TODAS as políticas existentes primeiro
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Public can view waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Authenticated users can view waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Only system admins can view waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Only system admins can update waitlist" ON public.beta_waitlist;

-- Permitir INSERT público (para adicionar à waitlist)
CREATE POLICY "Anyone can join waitlist" 
ON public.beta_waitlist 
FOR INSERT 
TO public
WITH CHECK (true);

-- SELECT apenas para system_admins
CREATE POLICY "Only system admins can view waitlist" 
ON public.beta_waitlist 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- UPDATE apenas para system_admins
CREATE POLICY "Only system admins can update waitlist" 
ON public.beta_waitlist 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- 2. beta_invite_tokens - Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Public can view tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Authenticated users can view tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Anyone can view invite tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Only system admins can view invite tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Only system admins can manage invite tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Admins can manage invite tokens" ON public.beta_invite_tokens;

-- SELECT apenas para system_admins
CREATE POLICY "Only system admins can view invite tokens" 
ON public.beta_invite_tokens 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- INSERT apenas para system_admins
CREATE POLICY "Only system admins can insert invite tokens" 
ON public.beta_invite_tokens 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- UPDATE apenas para system_admins
CREATE POLICY "Only system admins can update invite tokens" 
ON public.beta_invite_tokens 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- 3. feedback - Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Users can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view own feedback or admins view all" ON public.feedback;
DROP POLICY IF EXISTS "Users can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can update own feedback or admins update all" ON public.feedback;
DROP POLICY IF EXISTS "Only admins can delete feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can submit feedback" ON public.feedback;

-- INSERT: utilizadores autenticados podem submeter feedback
CREATE POLICY "Users can submit feedback" 
ON public.feedback 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- SELECT: próprio feedback OU system_admins
CREATE POLICY "Users can view own feedback or admins view all" 
ON public.feedback 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- UPDATE: apenas próprio feedback ou admins
CREATE POLICY "Users can update own feedback or admins update all" 
ON public.feedback 
FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- DELETE: apenas admins
CREATE POLICY "Only admins can delete feedback" 
ON public.feedback 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- 4. promo_codes - Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Anyone can view promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Public can view promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Authenticated users can view active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Only admins can manage promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;

-- SELECT apenas para autenticados (validação de códigos ativos)
CREATE POLICY "Authenticated users can view active promo codes" 
ON public.promo_codes 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- INSERT apenas para admins
CREATE POLICY "Only admins can insert promo codes" 
ON public.promo_codes 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- UPDATE apenas para admins
CREATE POLICY "Only admins can update promo codes" 
ON public.promo_codes 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- DELETE apenas para admins
CREATE POLICY "Only admins can delete promo codes" 
ON public.promo_codes 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- 5. blog_share_analytics - Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Anyone can track shares" ON public.blog_share_analytics;
DROP POLICY IF EXISTS "Public can insert share analytics" ON public.blog_share_analytics;
DROP POLICY IF EXISTS "Anyone can track blog shares" ON public.blog_share_analytics;
DROP POLICY IF EXISTS "Only admins can view share analytics" ON public.blog_share_analytics;

-- INSERT público (para tracking)
CREATE POLICY "Anyone can track blog shares" 
ON public.blog_share_analytics 
FOR INSERT 
TO public
WITH CHECK (true);

-- SELECT apenas para admins
CREATE POLICY "Only admins can view share analytics" 
ON public.blog_share_analytics 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- 6. page_views - Remover políticas de SELECT públicas
DROP POLICY IF EXISTS "Anyone can view page views" ON public.page_views;
DROP POLICY IF EXISTS "Only admins can view page analytics" ON public.page_views;

CREATE POLICY "Only admins can view page analytics" 
ON public.page_views 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);

-- 7. blog_views - Remover políticas de SELECT públicas
DROP POLICY IF EXISTS "Anyone can view blog views" ON public.blog_views;
DROP POLICY IF EXISTS "Only admins can view blog analytics" ON public.blog_views;

CREATE POLICY "Only admins can view blog analytics" 
ON public.blog_views 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('admin@willflow.pt', 'wilson@willflow.pt')
  )
);