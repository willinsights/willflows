CREATE OR REPLACE FUNCTION public.queue_video_retention_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_id UUID;
  v_retention_days INTEGER := 7;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM tasks WHERE id = NEW.task_id;
  
  IF v_workspace_id IS NOT NULL THEN
    INSERT INTO video_retention_queue (
      task_id,
      workspace_id,
      retention_days,
      scheduled_deletion_at,
      status
    ) VALUES (
      NEW.task_id,
      v_workspace_id,
      v_retention_days,
      NOW() + (v_retention_days || ' days')::INTERVAL,
      'pending'
    )
    ON CONFLICT (task_id) DO UPDATE SET
      scheduled_deletion_at = NOW() + (v_retention_days || ' days')::INTERVAL,
      status = 'pending',
      notified_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;