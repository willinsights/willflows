CREATE OR REPLACE FUNCTION public.activate_chat_on_mention()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conversation_id uuid;
BEGIN
  SELECT conversation_id INTO v_conversation_id FROM messages WHERE id = NEW.message_id;
  UPDATE conversation_members SET is_active = true
   WHERE conversation_id = v_conversation_id AND user_id = NEW.mentioned_user_id;
  IF NOT FOUND AND public.is_public_channel_in_user_workspace(v_conversation_id, NEW.mentioned_user_id) THEN
    INSERT INTO conversation_members (conversation_id, user_id, role, is_active)
    VALUES (v_conversation_id, NEW.mentioned_user_id, 'member', true)
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET is_active = true;
  END IF;
  RETURN NEW;
END; $$;

DROP POLICY IF EXISTS "Message author can add mentions" ON public.message_mentions;
CREATE POLICY "Message author can add mentions" ON public.message_mentions
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_mentions.message_id AND m.user_id = auth.uid()
      AND (
        EXISTS (SELECT 1 FROM conversation_members cm
                WHERE cm.conversation_id = m.conversation_id AND cm.user_id = message_mentions.mentioned_user_id)
        OR public.is_public_channel_in_user_workspace(m.conversation_id, message_mentions.mentioned_user_id)
      )
  )
);