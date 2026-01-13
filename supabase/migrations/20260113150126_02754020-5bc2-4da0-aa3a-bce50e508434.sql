-- Função RPC para reabrir projeto
CREATE OR REPLACE FUNCTION public.reopen_project(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_id uuid;
  v_current_phase text;
  v_review_column_id uuid;
BEGIN
  -- Buscar workspace e fase atual
  SELECT workspace_id, current_phase
  INTO v_workspace_id, v_current_phase
  FROM projects
  WHERE id = p_project_id;
  
  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Projeto não encontrado');
  END IF;
  
  -- Buscar coluna "Em revisão" (última coluna não-final da fase)
  SELECT id INTO v_review_column_id
  FROM kanban_columns
  WHERE workspace_id = v_workspace_id
    AND phase = v_current_phase::kanban_phase
    AND is_final = false
  ORDER BY position DESC
  LIMIT 1;
  
  IF v_review_column_id IS NULL THEN
    -- Fallback: primeira coluna da fase
    SELECT id INTO v_review_column_id
    FROM kanban_columns
    WHERE workspace_id = v_workspace_id
      AND phase = v_current_phase::kanban_phase
    ORDER BY position ASC
    LIMIT 1;
  END IF;
  
  -- Atualizar projeto baseado na fase
  IF v_current_phase = 'captacao' THEN
    UPDATE projects
    SET is_delivered = false,
        delivered_at = null,
        captacao_column_id = v_review_column_id,
        updated_at = now()
    WHERE id = p_project_id;
  ELSE
    UPDATE projects
    SET is_delivered = false,
        delivered_at = null,
        edicao_column_id = v_review_column_id,
        updated_at = now()
    WHERE id = p_project_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_column_id', v_review_column_id,
    'phase', v_current_phase
  );
END;
$$;

-- Corrigir projetos entregues incorretamente (one-time fix)
DO $$
DECLARE
  invalid_project RECORD;
  review_col_id uuid;
BEGIN
  FOR invalid_project IN
    SELECT DISTINCT p.id, p.workspace_id, p.current_phase
    FROM projects p
    WHERE p.is_delivered = true
      AND p.item_type != 'reuniao'
      AND EXISTS (
        SELECT 1 
        FROM tasks t
        JOIN task_checklists tc ON tc.task_id = t.id
        WHERE t.project_id = p.id
          AND t.phase = p.current_phase::kanban_phase
          AND tc.is_completed = false
      )
  LOOP
    -- Buscar coluna "Em Revisão" para este projeto
    SELECT id INTO review_col_id
    FROM kanban_columns
    WHERE workspace_id = invalid_project.workspace_id
      AND phase = invalid_project.current_phase::kanban_phase
      AND is_final = false
    ORDER BY position DESC
    LIMIT 1;
    
    -- Atualizar projeto
    IF invalid_project.current_phase = 'captacao' THEN
      UPDATE projects
      SET is_delivered = false,
          delivered_at = null,
          captacao_column_id = review_col_id,
          updated_at = now()
      WHERE id = invalid_project.id;
    ELSE
      UPDATE projects
      SET is_delivered = false,
          delivered_at = null,
          edicao_column_id = review_col_id,
          updated_at = now()
      WHERE id = invalid_project.id;
    END IF;
    
    RAISE NOTICE 'Corrigido projeto: %', invalid_project.id;
  END LOOP;
END $$;