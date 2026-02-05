-- Remove the overly permissive policy that bypasses privacy checks
-- The "Users can view calendar events in their workspace" policy already correctly filters:
-- (is_private = false) OR (created_by = auth.uid())
DROP POLICY IF EXISTS "Members can view calendar events" ON calendar_events;