-- Fix SELECT policy: Allow users to see all members of conversations they participate in
DROP POLICY IF EXISTS "Users can view own memberships" ON conversation_members;

CREATE POLICY "Users can view conversation memberships" ON conversation_members
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id
    AND cm.user_id = auth.uid()
  )
);

-- Fix INSERT policy: Allow conversation creators and workspace admins to add members
DROP POLICY IF EXISTS "Users can manage conversation membership" ON conversation_members;

CREATE POLICY "Users can manage conversation membership" ON conversation_members
FOR INSERT TO authenticated
WITH CHECK (
  -- Conversation creator can add any member
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_members.conversation_id
    AND c.created_by = auth.uid()
  )
  OR
  -- Workspace admin/editor can add any member
  EXISTS (
    SELECT 1 FROM workspace_members wm
    JOIN conversations c ON c.workspace_id = wm.workspace_id
    WHERE c.id = conversation_members.conversation_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'editor')
    AND wm.is_active = true
  )
  OR
  -- User can add themselves to public channels
  (
    user_id = auth.uid()
    AND is_public_channel_in_user_workspace(conversation_id, auth.uid())
  )
);