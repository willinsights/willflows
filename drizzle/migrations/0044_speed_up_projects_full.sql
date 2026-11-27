CREATE OR REPLACE VIEW public.projects_full WITH (security_barrier = true) AS
WITH ws AS MATERIALIZED (
  SELECT w.id AS workspace_id, public.can_view_project_financials(w.id) AS ok
  FROM public.workspaces w
  WHERE public.is_system_admin() OR public.is_workspace_member(auth.uid(), w.id)
)
SELECT p.id, p.workspace_id, p.client_id, p.name, p.type, p.category, p.priority, p.country, p.region, p.city, p.address,
  p.shoot_date, p.shoot_start_time, p.shoot_end_time, p.delivery_date, p.current_phase, p.captacao_column_id, p.edicao_column_id,
  p.is_delivered, p.delivered_at,
  CASE WHEN ws.ok THEN p.agreed_value END AS agreed_value,
  CASE WHEN ws.ok THEN p.estimated_costs END AS estimated_costs,
  CASE WHEN ws.ok THEN p.payment_method END AS payment_method,
  p.notes, p.internal_notes, p.frameio_project_id, p.drive_folder_url, p.dropbox_folder_url,
  p.created_by, p.created_at, p.updated_at, p.project_code, p.google_meet_url,
  CASE WHEN ws.ok THEN p.custo_captacao END AS custo_captacao,
  CASE WHEN ws.ok THEN p.custo_edicao END AS custo_edicao,
  p.custom_category_id, p.item_type,
  CASE WHEN ws.ok THEN p.custos_extras END AS custos_extras,
  CASE WHEN ws.ok THEN p.custos_extras_payment_status END AS custos_extras_payment_status,
  CASE WHEN ws.ok THEN p.client_payment_status END AS client_payment_status,
  CASE WHEN ws.ok THEN p.client_payment_due_date END AS client_payment_due_date,
  CASE WHEN ws.ok THEN p.client_paid_at END AS client_paid_at,
  CASE WHEN ws.ok THEN p.custos_extras_paid_at END AS custos_extras_paid_at,
  p.competence_month, p.updated_by, p.edit_kind, p.search_name, p.search_code
FROM public.projects p
JOIN ws ON ws.workspace_id = p.workspace_id;

CREATE OR REPLACE VIEW public.v_project_profit WITH (security_invoker = false, security_barrier = true) AS
 WITH ws AS MATERIALIZED (
   SELECT w.id AS workspace_id
   FROM public.workspaces w
   WHERE public.is_system_admin()
      OR (public.is_workspace_member(auth.uid(), w.id) AND public.can_view_project_financials(w.id))
 ), cl AS (
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
 JOIN ws ON ws.workspace_id = p.workspace_id
 LEFT JOIN clients c ON p.client_id = c.id
 LEFT JOIN cl ON cl.project_id = p.id;