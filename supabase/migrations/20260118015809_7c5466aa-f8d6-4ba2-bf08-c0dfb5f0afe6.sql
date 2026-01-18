-- Enable realtime for remaining tables (checking one by one)
DO $$ 
BEGIN
  -- Try to add followups to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.followups;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already added
  END;
  
  -- Try to add post_acknowledgments to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_acknowledgments;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- Try to add conversation_members to realtime  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Create function to handle mentions and create notifications
CREATE OR REPLACE FUNCTION notify_on_mention()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for mentioned user
  INSERT INTO public.notifications (
    workspace_id,
    user_id,
    type,
    title,
    message,
    entity_type,
    entity_id
  )
  SELECT 
    c.workspace_id,
    NEW.mentioned_user_id,
    'info',
    'Mencionado numa conversa',
    COALESCE(
      (SELECT COALESCE(p.full_name, p.email) FROM profiles p WHERE p.id = m.user_id) || ' mencionou-te: "' || SUBSTRING(m.body, 1, 100) || '"',
      'Foste mencionado numa mensagem'
    ),
    'message',
    NEW.message_id
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE m.id = NEW.message_id
  AND NEW.mentioned_user_id != m.user_id; -- Don't notify if user mentions themselves
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for mention notifications
DROP TRIGGER IF EXISTS trigger_notify_on_mention ON public.message_mentions;
CREATE TRIGGER trigger_notify_on_mention
  AFTER INSERT ON public.message_mentions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_mention();

-- Create function to notify when followup is assigned
CREATE OR REPLACE FUNCTION notify_on_followup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assigned to someone else
  IF NEW.assigned_to != NEW.created_by THEN
    INSERT INTO public.notifications (
      workspace_id,
      user_id,
      type,
      title,
      message,
      entity_type,
      entity_id
    )
    SELECT
      NEW.workspace_id,
      NEW.assigned_to,
      'info',
      'Novo FollowUp atribuído',
      COALESCE(
        (SELECT COALESCE(p.full_name, p.email) FROM profiles p WHERE p.id = NEW.created_by),
        'Alguém'
      ) || ' atribuiu-te um followup' || CASE WHEN NEW.note IS NOT NULL THEN ': "' || SUBSTRING(NEW.note, 1, 100) || '"' ELSE '' END,
      'followup',
      NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for followup notifications
DROP TRIGGER IF EXISTS trigger_notify_on_followup ON public.followups;
CREATE TRIGGER trigger_notify_on_followup
  AFTER INSERT ON public.followups
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_followup();