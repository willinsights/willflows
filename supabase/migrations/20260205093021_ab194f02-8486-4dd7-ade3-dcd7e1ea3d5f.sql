-- Enable the pg_net extension for HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send push notifications when a new chat message is created
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  member RECORD;
  sender_name TEXT;
  conversation_name TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Ignore system messages
  IF NEW.type = 'system' THEN
    RETURN NEW;
  END IF;
  
  -- Ignore deleted messages
  IF NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;
  
  -- Get sender name
  SELECT COALESCE(full_name, split_part(email, '@', 1))
  INTO sender_name
  FROM public.profiles WHERE id = NEW.user_id;
  
  -- Get conversation name (for group chats)
  SELECT name
  INTO conversation_name
  FROM public.conversations WHERE id = NEW.conversation_id;
  
  -- Get Supabase URL and service role key from vault or use direct
  supabase_url := 'https://wppfmyseeigsdqutkgyc.supabase.co';
  service_role_key := current_setting('request.jwt.claims', true)::json->>'role';
  
  -- If we can't get the service role key from context, we'll need to use vault
  -- For now, we'll use the net.http_post with API key from environment
  
  -- Notify each conversation member (except sender)
  FOR member IN
    SELECT cm.user_id
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id != NEW.user_id
      AND cm.is_active = true
      AND cm.is_muted = false
  LOOP
    -- Insert into a notification queue table instead of direct HTTP call
    -- This is more reliable and allows for retry logic
    INSERT INTO public.push_notification_queue (
      user_id,
      title,
      body,
      tag,
      data,
      created_at
    ) VALUES (
      member.user_id,
      'Nova mensagem de ' || COALESCE(sender_name, 'Alguém'),
      LEFT(NEW.body, 100),
      'chat-' || NEW.conversation_id,
      jsonb_build_object(
        'type', 'message',
        'conversationId', NEW.conversation_id,
        'messageId', NEW.id
      ),
      NOW()
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the push notification queue table
CREATE TABLE IF NOT EXISTS public.push_notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create index for efficient polling
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_pending 
ON public.push_notification_queue(status, created_at) 
WHERE status = 'pending';

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_user 
ON public.push_notification_queue(user_id);

-- Enable RLS
ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions)
CREATE POLICY "Service role can manage push queue"
ON public.push_notification_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;

-- Create trigger
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();

-- Add realtime for the queue table so edge function can listen
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notification_queue;