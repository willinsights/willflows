-- Fix conversation_members RLS policies to properly handle INSERT and UPDATE separately
-- This resolves the "new row violates row-level security policy" error when marking messages as read

-- 1. Drop the problematic ALL policy (has WITH CHECK but no USING, causing UPDATE to fail)
DROP POLICY IF EXISTS "Users can add conversation members" ON conversation_members;

-- 2. Create specific INSERT policy
CREATE POLICY "Users can insert conversation members"
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

-- 3. Drop existing UPDATE policy and create a more flexible one
DROP POLICY IF EXISTS "Users can update own membership" ON conversation_members;

CREATE POLICY "Users can update conversation membership"
ON conversation_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  can_manage_conversation_members(conversation_id, auth.uid())
)
WITH CHECK (
  user_id = auth.uid() 
  OR 
  can_manage_conversation_members(conversation_id, auth.uid())
);