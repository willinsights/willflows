-- Refine helper to rely on existing membership check (avoids potential RLS/force-rls on workspace_members)
CREATE OR REPLACE FUNCTION public.is_project_chat_in_user_workspace(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND c.type = 'project'
      AND public.is_workspace_member(p_user_id, c.workspace_id)
  );
$$;