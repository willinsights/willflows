
-- 1. Fix notify_chat_message: add SET search_path = 'public'
CREATE OR REPLACE FUNCTION public.notify_chat_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_id UUID;
  v_conversation_type TEXT;
  v_sender_name TEXT;
  v_conversation_name TEXT;
BEGIN
  -- Get conversation info
  SELECT c.workspace_id, c.type, c.name
  INTO v_workspace_id, v_conversation_type, v_conversation_name
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  -- Get sender name
  SELECT COALESCE(p.full_name, p.email, 'Alguém')
  INTO v_sender_name
  FROM profiles p
  WHERE p.id = NEW.user_id;

  -- Queue push notification for each conversation member (except sender)
  INSERT INTO push_notification_queue (user_id, title, body, data)
  SELECT
    cm.user_id,
    CASE 
      WHEN v_conversation_type = 'direct' THEN v_sender_name
      ELSE COALESCE(v_conversation_name, 'Chat')
    END,
    CASE 
      WHEN v_conversation_type = 'direct' THEN SUBSTRING(NEW.body, 1, 200)
      ELSE v_sender_name || ': ' || SUBSTRING(NEW.body, 1, 200)
    END,
    jsonb_build_object(
      'type', 'chat_message',
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.user_id
    )
  FROM conversation_members cm
  WHERE cm.conversation_id = NEW.conversation_id
    AND cm.user_id != NEW.user_id
    AND cm.is_muted = false;

  RETURN NEW;
END;
$function$;

-- 2. Fix push_notification_queue RLS: restrict to service_role only
DROP POLICY IF EXISTS "push_notification_queue_all" ON public.push_notification_queue;
DROP POLICY IF EXISTS "Allow all for push_notification_queue" ON public.push_notification_queue;
DROP POLICY IF EXISTS "Service role full access to push queue" ON public.push_notification_queue;
DROP POLICY IF EXISTS "Users can view own push notifications" ON public.push_notification_queue;

-- Only service_role (edge functions) can manage the queue
CREATE POLICY "Service role full access to push queue"
ON public.push_notification_queue
FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

-- Triggers insert via SECURITY DEFINER functions, so they bypass RLS
-- Users should only be able to read their own notifications (if needed)
CREATE POLICY "Users can view own push notifications"
ON public.push_notification_queue
FOR SELECT
USING (auth.uid() = user_id);

-- 3. Fix notify_payment_event: use has_workspace_permission instead of hardcoded roles
CREATE OR REPLACE FUNCTION public.notify_payment_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  member_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
  payment_amount TEXT;
  project_name TEXT;
BEGIN
  payment_amount := NEW.amount::TEXT || ' ' || NEW.currency;
  
  -- Get project name if exists
  IF NEW.project_id IS NOT NULL THEN
    SELECT name INTO project_name FROM projects WHERE id = NEW.project_id;
  END IF;
  
  -- Determine notification based on event
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_receivable THEN
      notification_title := 'Novo Pagamento a Receber';
      notification_message := 'Um pagamento de ' || payment_amount || ' foi registado' || COALESCE(' para o projeto "' || project_name || '"', '') || '.';
    ELSE
      notification_title := 'Nova Despesa Registada';
      notification_message := 'Uma despesa de ' || payment_amount || ' foi registada' || COALESCE(' no projeto "' || project_name || '"', '') || '.';
    END IF;
    notification_type := 'info';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if payment status changed to paid
    IF NEW.status = 'pago' AND OLD.status != 'pago' THEN
      IF NEW.is_receivable THEN
        notification_title := 'Pagamento Recebido';
        notification_message := 'O pagamento de ' || payment_amount || COALESCE(' do projeto "' || project_name || '"', '') || ' foi confirmado.';
        notification_type := 'success';
      ELSE
        notification_title := 'Pagamento Efetuado';
        notification_message := 'O pagamento de ' || payment_amount || ' foi efetuado.';
        notification_type := 'success';
      END IF;
    -- Check if payment is overdue
    ELSIF NEW.status = 'vencido' AND OLD.status != 'vencido' THEN
      notification_title := 'Pagamento Vencido';
      notification_message := 'O pagamento de ' || payment_amount || COALESCE(' do projeto "' || project_name || '"', '') || ' está vencido.';
      notification_type := 'warning';
    ELSE
      -- Don't notify for other updates
      RETURN NEW;
    END IF;
  END IF;
  
  -- Notify members with financial permissions (dynamic permission check)
  FOR member_record IN 
    SELECT wm.user_id FROM workspace_members wm
    WHERE wm.workspace_id = NEW.workspace_id 
    AND wm.is_active = true
    AND public.has_workspace_permission(wm.user_id, NEW.workspace_id, 'finances.view')
  LOOP
    INSERT INTO notifications (workspace_id, user_id, type, title, message, entity_type, entity_id)
    VALUES (NEW.workspace_id, member_record.user_id, notification_type, notification_title, notification_message, 'payment', NEW.id);
  END LOOP;
  
  RETURN NEW;
END;
$function$;
