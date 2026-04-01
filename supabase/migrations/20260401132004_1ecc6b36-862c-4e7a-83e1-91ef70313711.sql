
-- 1. Fix existing projects in final columns that are not marked as delivered
UPDATE projects p
SET is_delivered = true, delivered_at = COALESCE(p.delivered_at, now())
FROM kanban_columns kc
WHERE (
  (p.current_phase = 'captacao' AND p.captacao_column_id = kc.id) OR
  (p.current_phase = 'edicao' AND p.edicao_column_id = kc.id)
)
AND kc.is_final = true
AND p.is_delivered = false;

-- 2. Create trigger to auto-sync delivery status with final columns
CREATE OR REPLACE FUNCTION public.sync_delivery_on_final_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_column_id uuid;
  v_is_final boolean;
BEGIN
  -- Determine which column to check based on current_phase
  IF NEW.current_phase = 'captacao' THEN
    v_column_id := NEW.captacao_column_id;
  ELSE
    v_column_id := NEW.edicao_column_id;
  END IF;

  -- Only act if the relevant column changed
  IF v_column_id IS NOT NULL AND (
    (NEW.current_phase = 'captacao' AND OLD.captacao_column_id IS DISTINCT FROM NEW.captacao_column_id) OR
    (NEW.current_phase = 'edicao' AND OLD.edicao_column_id IS DISTINCT FROM NEW.edicao_column_id)
  ) THEN
    SELECT is_final INTO v_is_final FROM kanban_columns WHERE id = v_column_id;

    IF v_is_final = true AND NEW.is_delivered = false THEN
      NEW.is_delivered := true;
      NEW.delivered_at := COALESCE(NEW.delivered_at, now());
    ELSIF v_is_final = false AND NEW.is_delivered = true THEN
      NEW.is_delivered := false;
      NEW.delivered_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_delivery_on_final_column
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_delivery_on_final_column();
