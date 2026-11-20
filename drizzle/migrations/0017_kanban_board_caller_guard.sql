ALTER FUNCTION public.get_kanban_board(uuid, text, uuid, boolean) RENAME TO get_kanban_board_unchecked;
REVOKE EXECUTE ON FUNCTION public.get_kanban_board_unchecked(uuid, text, uuid, boolean) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_kanban_board(p_workspace_id uuid, p_phase text, p_user_id uuid, p_is_collaborator boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_collab boolean := p_is_collaborator;
BEGIN
  IF NOT public.is_service_role() THEN
    IF v_uid IS NULL OR p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_workspace_member(v_uid, p_workspace_id) THEN
      RAISE EXCEPTION 'Access denied to workspace' USING ERRCODE = '42501';
    END IF;
    -- Visibility is decided server-side: without all-projects permission, only assigned projects.
    IF NOT COALESCE(public.has_workspace_permission(v_uid, p_workspace_id, 'visibility.all_projects'), false) THEN
      v_collab := true;
    END IF;
  END IF;
  RETURN public.get_kanban_board_unchecked(p_workspace_id, p_phase, p_user_id, v_collab);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_kanban_board(uuid, text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_kanban_board(uuid, text, uuid, boolean) TO authenticated, service_role;