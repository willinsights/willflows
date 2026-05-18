CREATE OR REPLACE FUNCTION public.reorder_kanban_columns(
  p_workspace_id uuid,
  p_phase text,
  p_positions jsonb  -- [{ "id": "<uuid>", "position": 0 }, ...]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_final_id uuid;
  v_final_position int;
  v_max_position int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_workspace_member(v_caller, p_workspace_id) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  -- Ensure the "final" (delivered) column stays last
  SELECT id INTO v_final_id
  FROM public.kanban_columns
  WHERE workspace_id = p_workspace_id
    AND phase = p_phase
    AND is_final = true
  LIMIT 1;

  IF v_final_id IS NOT NULL THEN
    SELECT (elem->>'position')::int INTO v_final_position
    FROM jsonb_array_elements(p_positions) AS elem
    WHERE (elem->>'id')::uuid = v_final_id;

    SELECT MAX((elem->>'position')::int) INTO v_max_position
    FROM jsonb_array_elements(p_positions) AS elem;

    IF v_final_position IS NOT NULL AND v_final_position <> v_max_position THEN
      RAISE EXCEPTION 'Final column must remain the last position';
    END IF;
  END IF;

  -- Apply all updates in a single statement
  UPDATE public.kanban_columns kc
  SET position = (upd->>'position')::int,
      updated_at = now()
  FROM jsonb_array_elements(p_positions) AS upd
  WHERE kc.id = (upd->>'id')::uuid
    AND kc.workspace_id = p_workspace_id
    AND kc.phase = p_phase;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_kanban_columns(uuid, text, jsonb) TO authenticated;