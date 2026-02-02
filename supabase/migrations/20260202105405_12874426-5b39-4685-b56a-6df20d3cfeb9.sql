CREATE OR REPLACE FUNCTION public.deliver_project(
  p_project_id uuid,
  p_phase text,
  p_target_column_id uuid,
  p_delivered_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_deliver jsonb;
  v_item_type text;
  v_actual_delivered_at timestamptz;
BEGIN
  v_actual_delivered_at := COALESCE(p_delivered_at, now());
  
  v_can_deliver := public.can_deliver_project(p_project_id, p_phase);
  
  IF NOT (v_can_deliver->>'can_deliver')::boolean THEN
    RETURN v_can_deliver;
  END IF;
  
  SELECT COALESCE(item_type, 'projeto_completo')
  INTO v_item_type
  FROM projects
  WHERE id = p_project_id;
  
  IF p_phase = 'captacao' THEN
    UPDATE projects
    SET captacao_column_id = p_target_column_id,
        is_delivered = true,
        delivered_at = v_actual_delivered_at,
        updated_at = now()
    WHERE id = p_project_id;
  ELSE
    UPDATE projects
    SET edicao_column_id = p_target_column_id,
        is_delivered = true,
        delivered_at = v_actual_delivered_at,
        updated_at = now()
    WHERE id = p_project_id;
  END IF;
  
  RETURN jsonb_build_object(
    'can_deliver', true,
    'reason', null,
    'pending_tasks', 0,
    'pending_checklists', 0
  );
END;
$$;