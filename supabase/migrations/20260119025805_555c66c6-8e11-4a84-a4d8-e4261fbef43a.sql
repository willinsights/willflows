-- =============================================
-- SECURITY FIX: Restrict system_admins table access
-- =============================================

-- Drop existing SELECT policy if exists
DROP POLICY IF EXISTS "System admins can view system_admins" ON public.system_admins;

-- Only system admins can view the system_admins table (prevents enumeration)
CREATE POLICY "Only system admins can view system_admins"
  ON public.system_admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- =============================================
-- SECURITY FIX: Restrict profiles table - hide PII from non-workspace members
-- =============================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view accessible profiles" ON public.profiles;

-- Create a more restrictive policy: users can only see profiles of people in their workspaces
-- or their own profile
CREATE POLICY "Users can view accessible profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Users can always see their own profile
    id = auth.uid()
    OR
    -- Users can see profiles of people in their shared workspaces
    EXISTS (
      SELECT 1 
      FROM public.workspace_members my_ws
      JOIN public.workspace_members their_ws ON my_ws.workspace_id = their_ws.workspace_id
      WHERE my_ws.user_id = auth.uid()
        AND my_ws.is_active = true
        AND their_ws.user_id = profiles.id
        AND their_ws.is_active = true
    )
  );

-- =============================================
-- SECURITY FIX: Restrict blog-images bucket to system admins
-- =============================================

-- Drop existing policies for blog-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete blog images" ON storage.objects;
DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for blog images" ON storage.objects;

-- Allow public read access for blog images (this is intentional for a blog)
CREATE POLICY "Public read access for blog images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'blog-images');

-- Only system admins can insert blog images
CREATE POLICY "System admins can insert blog images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-images' 
    AND EXISTS (
      SELECT 1 FROM public.system_admins 
      WHERE user_id = auth.uid()
    )
  );

-- Only system admins can update blog images
CREATE POLICY "System admins can update blog images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'blog-images' 
    AND EXISTS (
      SELECT 1 FROM public.system_admins 
      WHERE user_id = auth.uid()
    )
  );

-- Only system admins can delete blog images
CREATE POLICY "System admins can delete blog images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'blog-images' 
    AND EXISTS (
      SELECT 1 FROM public.system_admins 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- SECURITY FIX: Tighten payments collaborator policy
-- =============================================

-- Drop and recreate the collaborator payments policy to be more strict
DROP POLICY IF EXISTS "Collaborators can view their own payments" ON public.payments;

-- Collaborators can ONLY view payments specifically assigned to them (not all payments in workspace)
CREATE POLICY "Collaborators can view their assigned payments"
  ON public.payments
  FOR SELECT
  USING (
    -- Payment must be a payable (not receivable) AND collaborator must match user
    is_receivable = false 
    AND collaborator_id = auth.uid()
  );