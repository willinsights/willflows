-- Fix infinite recursion in chat RLS policies

-- 1. Drop problematic policies
DROP POLICY IF EXISTS "Members can view conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Admins can manage conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Members can view conversations" ON conversations;
DROP POLICY IF EXISTS "Members can view messages" ON messages;
DROP POLICY IF EXISTS "Members can send messages" ON messages;

-- 2. Create helper function (SECURITY DEFINER) to check membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id 
    AND user_id = p_user_id
  );
$$;

-- 3. Function to check if it's a public channel in user's workspace
CREATE OR REPLACE FUNCTION public.is_public_channel_in_user_workspace(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = p_conversation_id
    AND c.type = 'channel'
    AND c.is_private = false
    AND wm.user_id = p_user_id
    AND wm.is_active = true
  );
$$;

-- 4. New policy for conversation_members (SELECT)
CREATE POLICY "Users can view own memberships" 
ON conversation_members FOR SELECT
USING (user_id = auth.uid());

-- 5. New policy for conversation_members (INSERT) 
CREATE POLICY "Users can join public channels or be added by admins"
ON conversation_members FOR INSERT
WITH CHECK (
  (user_id = auth.uid() AND public.is_public_channel_in_user_workspace(conversation_id, auth.uid()))
  OR
  EXISTS (
    SELECT 1 FROM workspace_members wm
    JOIN conversations c ON c.workspace_id = wm.workspace_id
    WHERE c.id = conversation_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'editor')
    AND wm.is_active = true
  )
);

-- 6. Policy for conversation_members (DELETE)
CREATE POLICY "Users can leave or admins can remove"
ON conversation_members FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    JOIN conversations c ON c.workspace_id = wm.workspace_id
    WHERE c.id = conversation_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'editor')
    AND wm.is_active = true
  )
);

-- 7. New policy for conversations (SELECT)
CREATE POLICY "Members can view their conversations" 
ON conversations FOR SELECT
USING (
  public.is_conversation_member(id, auth.uid())
  OR public.is_public_channel_in_user_workspace(id, auth.uid())
);

-- 8. New policy for messages (SELECT)
CREATE POLICY "Members can view conversation messages"
ON messages FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

-- 9. New policy for messages (INSERT)
CREATE POLICY "Members can send conversation messages"
ON messages FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND public.is_conversation_member(conversation_id, auth.uid())
);