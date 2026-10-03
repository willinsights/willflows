CREATE OR REPLACE VIEW public.v_project_profit WITH (security_invoker = true) AS
WITH cl AS (
  SELECT project_id, COALESCE(SUM(actual_amount),0)::numeric AS total
  FROM public.project_cost_lines GROUP BY project_id
)
SELECT p.id, p.name, p.project_code, p.workspace_id, p.client_id, c.name AS client_name,
  p.is_delivered, p.delivered_at, p.delivery_date, p.competence_month, p.current_phase, p.agreed_value,
  COALESCE(p.custo_captacao,0) AS custo_captacao,
  COALESCE(p.custo_edicao,0) AS custo_edicao,
  COALESCE(p.custos_extras,0) AS custos_extras,
  (COALESCE(p.custo_captacao,0)+COALESCE(p.custo_edicao,0)+COALESCE(p.custos_extras,0)+COALESCE(cl.total,0)) AS total_cost,
  (COALESCE(p.agreed_value,0)-(COALESCE(p.custo_captacao,0)+COALESCE(p.custo_edicao,0)+COALESCE(p.custos_extras,0)+COALESCE(cl.total,0))) AS profit,
  CASE WHEN COALESCE(p.agreed_value,0) > 0 THEN round(((COALESCE(p.agreed_value,0)-(COALESCE(p.custo_captacao,0)+COALESCE(p.custo_edicao,0)+COALESCE(p.custos_extras,0)+COALESCE(cl.total,0)))/p.agreed_value)*100,1) ELSE 0 END AS margin_percent,
  p.client_payment_status, p.client_paid_at, p.custos_extras_payment_status, p.custos_extras_paid_at, p.created_at,
  COALESCE(cl.total,0) AS cost_lines_total
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id
LEFT JOIN cl ON cl.project_id = p.id;