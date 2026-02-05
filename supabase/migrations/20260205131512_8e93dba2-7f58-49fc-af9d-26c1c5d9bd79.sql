
-- Fix workspace_storage and video_retention_queue RLS policies
-- Issue: Data exposed to unauthenticated users due to service_role policy evaluation

-- 1. Drop existing policies for workspace_storage
DROP POLICY IF EXISTS "Admins can manage workspace storage" ON workspace_storage;
DROP POLICY IF EXISTS "Members can view workspace storage" ON workspace_storage;
DROP POLICY IF EXISTS "Service role can manage workspace storage" ON workspace_storage;

-- 2. Recreate policies with proper authentication check
-- System admin access (for monitoring)
CREATE POLICY "System admins can view all storage"
  ON workspace_storage FOR SELECT
  USING (is_system_admin());

-- Workspace admins can manage their workspace storage  
CREATE POLICY "Workspace admins can manage storage"
  ON workspace_storage FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND is_workspace_admin(auth.uid(), workspace_id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND is_workspace_admin(auth.uid(), workspace_id)
  );

-- Workspace members can view their workspace storage
CREATE POLICY "Workspace members can view storage"
  ON workspace_storage FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND is_workspace_member(auth.uid(), workspace_id)
  );

-- Service role for edge functions (webhooks, scheduled tasks)
CREATE POLICY "Service role manages storage"
  ON workspace_storage FOR ALL
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  )
  WITH CHECK (
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- 3. Drop existing policies for video_retention_queue
DROP POLICY IF EXISTS "Admins can manage retention queue" ON video_retention_queue;
DROP POLICY IF EXISTS "Members can view retention queue" ON video_retention_queue;
DROP POLICY IF EXISTS "Service role can manage retention queue" ON video_retention_queue;

-- 4. Recreate policies with proper authentication check
-- System admin access
CREATE POLICY "System admins can view retention queue"
  ON video_retention_queue FOR SELECT
  USING (is_system_admin());

-- Workspace admins can manage their workspace retention queue
CREATE POLICY "Workspace admins can manage retention queue"
  ON video_retention_queue FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND is_workspace_admin(auth.uid(), workspace_id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND is_workspace_admin(auth.uid(), workspace_id)
  );

-- Workspace members can view their workspace retention queue  
CREATE POLICY "Workspace members can view retention queue"
  ON video_retention_queue FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND is_workspace_member(auth.uid(), workspace_id)
  );

-- Service role for edge functions (cleanup jobs, webhooks)
CREATE POLICY "Service role manages retention queue"
  ON video_retention_queue FOR ALL
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  )
  WITH CHECK (
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );
