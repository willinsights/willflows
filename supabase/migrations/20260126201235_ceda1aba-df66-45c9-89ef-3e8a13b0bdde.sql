-- Create helper function to check if conversation is a project chat in user's workspace
CREATE OR REPLACE FUNCTION public.is_project_chat_in_user_workspace(
  p_conversation_id uuid, 
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = p_conversation_id
    AND c.type = 'project'
    AND wm.user_id = p_user_id
    AND wm.is_active = true
  );
$$;

-- Update the INSERT policy on conversation_members to allow workspace members to join project chats
DROP POLICY IF EXISTS "Users can add conversation members" ON conversation_members;

CREATE POLICY "Users can add conversation members"
ON conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  can_manage_conversation_members(conversation_id, auth.uid())
  OR
  (user_id = auth.uid() AND is_public_channel_in_user_workspace(conversation_id, auth.uid()))
  OR
  (user_id = auth.uid() AND is_project_chat_in_user_workspace(conversation_id, auth.uid()))
);