-- Atualizar função para contar apenas projetos ativos (captacao e edicao)
CREATE OR REPLACE FUNCTION public.count_total_projects(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(COUNT(*)::int, 0)
  FROM public.projects p
  JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
  WHERE wm.user_id = p_user_id
    AND wm.role = 'admin'
    AND wm.is_active = true
    AND p.current_phase IN ('captacao', 'edicao');
$$;