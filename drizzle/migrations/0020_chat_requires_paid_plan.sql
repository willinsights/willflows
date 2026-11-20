DROP POLICY IF EXISTS "Members can send conversation messages" ON public.messages;
CREATE POLICY "Members can send conversation messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND public.is_conversation_member(conversation_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND public.can_access_feature(c.workspace_id, 'chat')
  )
);