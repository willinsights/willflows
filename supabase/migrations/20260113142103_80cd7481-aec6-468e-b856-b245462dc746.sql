-- =====================================================
-- FUNÇÃO: can_deliver_project
-- Verifica se um projeto pode ser entregue baseado no item_type e fase
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_deliver_project(
  p_project_id uuid,
  p_phase text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  ELSIF v_item_type = 'projeto_completo' AND p_phase = 'edicao' THEN
    v_should_validate := true;
    v_phase_to_validate := 'edicao';
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
  
  -- Contar tarefas pendentes da fase
  SELECT COUNT(*)
  INTO v_pending_tasks
  FROM tasks
  WHERE project_id = p_project_id
    AND phase = v_phase_to_validate::kanban_phase
    AND is_completed = false;
  
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
$$;

-- =====================================================
-- FUNÇÃO: deliver_project
-- Entrega um projeto de forma transacional após validação
-- =====================================================
CREATE OR REPLACE FUNCTION public.deliver_project(
  p_project_id uuid,
  p_phase text,
  p_target_column_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_can_deliver jsonb;
  v_item_type text;
BEGIN
  -- Verificar se pode entregar
  v_can_deliver := public.can_deliver_project(p_project_id, p_phase);
  
  IF NOT (v_can_deliver->>'can_deliver')::boolean THEN
    RETURN v_can_deliver;
  END IF;
  
  -- Buscar item_type
  SELECT COALESCE(item_type, 'projeto_completo')
  INTO v_item_type
  FROM projects
  WHERE id = p_project_id;
  
  -- Atualizar projeto numa transação
  IF p_phase = 'captacao' THEN
    UPDATE projects
    SET captacao_column_id = p_target_column_id,
        is_delivered = true,
        delivered_at = now(),
        updated_at = now()
    WHERE id = p_project_id;
  ELSE
    UPDATE projects
    SET edicao_column_id = p_target_column_id,
        is_delivered = true,
        delivered_at = now(),
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

-- =====================================================
-- FUNÇÃO: prevent_invalid_delivery (trigger function)
-- Impede is_delivered=true se houver checklists/tarefas pendentes
-- =====================================================
CREATE OR REPLACE FUNCTION public.prevent_invalid_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_can_deliver jsonb;
BEGIN
  -- Apenas verificar quando is_delivered muda de false para true
  IF NEW.is_delivered = true AND (OLD.is_delivered = false OR OLD.is_delivered IS NULL) THEN
    v_can_deliver := public.can_deliver_project(NEW.id, NEW.current_phase::text);
    
    IF NOT (v_can_deliver->>'can_deliver')::boolean THEN
      RAISE EXCEPTION 'CHECKLIST_INCOMPLETE: %', v_can_deliver->>'reason'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER: Aplicar validação antes de UPDATE em projects
-- =====================================================
DROP TRIGGER IF EXISTS trigger_prevent_invalid_delivery ON projects;

CREATE TRIGGER trigger_prevent_invalid_delivery
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_invalid_delivery();