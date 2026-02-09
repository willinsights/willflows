
CREATE OR REPLACE FUNCTION public.can_manage_conversation_members(_conversation_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Conversation creator
    SELECT 1 FROM conversations c
    WHERE c.id = _conversation_id AND c.created_by = _user_id
  ) OR EXISTS (
    -- Workspace admin/edicao
    SELECT 1 FROM workspace_members wm
    JOIN conversations c ON c.workspace_id = wm.workspace_id
    WHERE c.id = _conversation_id
    AND wm.user_id = _user_id
    AND wm.role IN ('admin', 'edicao')
    AND wm.is_active = true
  );
$$;
