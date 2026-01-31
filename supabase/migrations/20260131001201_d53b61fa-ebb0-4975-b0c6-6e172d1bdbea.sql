-- Fix syntax error in median_days calculation
DROP FUNCTION IF EXISTS public.get_kanban_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_kanban_metrics(
  p_workspace_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_throughput JSONB;
  v_avg_time JSONB;
  v_bottleneck JSONB;
  v_wip JSONB;
  v_cycle_time JSONB;
  v_weeks NUMERIC;
BEGIN
  -- Weeks in selected range (minimum 1 to avoid divide-by-zero)
  v_weeks := GREATEST(
    1,
    (EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 86400.0) / 7.0
  );

  -- 1. Throughput: completed projects in period
  SELECT jsonb_build_object(
    'total_completed', COUNT(*),
    'avg_per_week', ROUND(COUNT(*)::NUMERIC / v_weeks, 1)
  ) INTO v_throughput
  FROM projects
  WHERE workspace_id = p_workspace_id
    AND is_delivered = true
    AND delivered_at BETWEEN p_start_date AND p_end_date;

  -- 2. Average time by phase (using phase history)
  SELECT COALESCE(jsonb_agg(phase_stats ORDER BY phase_order), '[]'::jsonb)
  INTO v_avg_time
  FROM (
    SELECT 
      phase::text,
      CASE phase WHEN 'captacao' THEN 1 WHEN 'edicao' THEN 2 END as phase_order,
      ROUND(AVG(duration_hours)::NUMERIC, 1) as avg_hours,
      ROUND(MIN(duration_hours)::NUMERIC, 1) as min_hours,
      ROUND(MAX(duration_hours)::NUMERIC, 1) as max_hours,
      COUNT(*) as count
    FROM project_phase_history
    WHERE workspace_id = p_workspace_id
      AND exited_at IS NOT NULL
      AND entered_at BETWEEN p_start_date AND p_end_date
    GROUP BY phase
  ) phase_stats;

  -- 3. Bottleneck: phase with most projects and longest wait
  SELECT jsonb_build_object(
    'phase', phase::text,
    'current_count', project_count,
    'avg_wait_hours', avg_wait
  ) INTO v_bottleneck
  FROM (
    SELECT 
      p.current_phase as phase,
      COUNT(*) as project_count,
      ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - pph.entered_at)) / 3600)::NUMERIC, 1) as avg_wait
    FROM projects p
    LEFT JOIN project_phase_history pph ON pph.project_id = p.id 
      AND pph.phase = p.current_phase 
      AND pph.exited_at IS NULL
    WHERE p.workspace_id = p_workspace_id
      AND p.is_delivered = false
    GROUP BY p.current_phase
    ORDER BY project_count DESC, avg_wait DESC NULLS LAST
    LIMIT 1
  ) bottleneck_data
  WHERE project_count > 0;

  -- 4. Current WIP
  SELECT jsonb_build_object(
    'captacao', COUNT(*) FILTER (WHERE current_phase = 'captacao'),
    'edicao', COUNT(*) FILTER (WHERE current_phase = 'edicao'),
    'total', COUNT(*)
  ) INTO v_wip
  FROM projects
  WHERE workspace_id = p_workspace_id
    AND is_delivered = false;

  -- 5. Cycle time (days from creation to delivery)
  SELECT jsonb_build_object(
    'avg_days', ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 86400)::NUMERIC, 1),
    'median_days', ROUND(
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (delivered_at - created_at)) / 86400)))::NUMERIC,
      1
    )
  ) INTO v_cycle_time
  FROM projects
  WHERE workspace_id = p_workspace_id
    AND is_delivered = true
    AND delivered_at BETWEEN p_start_date AND p_end_date;

  -- Build final result
  v_result := jsonb_build_object(
    'throughput', COALESCE(v_throughput, '{"total_completed": 0, "avg_per_week": 0}'::jsonb),
    'avg_time_by_phase', COALESCE(v_avg_time, '[]'::jsonb),
    'bottleneck', v_bottleneck,
    'current_wip', COALESCE(v_wip, '{"captacao": 0, "edicao": 0, "total": 0}'::jsonb),
    'cycle_time', v_cycle_time
  );

  RETURN v_result;
END;
$$;