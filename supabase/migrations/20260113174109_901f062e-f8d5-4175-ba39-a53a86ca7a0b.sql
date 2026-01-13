CREATE OR REPLACE FUNCTION public.can_deliver_project(p_project_id uuid, p_phase text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item_type text;
  v_current_phase text;
  v_should_validate boolean := false;
  v_phase_to_validate text;
  v_pending_tasks int := 0;
  v_pending_checklists int := 0;
  v_task_ids uuid[];
BEGIN
  -- Buscar item_type e current_phase do projeto
  SELECT COALESCE(item_type, 'projeto_completo'), current_phase
  INTO v_item_type, v_current_phase
  FROM projects
  WHERE id = p_project_id;

  -- Se projeto não existe
  IF v_item_type IS NULL THEN
    RETURN jsonb_build_object(
      'can_deliver', false,
      'reason', 'Projeto não encontrado',
      'pending_tasks', 0,
      'pending_checklists', 0
    );
  END IF;

  -- Reuniões podem ser concluídas sempre
  IF v_item_type = 'reuniao' THEN
    RETURN jsonb_build_object(
      'can_deliver', true,
      'reason', null,
      'pending_tasks', 0,
      'pending_checklists', 0
    );
  END IF;

  -- Determinar se deve validar e qual fase
  IF v_item_type = 'projeto_captacao' AND p_phase = 'captacao' THEN
    v_should_validate := true;
    v_phase_to_validate := 'captacao';
  ELSIF v_item_type = 'projeto_edicao' AND p_phase = 'edicao' THEN
    v_should_validate := true;
    v_phase_to_validate := 'edicao';
  ELSIF v_item_type = 'projeto_completo' AND p_phase = 'captacao' THEN
    -- Avançar para edição: validar apenas captação
    v_should_validate := true;
    v_phase_to_validate := 'captacao';
  ELSIF v_item_type = 'projeto_completo' AND p_phase = 'edicao' THEN
    -- ENTREGA FINAL: validar TODAS as fases (captacao + edicao)
    v_should_validate := true;
    v_phase_to_validate := NULL; -- NULL = validar todas as fases
  END IF;

  -- Se não deve validar, pode entregar
  IF NOT v_should_validate THEN
    RETURN jsonb_build_object(
      'can_deliver', true,
      'reason', null,
      'pending_tasks', 0,
      'pending_checklists', 0
    );
  END IF;

  -- Contagem: checklists pendentes
  IF v_phase_to_validate IS NULL THEN
    -- VALIDAR TODAS AS FASES (para projeto_completo entrega final)
    SELECT COUNT(*)
    INTO v_pending_checklists
    FROM task_checklists tc
    JOIN tasks t ON tc.task_id = t.id
    WHERE t.project_id = p_project_id
      AND tc.is_completed = false;

    -- Tarefas pendentes (regra):
    -- - Se a tarefa não tem checklist, respeita is_completed
    -- - Se a tarefa tem checklist e TODOS os itens estão completos, não bloqueia (mesmo que is_completed=false)
    SELECT COUNT(*)
    INTO v_pending_tasks
    FROM tasks t
    WHERE t.project_id = p_project_id
      AND t.is_completed = false
      AND (
        NOT EXISTS (
          SELECT 1 FROM task_checklists tc
          WHERE tc.task_id = t.id
        )
        OR EXISTS (
          SELECT 1 FROM task_checklists tc
          WHERE tc.task_id = t.id
            AND tc.is_completed = false
        )
      );
  ELSE
    -- VALIDAR APENAS A FASE ESPECÍFICA
    -- Buscar IDs das tarefas da fase
    SELECT array_agg(id)
    INTO v_task_ids
    FROM tasks
    WHERE project_id = p_project_id
      AND phase = v_phase_to_validate::kanban_phase;

    -- Contar checklists pendentes das tarefas da fase
    IF v_task_ids IS NOT NULL AND array_length(v_task_ids, 1) > 0 THEN
      SELECT COUNT(*)
      INTO v_pending_checklists
      FROM task_checklists
      WHERE task_id = ANY(v_task_ids)
        AND is_completed = false;

      -- Tarefas pendentes (mesma regra, mas apenas na fase)
      SELECT COUNT(*)
      INTO v_pending_tasks
      FROM tasks t
      WHERE t.project_id = p_project_id
        AND t.phase = v_phase_to_validate::kanban_phase
        AND t.is_completed = false
        AND (
          NOT EXISTS (
            SELECT 1 FROM task_checklists tc
            WHERE tc.task_id = t.id
          )
          OR EXISTS (
            SELECT 1 FROM task_checklists tc
            WHERE tc.task_id = t.id
              AND tc.is_completed = false
          )
        );
    ELSE
      v_pending_checklists := 0;
      v_pending_tasks := 0;
    END IF;
  END IF;

  -- Retornar resultado
  IF v_pending_tasks > 0 OR v_pending_checklists > 0 THEN
    RETURN jsonb_build_object(
      'can_deliver', false,
      'reason', format(
        'Existem %s tarefa(s) e %s item(ns) de checklist por concluir.',
        v_pending_tasks,
        v_pending_checklists
      ),
      'pending_tasks', v_pending_tasks,
      'pending_checklists', v_pending_checklists
    );
  END IF;

  RETURN jsonb_build_object(
    'can_deliver', true,
    'reason', null,
    'pending_tasks', 0,
    'pending_checklists', 0
  );
END;
$function$;