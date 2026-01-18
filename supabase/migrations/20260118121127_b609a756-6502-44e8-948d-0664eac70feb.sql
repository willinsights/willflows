-- Fix conversations INSERT policy (was comparing wm.workspace_id = wm.workspace_id instead of conversations.workspace_id)
DROP POLICY IF EXISTS "Workspace members can create conversations" ON public.conversations;

CREATE POLICY "Workspace members can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = conversations.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.is_active = true
  )
  AND created_by = auth.uid()
);

-- Fix conversation_members INSERT policy to allow creator to add themselves
DROP POLICY IF EXISTS "Users can join public channels or be added by admins" ON public.conversation_members;

CREATE POLICY "Users can manage conversation membership"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can add themselves if:
  (user_id = auth.uid() AND (
    -- It's a public channel in their workspace
    is_public_channel_in_user_workspace(conversation_id, auth.uid())
    -- OR they are the conversation creator
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  ))
  -- OR they are admin/editor of the workspace and can add anyone
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    JOIN conversations c ON c.workspace_id = wm.workspace_id
    WHERE c.id = conversation_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'editor')
      AND wm.is_active = true
  )
);