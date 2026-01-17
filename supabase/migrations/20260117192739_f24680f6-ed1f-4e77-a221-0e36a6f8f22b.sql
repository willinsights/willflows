-- ==============================================
-- SECURITY FIX: blog_share_analytics validation
-- ==============================================
-- Substituir a policy INSERT permissiva por uma que valida post_id

DROP POLICY IF EXISTS "Allow public insert on blog_share_analytics" ON public.blog_share_analytics;

-- Nova policy: só permite inserir se o post existir e estiver publicado
CREATE POLICY "Allow insert for published posts only"
ON public.blog_share_analytics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE id = post_id AND is_published = true
  )
);

-- ==============================================
-- SECURITY FIX: feedback-screenshots bucket
-- ==============================================
-- Tornar o bucket privado (apenas acessível via autenticação)

UPDATE storage.buckets 
SET public = false 
WHERE id = 'feedback-screenshots';

-- Garantir que policies de storage estão corretas
DROP POLICY IF EXISTS "Feedback screenshots are viewable by owner and admins" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;

-- Apenas o utilizador que fez upload e admins podem ver
CREATE POLICY "Feedback screenshots viewable by owner and admins"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'feedback-screenshots' 
  AND (
    -- Owner do ficheiro (baseado no path user_id/filename)
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Admins de qualquer workspace
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() 
      AND wm.role = 'admin' 
      AND wm.is_active = true
    )
  )
);

-- Utilizadores autenticados podem fazer upload (na sua pasta)
CREATE POLICY "Users can upload own feedback screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ==============================================
-- SECURITY FIX: promo_codes - restringir leitura
-- ==============================================
-- Apenas autenticados podem ver códigos ativos (não expor publicamente)

DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;

CREATE POLICY "Authenticated users can read active promo codes"
ON public.promo_codes
FOR SELECT
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
);