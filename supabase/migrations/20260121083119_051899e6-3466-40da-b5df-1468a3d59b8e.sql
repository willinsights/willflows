-- 1. Create SECURITY DEFINER function to check if user is a conversation member
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_conversation_member_secure(
  _conversation_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = _conversation_id
    AND user_id = _user_id
  );
$$;

-- 2. Create SECURITY DEFINER function to check if user can manage conversation members
-- (conversation creator OR workspace admin/editor)
CREATE OR REPLACE FUNCTION public.can_manage_conversation_members(
  _conversation_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Conversation creator
    SELECT 1 FROM conversations c
    WHERE c.id = _conversation_id AND c.created_by = _user_id
  ) OR EXISTS (
    -- Workspace admin/editor
    SELECT 1 FROM workspace_members wm
    JOIN conversations c ON c.workspace_id = wm.workspace_id
    WHERE c.id = _conversation_id
    AND wm.user_id = _user_id
    AND wm.role IN ('admin', 'editor')
    AND wm.is_active = true
  );
$$;

-- 3. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view conversation memberships" ON conversation_members;
DROP POLICY IF EXISTS "Users can manage conversation membership" ON conversation_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON conversation_members;

-- 4. Create new SELECT policy using SECURITY DEFINER function
CREATE POLICY "Users can view conversation memberships" ON conversation_members
FOR SELECT TO authenticated
USING (
  public.is_conversation_member_secure(conversation_id, auth.uid())
);

-- 5. Create new INSERT policy using SECURITY DEFINER function
CREATE POLICY "Users can add conversation members" ON conversation_members
FOR INSERT TO authenticated
WITH CHECK (
  -- Can manage members (creator or workspace admin/editor)
  public.can_manage_conversation_members(conversation_id, auth.uid())
  OR
  -- User adding themselves to a public channel
  (user_id = auth.uid() AND is_public_channel_in_user_workspace(conversation_id, auth.uid()))
);