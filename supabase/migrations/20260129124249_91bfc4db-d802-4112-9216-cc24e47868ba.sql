-- Trigger to add tasks to retention queue when approved/completed
CREATE OR REPLACE FUNCTION public.queue_video_retention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_videos BOOLEAN;
  v_retention_days INTEGER := 14; -- Default retention period
BEGIN
  -- Only process if task becomes completed
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    -- Check if this task has any video versions
    SELECT EXISTS (
      SELECT 1 FROM video_versions WHERE task_id = NEW.id
    ) INTO v_has_videos;
    
    IF v_has_videos THEN
      -- Insert into retention queue
      INSERT INTO video_retention_queue (
        task_id,
        workspace_id,
        retention_days,
        scheduled_deletion_at,
        status
      ) VALUES (
        NEW.id,
        NEW.workspace_id,
        v_retention_days,
        NOW() + (v_retention_days || ' days')::INTERVAL,
        'pending'
      )
      ON CONFLICT (task_id) DO UPDATE SET
        scheduled_deletion_at = NOW() + (v_retention_days || ' days')::INTERVAL,
        status = 'pending',
        notified_at = NULL;
    END IF;
  END IF;
  
  -- If task is reopened, cancel the retention
  IF NEW.is_completed = false AND OLD.is_completed = true THEN
    UPDATE video_retention_queue
    SET status = 'cancelled'
    WHERE task_id = NEW.id AND status IN ('pending', 'notified');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add unique constraint on task_id for upsert
ALTER TABLE public.video_retention_queue
ADD CONSTRAINT video_retention_queue_task_id_key UNIQUE (task_id);

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS trigger_queue_video_retention ON public.tasks;
CREATE TRIGGER trigger_queue_video_retention
  AFTER UPDATE OF is_completed ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_video_retention();

-- Trigger on video_approvals to start retention when a video is approved
CREATE OR REPLACE FUNCTION public.queue_video_retention_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_retention_days INTEGER := 14;
BEGIN
  -- Get workspace from the task
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
$$;

DROP TRIGGER IF EXISTS trigger_queue_video_retention_on_approval ON public.video_approvals;
CREATE TRIGGER trigger_queue_video_retention_on_approval
  AFTER INSERT ON public.video_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_video_retention_on_approval();