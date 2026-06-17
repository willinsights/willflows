
-- RPC: workspace financial summary (aggregations server-side)
CREATE OR REPLACE FUNCTION public.get_workspace_financial_summary(p_workspace_id uuid)
RETURNS TABLE (
  invoices_paid_count bigint,
  invoices_pending_count bigint,
  invoices_overdue_count bigint,
  revenue_total numeric,
  pending_total numeric,
  overdue_total numeric,
  revenue_this_month numeric,
  revenue_last_month numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'paga')::bigint                AS invoices_paid_count,
    COUNT(*) FILTER (WHERE status = 'emitida')::bigint             AS invoices_pending_count,
    COUNT(*) FILTER (WHERE status = 'vencida')::bigint             AS invoices_overdue_count,
    COALESCE(SUM(total) FILTER (WHERE status = 'paga'), 0)         AS revenue_total,
    COALESCE(SUM(total) FILTER (WHERE status = 'emitida'), 0)      AS pending_total,
    COALESCE(SUM(total) FILTER (WHERE status = 'vencida'), 0)      AS overdue_total,
    COALESCE(SUM(total) FILTER (
      WHERE status = 'paga'
        AND date_trunc('month', paid_at) = date_trunc('month', now())
    ), 0) AS revenue_this_month,
    COALESCE(SUM(total) FILTER (
      WHERE status = 'paga'
        AND date_trunc('month', paid_at) = date_trunc('month', now() - interval '1 month')
    ), 0) AS revenue_last_month
  FROM public.invoices
  WHERE workspace_id = p_workspace_id
    AND (public.is_workspace_member(p_workspace_id, auth.uid()) OR public.is_system_admin());
$$;

REVOKE ALL ON FUNCTION public.get_workspace_financial_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_financial_summary(uuid) TO authenticated;

-- RPC: workspace projects summary
CREATE OR REPLACE FUNCTION public.get_workspace_projects_summary(p_workspace_id uuid)
RETURNS TABLE (
  total_projects bigint,
  projects_by_status jsonb,
  projects_with_overdue_invoices bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH allowed AS (
    SELECT public.is_workspace_member(p_workspace_id, auth.uid()) OR public.is_system_admin() AS ok
  ),
  proj AS (
    SELECT p.id, p.current_phase, p.is_delivered
    FROM public.projects p, allowed a
    WHERE a.ok AND p.workspace_id = p_workspace_id
  ),
  by_phase AS (
    SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) AS j
    FROM (
      SELECT current_phase::text AS k, COUNT(*)::bigint AS v
      FROM proj
      GROUP BY current_phase
    ) t
  ),
  delivered_count AS (
    SELECT COUNT(*) FILTER (WHERE is_delivered)::bigint AS c FROM proj
  ),
  overdue AS (
    SELECT COUNT(DISTINCT i.project_id)::bigint AS c
    FROM public.invoices i, allowed a
    WHERE a.ok AND i.workspace_id = p_workspace_id AND i.status = 'vencida'
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM proj) AS total_projects,
    (SELECT j FROM by_phase)
      || jsonb_build_object('delivered', (SELECT c FROM delivered_count)) AS projects_by_status,
    (SELECT c FROM overdue) AS projects_with_overdue_invoices;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_projects_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_projects_summary(uuid) TO authenticated;
