-- Fix: Remove overly permissive public SELECT policy on blog_share_analytics
-- Keep the admin-only policy that already exists

DROP POLICY IF EXISTS "Allow public read on blog_share_analytics" ON public.blog_share_analytics;

-- Also drop the duplicate admin policy with hardcoded emails (legacy)
DROP POLICY IF EXISTS "Only admins can view share analytics" ON public.blog_share_analytics;

-- Create proper system admin policy for SELECT
CREATE POLICY "System admins can view share analytics"
ON public.blog_share_analytics FOR SELECT
USING (public.is_system_admin());