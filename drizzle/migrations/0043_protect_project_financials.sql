CREATE OR REPLACE FUNCTION public.can_view_project_financials(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_system_admin()
    OR COALESCE(public.has_workspace_permission(auth.uid(), _workspace_id, 'payments.view'), false)
    OR COALESCE(public.has_workspace_permission(auth.uid(), _workspace_id, 'payments.manage'), false)
    OR COALESCE(public.has_workspace_permission(auth.uid(), _workspace_id, 'dashboard.view_global_financials'), false)
    OR COALESCE(public.has_workspace_permission(auth.uid(), _workspace_id, 'reports.view'), false)
    OR COALESCE(public.has_workspace_permission(auth.uid(), _workspace_id, 'clients.view_financials'), false)
$$;
REVOKE ALL ON FUNCTION public.can_view_project_financials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_project_financials(uuid) TO authenticated, service_role;

REVOKE SELECT ON public.projects FROM anon, authenticated;
GRANT SELECT (id, workspace_id, client_id, name, type, category, priority, country, region, city, address,
  shoot_date, shoot_start_time, shoot_end_time, delivery_date, current_phase, captacao_column_id, edicao_column_id,
  is_delivered, delivered_at, notes, internal_notes, frameio_project_id, drive_folder_url, dropbox_folder_url,
  created_by, created_at, updated_at, project_code, google_meet_url, custom_category_id, item_type,
  competence_month, updated_by, edit_kind, search_name, search_code) ON public.projects TO authenticated;

CREATE OR REPLACE VIEW public.projects_full WITH (security_barrier = true) AS
SELECT p.id, p.workspace_id, p.client_id, p.name, p.type, p.category, p.priority, p.country, p.region, p.city, p.address,
  p.shoot_date, p.shoot_start_time, p.shoot_end_time, p.delivery_date, p.current_phase, p.captacao_column_id, p.edicao_column_id,
  p.is_delivered, p.delivered_at,
  CASE WHEN f.ok THEN p.agreed_value END AS agreed_value,
  CASE WHEN f.ok THEN p.estimated_costs END AS estimated_costs,
  CASE WHEN f.ok THEN p.payment_method END AS payment_method,
  p.notes, p.internal_notes, p.frameio_project_id, p.drive_folder_url, p.dropbox_folder_url,
  p.created_by, p.created_at, p.updated_at, p.project_code, p.google_meet_url,
  CASE WHEN f.ok THEN p.custo_captacao END AS custo_captacao,
  CASE WHEN f.ok THEN p.custo_edicao END AS custo_edicao,
  p.custom_category_id, p.item_type,
  CASE WHEN f.ok THEN p.custos_extras END AS custos_extras,
  CASE WHEN f.ok THEN p.custos_extras_payment_status END AS custos_extras_payment_status,
  CASE WHEN f.ok THEN p.client_payment_status END AS client_payment_status,
  CASE WHEN f.ok THEN p.client_payment_due_date END AS client_payment_due_date,
  CASE WHEN f.ok THEN p.client_paid_at END AS client_paid_at,
  CASE WHEN f.ok THEN p.custos_extras_paid_at END AS custos_extras_paid_at,
  p.competence_month, p.updated_by, p.edit_kind, p.search_name, p.search_code
FROM public.projects p
CROSS JOIN LATERAL (SELECT public.can_view_project_financials(p.workspace_id) AS ok) f
WHERE public.is_workspace_member(auth.uid(), p.workspace_id) OR public.is_system_admin();
REVOKE ALL ON public.projects_full FROM PUBLIC, anon;
GRANT SELECT ON public.projects_full TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_project_profit WITH (security_invoker = false, security_barrier = true) AS
 WITH cl AS (
   SELECT project_cost_lines.project_id, COALESCE(sum(project_cost_lines.actual_amount), 0::numeric) AS total
   FROM project_cost_lines GROUP BY project_cost_lines.project_id
 )
 SELECT p.id, p.name, p.project_code, p.workspace_id, p.client_id, c.name AS client_name,
    p.is_delivered, p.delivered_at, p.delivery_date, p.competence_month, p.current_phase, p.agreed_value,
    COALESCE(p.custo_captacao, 0::numeric) AS custo_captacao,
    COALESCE(p.custo_edicao, 0::numeric) AS custo_edicao,
    COALESCE(p.custos_extras, 0::numeric) AS custos_extras,
    COALESCE(p.custo_captacao, 0) + COALESCE(p.custo_edicao, 0) + COALESCE(p.custos_extras, 0) + COALESCE(cl.total, 0) AS total_cost,
    COALESCE(p.agreed_value, 0) - (COALESCE(p.custo_captacao, 0) + COALESCE(p.custo_edicao, 0) + COALESCE(p.custos_extras, 0) + COALESCE(cl.total, 0)) AS profit,
    CASE WHEN COALESCE(p.agreed_value, 0) > 0 THEN round((COALESCE(p.agreed_value, 0) - (COALESCE(p.custo_captacao, 0) + COALESCE(p.custo_edicao, 0) + COALESCE(p.custos_extras, 0) + COALESCE(cl.total, 0))) / p.agreed_value * 100, 1) ELSE 0::numeric END AS margin_percent,
    p.client_payment_status, p.client_paid_at, p.custos_extras_payment_status, p.custos_extras_paid_at, p.created_at,
    COALESCE(cl.total, 0::numeric) AS cost_lines_total
 FROM projects p
 LEFT JOIN clients c ON p.client_id = c.id
 LEFT JOIN cl ON cl.project_id = p.id
 WHERE (public.is_workspace_member(auth.uid(), p.workspace_id) AND public.can_view_project_financials(p.workspace_id))
    OR public.is_system_admin();
REVOKE ALL ON public.v_project_profit FROM PUBLIC, anon;
GRANT SELECT ON public.v_project_profit TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_project_client_paid(_workspace_id uuid, _project_id uuid, _paid_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_workspace_permission(auth.uid(), _workspace_id, 'projects.edit'), false) THEN
    RAISE EXCEPTION 'Sem permissão para atualizar este projeto' USING ERRCODE = '42501';
  END IF;
  UPDATE public.projects
     SET client_payment_status = 'pago', client_paid_at = _paid_at
   WHERE workspace_id = _workspace_id AND id = _project_id AND is_delivered = true
     AND agreed_value > 0
     AND (client_payment_status IS NULL OR client_payment_status IN ('pendente','vencido','atrasado'))
  RETURNING id, agreed_value, client_payment_status, client_paid_at INTO r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto não encontrado ou já recebido' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object('id', r.id, 'agreed_value', r.agreed_value,
    'client_payment_status', r.client_payment_status, 'client_paid_at', r.client_paid_at);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_project_client_paid(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_project_client_paid(uuid, uuid, timestamptz) TO authenticated;