
-- View: Project profit breakdown
CREATE OR REPLACE VIEW public.v_project_profit AS
SELECT
  p.id,
  p.name,
  p.project_code,
  p.workspace_id,
  p.client_id,
  c.name AS client_name,
  p.is_delivered,
  p.delivered_at,
  p.delivery_date,
  p.competence_month,
  p.current_phase,
  p.agreed_value,
  COALESCE(p.custo_captacao, 0) AS custo_captacao,
  COALESCE(p.custo_edicao, 0) AS custo_edicao,
  COALESCE(p.custos_extras, 0) AS custos_extras,
  COALESCE(p.custo_captacao, 0) + COALESCE(p.custo_edicao, 0) + COALESCE(p.custos_extras, 0) AS total_cost,
  COALESCE(p.agreed_value, 0) - (COALESCE(p.custo_captacao, 0) + COALESCE(p.custo_edicao, 0) + COALESCE(p.custos_extras, 0)) AS profit,
  CASE
    WHEN COALESCE(p.agreed_value, 0) > 0
    THEN ROUND(
      ((COALESCE(p.agreed_value, 0) - (COALESCE(p.custo_captacao, 0) + COALESCE(p.custo_edicao, 0) + COALESCE(p.custos_extras, 0)))::numeric
      / COALESCE(p.agreed_value, 0)::numeric) * 100, 1
    )
    ELSE 0
  END AS margin_percent,
  p.client_payment_status,
  p.client_paid_at,
  p.custos_extras_payment_status,
  p.custos_extras_paid_at,
  p.created_at
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id;

-- View: Collaborator payments with project and profile info
CREATE OR REPLACE VIEW public.v_collaborator_payments AS
SELECT
  pt.id AS team_id,
  pt.project_id,
  pt.user_id,
  pt.phase,
  pt.payment_amount,
  pt.payment_status,
  pt.paid_at,
  pt.external_name,
  pt.is_external,
  p.name AS project_name,
  p.project_code,
  p.workspace_id,
  p.is_delivered,
  p.delivered_at,
  p.delivery_date,
  p.competence_month,
  p.client_id,
  c.name AS client_name,
  COALESCE(pr.full_name, pt.external_name, 'Colaborador') AS collaborator_name,
  pr.avatar_url
FROM public.project_team pt
JOIN public.projects p ON pt.project_id = p.id
LEFT JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.profiles pr ON pt.user_id = pr.id;

-- Function: Monthly summary aggregation
CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  p_workspace_id uuid,
  p_year integer,
  p_month integer
)
RETURNS TABLE(
  total_revenue numeric,
  total_cost numeric,
  total_profit numeric,
  margin_percent numeric,
  project_count bigint,
  delivered_count bigint,
  team_payments_pending numeric,
  team_payments_paid numeric,
  extras_pending numeric,
  extras_paid numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH month_projects AS (
    SELECT *
    FROM public.v_project_profit vp
    WHERE vp.workspace_id = p_workspace_id
      AND vp.is_delivered = true
      AND (
        (vp.competence_month IS NOT NULL AND vp.competence_month = to_char(make_date(p_year, p_month, 1), 'YYYY-MM'))
        OR
        (vp.competence_month IS NULL AND EXTRACT(YEAR FROM vp.delivered_at) = p_year AND EXTRACT(MONTH FROM vp.delivered_at) = p_month)
      )
  ),
  team_agg AS (
    SELECT
      COALESCE(SUM(CASE WHEN pt.payment_status != 'pago' THEN pt.payment_amount ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN pt.payment_status = 'pago' THEN pt.payment_amount ELSE 0 END), 0) AS paid
    FROM public.project_team pt
    JOIN month_projects mp ON pt.project_id = mp.id
  )
  SELECT
    COALESCE(SUM(mp.agreed_value), 0)::numeric AS total_revenue,
    COALESCE(SUM(mp.total_cost), 0)::numeric AS total_cost,
    COALESCE(SUM(mp.profit), 0)::numeric AS total_profit,
    CASE
      WHEN COALESCE(SUM(mp.agreed_value), 0) > 0
      THEN ROUND((COALESCE(SUM(mp.profit), 0)::numeric / COALESCE(SUM(mp.agreed_value), 0)::numeric) * 100, 1)
      ELSE 0
    END AS margin_percent,
    COUNT(*)::bigint AS project_count,
    COUNT(CASE WHEN mp.is_delivered THEN 1 END)::bigint AS delivered_count,
    (SELECT pending FROM team_agg) AS team_payments_pending,
    (SELECT paid FROM team_agg) AS team_payments_paid,
    COALESCE(SUM(CASE WHEN mp.custos_extras_payment_status != 'pago' OR mp.custos_extras_payment_status IS NULL THEN mp.custos_extras ELSE 0 END), 0)::numeric AS extras_pending,
    COALESCE(SUM(CASE WHEN mp.custos_extras_payment_status = 'pago' THEN mp.custos_extras ELSE 0 END), 0)::numeric AS extras_paid
  FROM month_projects mp;
$$;
