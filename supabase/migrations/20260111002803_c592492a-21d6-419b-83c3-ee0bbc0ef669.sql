-- Enable REPLICA IDENTITY FULL for notifications table for realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Function to create notification for project events
CREATE OR REPLACE FUNCTION public.notify_project_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
  project_name TEXT;
BEGIN
  project_name := NEW.name;
  
  -- Determine notification based on event
  IF TG_OP = 'INSERT' THEN
    notification_title := 'Novo Projeto Criado';
    notification_message := 'O projeto "' || project_name || '" foi criado.';
    notification_type := 'info';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if project was delivered
    IF NEW.is_delivered = true AND (OLD.is_delivered IS NULL OR OLD.is_delivered = false) THEN
      notification_title := 'Projeto Entregue';
      notification_message := 'O projeto "' || project_name || '" foi marcado como entregue.';
      notification_type := 'success';
    -- Check if phase changed
    ELSIF NEW.current_phase != OLD.current_phase THEN
      notification_title := 'Fase do Projeto Alterada';
      notification_message := 'O projeto "' || project_name || '" passou para a fase de ' || NEW.current_phase || '.';
      notification_type := 'info';
    ELSE
      -- Don't notify for other updates
      RETURN NEW;
    END IF;
  END IF;
  
  -- Notify all active members of the workspace (except the creator for INSERT)
  FOR member_record IN 
    SELECT user_id FROM workspace_members 
    WHERE workspace_id = NEW.workspace_id 
    AND is_active = true
    AND (TG_OP != 'INSERT' OR user_id != NEW.created_by)
  LOOP
    INSERT INTO notifications (workspace_id, user_id, type, title, message, entity_type, entity_id)
    VALUES (NEW.workspace_id, member_record.user_id, notification_type, notification_title, notification_message, 'project', NEW.id);
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to create notification for task events
CREATE OR REPLACE FUNCTION public.notify_task_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  task_title TEXT;
  project_name TEXT;
BEGIN
  task_title := NEW.title;
  
  -- Get project name
  SELECT name INTO project_name FROM projects WHERE id = NEW.project_id;
  
  -- Notify assignees when task is created or assigned
  IF TG_OP = 'INSERT' THEN
    notification_title := 'Nova Tarefa Atribuída';
    notification_message := 'A tarefa "' || task_title || '" no projeto "' || COALESCE(project_name, 'N/A') || '" foi-lhe atribuída.';
    
    -- Notify all assignees
    FOR assignee_record IN 
      SELECT user_id FROM task_assignees 
      WHERE task_id = NEW.id
      AND user_id != NEW.created_by
    LOOP
      INSERT INTO notifications (workspace_id, user_id, type, title, message, entity_type, entity_id)
      VALUES (NEW.workspace_id, assignee_record.user_id, 'info', notification_title, notification_message, 'task', NEW.id);
    END LOOP;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Notify when task is completed
    IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
      notification_title := 'Tarefa Concluída';
      notification_message := 'A tarefa "' || task_title || '" foi concluída.';
      
      -- Notify the task creator if different from who completed
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (workspace_id, user_id, type, title, message, entity_type, entity_id)
        VALUES (NEW.workspace_id, NEW.created_by, 'success', notification_title, notification_message, 'task', NEW.id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create notification for payment events
CREATE OR REPLACE FUNCTION public.notify_payment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Notify admins and editors of the workspace
  FOR member_record IN 
    SELECT user_id FROM workspace_members 
    WHERE workspace_id = NEW.workspace_id 
    AND is_active = true
    AND role IN ('admin', 'editor')
  LOOP
    INSERT INTO notifications (workspace_id, user_id, type, title, message, entity_type, entity_id)
    VALUES (NEW.workspace_id, member_record.user_id, notification_type, notification_title, notification_message, 'payment', NEW.id);
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create triggers for project notifications
DROP TRIGGER IF EXISTS trigger_notify_project_insert ON projects;
CREATE TRIGGER trigger_notify_project_insert
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_event();

DROP TRIGGER IF EXISTS trigger_notify_project_update ON projects;
CREATE TRIGGER trigger_notify_project_update
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_event();

-- Create triggers for task notifications
DROP TRIGGER IF EXISTS trigger_notify_task_insert ON tasks;
CREATE TRIGGER trigger_notify_task_insert
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_event();

DROP TRIGGER IF EXISTS trigger_notify_task_update ON tasks;
CREATE TRIGGER trigger_notify_task_update
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_event();

-- Create triggers for payment notifications
DROP TRIGGER IF EXISTS trigger_notify_payment_insert ON payments;
CREATE TRIGGER trigger_notify_payment_insert
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_event();

DROP TRIGGER IF EXISTS trigger_notify_payment_update ON payments;
CREATE TRIGGER trigger_notify_payment_update
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_event();