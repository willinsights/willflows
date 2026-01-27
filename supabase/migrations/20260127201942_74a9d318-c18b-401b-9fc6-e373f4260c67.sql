-- Remove old hardcoded email policies that are no longer valid
DROP POLICY IF EXISTS "Only admins can view page analytics" ON public.page_views;
DROP POLICY IF EXISTS "Only admins can view blog analytics" ON public.blog_views;

-- Note: The following policies already exist and are working correctly:
-- - "Super admins can read page views" (uses system_admins table)
-- - "System admins can view page views" (uses is_system_admin())
-- - "Super admins can read blog views" (uses system_admins table)
-- - "System admins can view blog views" (uses is_system_admin())