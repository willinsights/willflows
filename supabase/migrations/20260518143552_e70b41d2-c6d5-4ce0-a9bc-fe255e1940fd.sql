
-- ============================================================
-- C-1 + C-2: RPC get_kanban_board + workspace_id em tabelas
-- relacionadas (necessário para filtros realtime)
-- ============================================================

-- 1) Adicionar workspace_id a task_checklists e project_team
ALTER TABLE public.task_checklists
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

ALTER TABLE public.project_team
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- 2) Backfill a partir de tasks/projects
UPDATE public.task_checklists tc
SET workspace_id = t.workspace_id
FROM public.tasks t
WHERE tc.task_id = t.id
  AND tc.workspace_id IS NULL;

UPDATE public.project_team pt
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE pt.project_id = p.id
  AND pt.workspace_id IS NULL;

-- 3) Triggers para manter workspace_id sincronizado
CREATE OR REPLACE FUNCTION public.set_task_checklist_workspace_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.task_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id
    FROM public.tasks WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_checklists_workspace_id ON public.task_checklists;
CREATE TRIGGER trg_task_checklists_workspace_id
BEFORE INSERT OR UPDATE OF task_id ON public.task_checklists
FOR EACH ROW
EXECUTE FUNCTION public.set_task_checklist_workspace_id();

CREATE OR REPLACE FUNCTION public.set_project_team_workspace_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id
    FROM public.projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_team_workspace_id ON public.project_team;
CREATE TRIGGER trg_project_team_workspace_id
BEFORE INSERT OR UPDATE OF project_id ON public.project_team
FOR EACH ROW
EXECUTE FUNCTION public.set_project_team_workspace_id();

-- 4) Índices para acelerar realtime e queries
CREATE INDEX IF NOT EXISTS idx_task_checklists_workspace_id
  ON public.task_checklists(workspace_id);

CREATE INDEX IF NOT EXISTS idx_project_team_workspace_id
  ON public.project_team(workspace_id);

-- 5) RPC consolidada: get_kanban_board
-- Substitui 6-8 queries sequenciais por 1 chamada agregada.
CREATE OR REPLACE FUNCTION public.get_kanban_board(
  p_workspace_id uuid,
  p_phase text,
  p_user_id uuid,
  p_is_collaborator boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_column_field text;
  v_assigned_ids uuid[];
BEGIN
  -- Verificação de acesso ao workspace
  IF NOT public.is_workspace_member(p_user_id, p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied to workspace';
  END IF;

  v_column_field := CASE WHEN p_phase = 'captacao' THEN 'captacao_column_id' ELSE 'edicao_column_id' END;

  -- Para colaborador: obter projetos atribuídos
  IF p_is_collaborator THEN
    SELECT COALESCE(array_agg(DISTINCT project_id), ARRAY[]::uuid[])
    INTO v_assigned_ids
    FROM public.project_team
    WHERE user_id = p_user_id;
  END IF;

  WITH cols AS (
    SELECT id, workspace_id, phase, name, color, position, is_final, created_at, updated_at
    FROM public.kanban_columns
    WHERE workspace_id = p_workspace_id
      AND phase = p_phase::kanban_phase
    ORDER BY position ASC
  ),
  filtered_projects AS (
    SELECT p.*
    FROM public.projects p
    WHERE p.workspace_id = p_workspace_id
      AND p.current_phase::text = p_phase
      AND COALESCE(p.item_type, '') != 'reuniao'
      AND (
        NOT p_is_collaborator
        OR p.id = ANY(v_assigned_ids)
      )
  ),
  task_aggs AS (
    SELECT
      t.project_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE t.is_completed) AS completed
    FROM public.tasks t
    WHERE t.project_id IN (SELECT id FROM filtered_projects)
    GROUP BY t.project_id
  ),
  checklist_aggs AS (
    SELECT
      t.project_id,
      COUNT(tc.*) AS total,
      COUNT(tc.*) FILTER (WHERE tc.is_completed) AS completed
    FROM public.task_checklists tc
    JOIN public.tasks t ON t.id = tc.task_id
    WHERE t.project_id IN (SELECT id FROM filtered_projects)
    GROUP BY t.project_id
  ),
  team_aggs AS (
    SELECT
      pt.project_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', pt.user_id,
          'phase', pt.phase,
          'profile', CASE
            WHEN pr.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'full_name', pr.full_name,
              'avatar_url', pr.avatar_url,
              'email', pr.email
            )
          END
        )
      ) AS members
    FROM public.project_team pt
    LEFT JOIN public.profiles pr ON pr.id = pt.user_id
    WHERE pt.project_id IN (SELECT id FROM filtered_projects)
      AND pt.user_id IS NOT NULL
    GROUP BY pt.project_id
  ),
  approved AS (
    SELECT DISTINCT project_id
    FROM public.video_approvals
    WHERE project_id IN (SELECT id FROM filtered_projects)
      AND project_id IS NOT NULL
  ),
  clients_map AS (
    SELECT id, name FROM public.clients
    WHERE id IN (SELECT client_id FROM filtered_projects WHERE client_id IS NOT NULL)
  ),
  projects_enriched AS (
    SELECT
      to_jsonb(fp.*)
        || jsonb_build_object(
          'clients', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('name', c.name) END,
          'task_count', COALESCE(ta.total, 0),
          'task_completed', COALESCE(ta.completed, 0),
          'checklist_count', COALESCE(ca.total, 0),
          'checklist_completed', COALESCE(ca.completed, 0),
          'team_members', COALESCE(tm.members, '[]'::jsonb),
          'has_approved_video', (ap.project_id IS NOT NULL)
        ) AS project_json,
      fp.id AS project_id,
      CASE WHEN p_phase = 'captacao' THEN fp.captacao_column_id ELSE fp.edicao_column_id END AS column_id
    FROM filtered_projects fp
    LEFT JOIN clients_map c ON c.id = fp.client_id
    LEFT JOIN task_aggs ta ON ta.project_id = fp.id
    LEFT JOIN checklist_aggs ca ON ca.project_id = fp.id
    LEFT JOIN team_aggs tm ON tm.project_id = fp.id
    LEFT JOIN approved ap ON ap.project_id = fp.id
  )
  SELECT jsonb_build_object(
    'columns', COALESCE(
      jsonb_agg(
        to_jsonb(cols.*) || jsonb_build_object(
          'projects', COALESCE((
            SELECT jsonb_agg(pe.project_json)
            FROM projects_enriched pe
            WHERE pe.column_id = cols.id
          ), '[]'::jsonb)
        )
        ORDER BY cols.position ASC
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM cols;

  RETURN COALESCE(v_result, jsonb_build_object('columns', '[]'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kanban_board(uuid, text, uuid, boolean) TO authenticated;
