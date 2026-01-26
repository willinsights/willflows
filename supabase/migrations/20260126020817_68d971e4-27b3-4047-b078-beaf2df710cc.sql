
-- =====================================================
-- Security Fix: Remove public SELECT access to promo_codes
-- Users must use validate_promo_code() RPC function instead
-- =====================================================

-- Drop the permissive SELECT policies that expose promo codes
DROP POLICY IF EXISTS "Authenticated users can read active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Authenticated users can view active promo codes" ON public.promo_codes;

-- Also fix the legacy hardcoded email policies while we're here
DROP POLICY IF EXISTS "Only admins can delete promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Only admins can insert promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Only admins can update promo codes" ON public.promo_codes;

-- Create proper admin INSERT policy using is_system_admin()
CREATE POLICY "System admins can insert promo codes"
ON public.promo_codes
FOR INSERT
TO authenticated
WITH CHECK (is_system_admin());

-- Note: The following policies already exist and are correct:
-- - "Only system admins can view promo codes" (SELECT)
-- - "Only system admins can update promo codes" (UPDATE)
-- - "Only system admins can delete promo codes" (DELETE)
-- - "Service role can manage promo codes" (ALL for service role)

-- =====================================================
-- Blog posts: Ensure only published posts are publicly readable
-- The existing policy "Anyone can read published posts" with (is_published = true) is correct
-- But we need to verify no other permissive policies expose drafts
-- =====================================================

-- The blog_posts table already has correct policies:
-- 1. "Anyone can read published posts" - SELECT where is_published = true (PUBLIC - correct)
-- 2. "Admins can manage blog posts" - ALL for workspace admins (correct)
-- 3. "System admins can manage blog_posts" - ALL for system admins (correct)
-- No changes needed for blog_posts

-- Grant execute permission on validate_promo_code to anon role for public validation
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO authenticated;
