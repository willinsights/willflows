-- ==============================================
-- SECURITY FIX: blog_views - validar post_id
-- ==============================================

DROP POLICY IF EXISTS "Anyone can insert blog views" ON public.blog_views;

-- Só permite inserir views para posts publicados
CREATE POLICY "Insert blog views for published posts only"
ON public.blog_views
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE id = post_id AND is_published = true
  )
);

-- ==============================================
-- SECURITY FIX: page_views - validar dados mínimos
-- ==============================================

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;

-- Requer dados mínimos válidos para prevenir spam
CREATE POLICY "Insert page views with valid data"
ON public.page_views
FOR INSERT
WITH CHECK (
  page_path IS NOT NULL 
  AND length(page_path) > 0 
  AND length(page_path) < 500
  AND session_id IS NOT NULL
  AND length(session_id) > 10
);