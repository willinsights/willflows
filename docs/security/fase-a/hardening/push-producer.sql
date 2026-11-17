BEGIN;
-- Separate isolated candidate. Never deduplicate by title/tag/content.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.push_notification_queue
    WHERE data->>'type'='chat_message' AND data->>'message_id' IS NOT NULL
    GROUP BY user_id,(data->>'message_id') HAVING count(*)>1)
  THEN RAISE EXCEPTION 'Existing chat identities require authorised review'; END IF;
END $$;
CREATE UNIQUE INDEX push_chat_event_recipient ON public.push_notification_queue(user_id,(data->>'message_id'))
  WHERE data->>'type'='chat_message' AND data->>'message_id' IS NOT NULL;
CREATE OR REPLACE FUNCTION public.notify_chat_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sender_name text; conversation_name text;
BEGIN
  IF NEW.type='system' OR NEW.is_deleted IS TRUE THEN RETURN NEW; END IF;
  SELECT coalesce(full_name,email,'Alguém') INTO sender_name FROM public.profiles WHERE id=NEW.user_id;
  SELECT name INTO conversation_name FROM public.conversations WHERE id=NEW.conversation_id;
  INSERT INTO public.push_notification_queue(user_id,title,body,data)
  SELECT cm.user_id,coalesce(conversation_name,'Chat'),coalesce(sender_name,'Alguém')||': '||substring(NEW.body,1,200),
    jsonb_build_object('type','chat_message','conversation_id',NEW.conversation_id,
      'entityId',NEW.conversation_id,'message_id',NEW.id,'sender_id',NEW.user_id)
  FROM public.conversation_members cm WHERE cm.conversation_id=NEW.conversation_id
    AND cm.user_id<>NEW.user_id AND cm.is_muted=false AND cm.is_active=true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
-- Trigger-only function; preserve trigger name and no second producer.
REVOKE ALL ON FUNCTION public.notify_chat_message() FROM PUBLIC,anon,authenticated;
COMMIT;