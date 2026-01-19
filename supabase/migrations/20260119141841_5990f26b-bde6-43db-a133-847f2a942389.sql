-- Update blog-images policies to use is_system_admin() function
-- This prevents potential infinite recursion issues

DROP POLICY IF EXISTS "System admins can delete blog images" ON storage.objects;
CREATE POLICY "System admins can delete blog images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-images' AND public.is_system_admin());

DROP POLICY IF EXISTS "System admins can insert blog images" ON storage.objects;
CREATE POLICY "System admins can insert blog images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND public.is_system_admin());

DROP POLICY IF EXISTS "System admins can update blog images" ON storage.objects;
CREATE POLICY "System admins can update blog images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-images' AND public.is_system_admin())
WITH CHECK (bucket_id = 'blog-images' AND public.is_system_admin());