-- Add Cloudflare R2/Stream columns to video_versions
ALTER TABLE public.video_versions 
ADD COLUMN IF NOT EXISTS cloudflare_stream_uid TEXT,
ADD COLUMN IF NOT EXISTS r2_key TEXT,
ADD COLUMN IF NOT EXISTS stream_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stream_playback_url TEXT,
ADD COLUMN IF NOT EXISTS stream_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for Cloudflare Stream lookups
CREATE INDEX IF NOT EXISTS idx_video_versions_stream_uid 
ON public.video_versions(cloudflare_stream_uid) 
WHERE cloudflare_stream_uid IS NOT NULL;

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_video_versions_stream_status 
ON public.video_versions(stream_status) 
WHERE stream_status IS NOT NULL;

-- Create RPC function to add storage (used by edge function)
CREATE OR REPLACE FUNCTION public.add_workspace_storage(p_workspace_id UUID, p_bytes BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE workspace_storage
  SET 
    storage_used_bytes = COALESCE(storage_used_bytes, 0) + p_bytes,
    last_calculated_at = NOW()
  WHERE workspace_id = p_workspace_id;
  
  -- If no row updated, create one
  IF NOT FOUND THEN
    INSERT INTO workspace_storage (workspace_id, storage_used_bytes, storage_limit_bytes)
    VALUES (p_workspace_id, p_bytes, 10737418240); -- 10GB default
  END IF;
END;
$$;

-- Update the video retention trigger to work with task status = 'finalizada'
-- and use 7 days instead of 14
CREATE OR REPLACE FUNCTION public.queue_video_retention()
RETURNS TRIGGER AS $$
DECLARE
  v_has_videos BOOLEAN;
  v_retention_days INTEGER := 7;
BEGIN
  -- Check if task status changed to 'finalizada' (completed/delivered)
  IF NEW.status = 'finalizada' AND (OLD.status IS NULL OR OLD.status != 'finalizada') THEN
    
    SELECT EXISTS (
      SELECT 1 FROM video_versions WHERE task_id = NEW.id AND is_deleted = false
    ) INTO v_has_videos;
    
    IF v_has_videos THEN
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
  
  -- If task is reopened (leaves 'finalizada' status), cancel the retention
  IF OLD.status = 'finalizada' AND NEW.status != 'finalizada' THEN
    UPDATE video_retention_queue
    SET status = 'cancelled'
    WHERE task_id = NEW.id AND status IN ('pending', 'notified');
  END IF;
  
  -- Also check for is_completed = true as fallback (legacy behavior)
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    SELECT EXISTS (
      SELECT 1 FROM video_versions WHERE task_id = NEW.id AND is_deleted = false
    ) INTO v_has_videos;
    
    IF v_has_videos THEN
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
      ON CONFLICT (task_id) DO NOTHING;
    END IF;
  END IF;
  
  -- If task is reopened (is_completed becomes false), cancel the retention
  IF NEW.is_completed = false AND OLD.is_completed = true THEN
    UPDATE video_retention_queue
    SET status = 'cancelled'
    WHERE task_id = NEW.id AND status IN ('pending', 'notified');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;