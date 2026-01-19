-- Fix RLS policies for conversations table to allow project chat creation

-- 1. Drop existing INSERT policy
DROP POLICY IF EXISTS "Workspace members can create conversations" ON public.conversations;

-- 2. Create new INSERT policy using security definer function
CREATE POLICY "Workspace members can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND created_by = auth.uid()
);

-- 3. Drop existing SELECT policy
DROP POLICY IF EXISTS "Members can view their conversations" ON public.conversations;

-- 4. Create new SELECT policy that includes creator access
CREATE POLICY "Members can view their conversations"
ON public.conversations
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_conversation_member(id, auth.uid())
  OR public.is_public_channel_in_user_workspace(id, auth.uid())
);