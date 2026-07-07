
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_member boolean;
  v_now date := (now() AT TIME ZONE 'UTC')::date;
  v_cur_month_start date := date_trunc('month', v_now)::date;
  v_prev_month_start date := (date_trunc('month', v_now) - interval '1 month')::date;
  v_result jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = v_user
      AND is_active = true
  ) INTO v_is_member;

  IF NOT v_is_member AND NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Not a workspace member' USING ERRCODE = '42501';
  END IF;

  -- Load projects + cost line totals into a temp CTE-backed structure
  WITH projects_raw AS (
    SELECT
      p.id,
      p.current_phase,
      p.is_delivered,
      p.item_type,
      p.type,
      p.priority,
      COALESCE(p.agreed_value, 0)::numeric AS revenue,
      (COALESCE(p.custo_captacao,0) + COALESCE(p.custo_edicao,0) + COALESCE(p.custos_extras,0))::numeric AS base_cost,
      p.competence_month,
      p.delivered_at,
      p.delivery_date,
      p.shoot_date,
      p.created_at
    FROM public.projects p
    WHERE p.workspace_id = p_workspace_id
  ),
  cost_lines AS (
    SELECT pcl.project_id, COALESCE(SUM(pcl.actual_amount),0)::numeric AS total
    FROM public.project_cost_lines pcl
    JOIN projects_raw pr ON pr.id = pcl.project_id
    GROUP BY pcl.project_id
  ),
  projects AS (
    SELECT
      pr.*,
      pr.base_cost + COALESCE(cl.total, 0) AS cost,
      -- Anchor date (used by PREVISAO): delivery_date -> shoot_date -> created_at
      COALESCE(pr.delivery_date, pr.shoot_date, pr.created_at::date) AS anchor_date,
      -- Effective month (used by REALIZADO): competence_month first, else month(delivered_at)
      CASE
        WHEN pr.competence_month IS NOT NULL
          THEN date_trunc('month', (pr.competence_month || '-01')::date)::date
        WHEN pr.delivered_at IS NOT NULL
          THEN date_trunc('month', pr.delivered_at)::date
        ELSE NULL
      END AS effective_month_start
    FROM projects_raw pr
    LEFT JOIN cost_lines cl ON cl.project_id = pr.id
  ),
  -- Realized aggregation per month for the last 12 months
  realized_by_month AS (
    SELECT
      effective_month_start AS m,
      SUM(revenue)::numeric AS revenue,
      SUM(cost)::numeric   AS cost,
      COUNT(*)::int        AS project_count
    FROM projects
    WHERE is_delivered = true
      AND effective_month_start IS NOT NULL
    GROUP BY effective_month_start
  )
  SELECT jsonb_build_object(
    'workspace_id', p_workspace_id,
    'generated_at', now(),
    'current_month', v_cur_month_start,
    'previous_month', v_prev_month_start,

    'phase_counts', jsonb_build_object(
      'captacao', (
        SELECT COUNT(*)::int FROM projects
        WHERE current_phase = 'captacao'
          AND is_delivered = false
          AND (item_type IS DISTINCT FROM 'reuniao')
      ),
      'edicao', (
        SELECT COUNT(*)::int FROM projects
        WHERE current_phase = 'edicao'
          AND is_delivered = false
          AND (item_type IS DISTINCT FROM 'reuniao')
      )
    ),

    'realizado_current', (
      SELECT jsonb_build_object(
        'revenue', COALESCE(revenue,0),
        'cost', COALESCE(cost,0),
        'profit', COALESCE(revenue,0) - COALESCE(cost,0),
        'projectCount', COALESCE(project_count,0)
      )
      FROM realized_by_month WHERE m = v_cur_month_start
    ),
    'realizado_previous', (
      SELECT jsonb_build_object(
        'revenue', COALESCE(revenue,0),
        'cost', COALESCE(cost,0),
        'profit', COALESCE(revenue,0) - COALESCE(cost,0),
        'projectCount', COALESCE(project_count,0)
      )
      FROM realized_by_month WHERE m = v_prev_month_start
    ),

    -- PREVISAO current month: planned (anchor in month) + rollover (anchor < month AND !delivered)
    'previsao_current', (
      SELECT jsonb_build_object(
        'revenue', COALESCE(SUM(revenue),0),
        'cost',    COALESCE(SUM(cost),0),
        'profit',  COALESCE(SUM(revenue),0) - COALESCE(SUM(cost),0),
        'projectCount', COUNT(*)::int,
        'breakdown', jsonb_build_object(
          'plannedRevenue',  COALESCE(SUM(revenue) FILTER (WHERE anchor_date >= v_cur_month_start AND anchor_date < (v_cur_month_start + interval '1 month')::date), 0),
          'rolloverRevenue', COALESCE(SUM(revenue) FILTER (WHERE anchor_date < v_cur_month_start AND is_delivered = false), 0),
          'plannedCost',     COALESCE(SUM(cost)    FILTER (WHERE anchor_date >= v_cur_month_start AND anchor_date < (v_cur_month_start + interval '1 month')::date), 0),
          'rolloverCost',    COALESCE(SUM(cost)    FILTER (WHERE anchor_date < v_cur_month_start AND is_delivered = false), 0),
          'rolloverCount',   COUNT(*) FILTER (WHERE anchor_date < v_cur_month_start AND is_delivered = false)
        )
      )
      FROM projects
      WHERE anchor_date IS NOT NULL
        AND (
          (anchor_date >= v_cur_month_start AND anchor_date < (v_cur_month_start + interval '1 month')::date)
          OR (anchor_date < v_cur_month_start AND is_delivered = false)
        )
    ),
    'previsao_previous', (
      SELECT jsonb_build_object(
        'revenue', COALESCE(SUM(revenue),0),
        'cost',    COALESCE(SUM(cost),0),
        'profit',  COALESCE(SUM(revenue),0) - COALESCE(SUM(cost),0),
        'projectCount', COUNT(*)::int
      )
      FROM projects
      WHERE anchor_date IS NOT NULL
        AND (
          (anchor_date >= v_prev_month_start AND anchor_date < (v_prev_month_start + interval '1 month')::date)
          OR (anchor_date < v_prev_month_start AND is_delivered = false)
        )
    ),

    -- Monthly series (last 6 months, REALIZADO)
    'monthly_series', (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.month_start)
      FROM (
        SELECT
          (v_cur_month_start - (offs || ' months')::interval)::date AS month_start,
          COALESCE((SELECT revenue FROM realized_by_month rm WHERE rm.m = (v_cur_month_start - (offs || ' months')::interval)::date), 0) AS revenue,
          COALESCE((SELECT cost    FROM realized_by_month rm WHERE rm.m = (v_cur_month_start - (offs || ' months')::interval)::date), 0) AS cost,
          COALESCE((SELECT revenue FROM realized_by_month rm WHERE rm.m = (v_cur_month_start - (offs || ' months')::interval)::date), 0) -
          COALESCE((SELECT cost    FROM realized_by_month rm WHERE rm.m = (v_cur_month_start - (offs || ' months')::interval)::date), 0) AS profit
        FROM generate_series(0, 5) AS offs
      ) t
    ),

    -- Annual comparison last 6 months (current year vs previous year)
    'annual_comparison', (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.month_start)
      FROM (
        SELECT
          (v_cur_month_start - (offs || ' months')::interval)::date AS month_start,
          COALESCE((SELECT revenue FROM realized_by_month rm WHERE rm.m = (v_cur_month_start - (offs || ' months')::interval)::date), 0) AS current_year,
          COALESCE((SELECT revenue FROM realized_by_month rm WHERE rm.m = ((v_cur_month_start - (offs || ' months')::interval) - interval '1 year')::date), 0) AS previous_year
        FROM generate_series(0, 5) AS offs
      ) t
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid) FROM anon;
