CREATE OR REPLACE FUNCTION public.guard_closed_month_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_month date;
  new_month date;
  delivery_changed boolean := NEW.is_delivered IS DISTINCT FROM OLD.is_delivered
    OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
    OR NEW.competence_month IS DISTINCT FROM OLD.competence_month
    OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id;
BEGIN
  IF NOT delivery_changed
     AND NEW.agreed_value IS NOT DISTINCT FROM OLD.agreed_value
     AND NEW.custos_extras IS NOT DISTINCT FROM OLD.custos_extras THEN
    RETURN NEW;
  END IF;

  old_month := COALESCE((OLD.competence_month || '-01')::date, date_trunc('month', OLD.delivered_at)::date);
  new_month := COALESCE((NEW.competence_month || '-01')::date, date_trunc('month', NEW.delivered_at)::date);

  IF OLD.is_delivered AND (
    public.is_month_closed(OLD.workspace_id, OLD.delivered_at)
    OR EXISTS (
      SELECT 1 FROM public.closed_months
      WHERE workspace_id = OLD.workspace_id AND month = old_month
    )
  ) THEN
    RAISE EXCEPTION 'Mês fechado: reabra o mês em Finanças → Fechos para alterar este trabalho.';
  END IF;

  IF NEW.is_delivered AND delivery_changed AND (
    public.is_month_closed(NEW.workspace_id, NEW.delivered_at)
    OR EXISTS (
      SELECT 1 FROM public.closed_months
      WHERE workspace_id = NEW.workspace_id AND month = new_month
    )
  ) THEN
    RAISE EXCEPTION 'Mês fechado: não é possível reconhecer trabalhos num mês já fechado.';
  END IF;

  RETURN NEW;
END;
$$;

-- Check the final row after the Kanban BEFORE triggers have synchronized delivery.
DROP TRIGGER trg_guard_closed_month_projects ON public.projects;
CREATE TRIGGER trg_guard_closed_month_projects AFTER UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_month_projects();
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
  IF NOT COALESCE(public.can_edit_project(auth.uid(), p_project_id), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem permissão para alterar este projeto.';
  END IF;

  -- Buscar workspace e fase atual
  SELECT workspace_id, current_phase
  INTO v_workspace_id, v_current_phase
  FROM projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND OR NOT COALESCE(public.can_edit_project(auth.uid(), p_project_id), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem permissão para alterar este projeto.';
  END IF;

  -- Buscar a última coluna não final da fase
  SELECT id INTO v_review_column_id
  FROM kanban_columns
  WHERE workspace_id = v_workspace_id
    AND phase = v_current_phase::kanban_phase
    AND is_final = false
  ORDER BY position DESC, id
  LIMIT 1;

  IF v_review_column_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Não existe uma coluna não final nesta fase.');
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
REVOKE EXECUTE ON FUNCTION public.reopen_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_project(uuid) TO authenticated, service_role;