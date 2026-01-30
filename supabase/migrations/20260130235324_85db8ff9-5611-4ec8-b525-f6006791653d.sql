-- Create table to track project phase history
CREATE TABLE IF NOT EXISTS public.project_phase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phase public.kanban_phase NOT NULL,
  column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ,
  duration_hours NUMERIC GENERATED ALWAYS AS (
    CASE WHEN exited_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (exited_at - entered_at)) / 3600.0
      ELSE NULL 
    END
  ) STORED
);

-- Enable RLS
ALTER TABLE public.project_phase_history ENABLE ROW LEVEL SECURITY;

-- Policy: Workspace members can view
CREATE POLICY "Workspace members can view phase history"
ON public.project_phase_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = project_phase_history.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.is_active = true
  )
);

-- Policy: System can insert/update
CREATE POLICY "System can manage phase history"
ON public.project_phase_history FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = project_phase_history.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'editor')
    AND wm.is_active = true
  )
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_phase_history_project 
ON public.project_phase_history(project_id, entered_at DESC);

CREATE INDEX IF NOT EXISTS idx_phase_history_workspace_phase 
ON public.project_phase_history(workspace_id, phase, entered_at);

-- Trigger function to track phase changes
CREATE OR REPLACE FUNCTION public.track_project_phase_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Close previous phase record
  UPDATE project_phase_history
  SET exited_at = now()
  WHERE project_id = OLD.id
  AND exited_at IS NULL;
  
  -- Insert new phase record
  INSERT INTO project_phase_history (project_id, workspace_id, phase, column_id)
  VALUES (
    NEW.id, 
    NEW.workspace_id, 
    NEW.current_phase,
    CASE 
      WHEN NEW.current_phase = 'captacao' THEN NEW.captacao_column_id
      WHEN NEW.current_phase = 'edicao' THEN NEW.edicao_column_id
      ELSE NULL
    END
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for phase changes
DROP TRIGGER IF EXISTS trigger_track_phase_change ON projects;
CREATE TRIGGER trigger_track_phase_change
AFTER UPDATE OF current_phase ON projects
FOR EACH ROW
WHEN (OLD.current_phase IS DISTINCT FROM NEW.current_phase)
EXECUTE FUNCTION track_project_phase_change();

-- RPC function to get kanban metrics
CREATE OR REPLACE FUNCTION public.get_kanban_metrics(
  p_workspace_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT (now() - interval '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check workspace access
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND is_active = true
  ) THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'throughput', (
      SELECT json_build_object(
        'total_completed', COUNT(*),
        'avg_per_week', ROUND(COUNT(*)::numeric / GREATEST(1, EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 604800), 1)
      )
      FROM projects
      WHERE workspace_id = p_workspace_id
      AND is_delivered = true
      AND delivered_at BETWEEN p_start_date AND p_end_date
    ),
    'avg_time_by_phase', (
      SELECT json_agg(phase_stats)
      FROM (
        SELECT 
          phase,
          ROUND(AVG(duration_hours)::numeric, 1) as avg_hours,
          ROUND(MIN(duration_hours)::numeric, 1) as min_hours,
          ROUND(MAX(duration_hours)::numeric, 1) as max_hours,
          COUNT(*) as count
        FROM project_phase_history pph
        WHERE pph.workspace_id = p_workspace_id
        AND pph.entered_at >= p_start_date
        AND pph.exited_at IS NOT NULL
        GROUP BY phase
        ORDER BY 
          CASE phase 
            WHEN 'captacao' THEN 1 
            WHEN 'edicao' THEN 2 
            WHEN 'entregue' THEN 3 
          END
      ) phase_stats
    ),
    'bottleneck', (
      SELECT json_build_object(
        'phase', phase,
        'current_count', COUNT(*),
        'avg_wait_hours', ROUND(AVG(EXTRACT(EPOCH FROM (now() - entered_at)) / 3600.0)::numeric, 1)
      )
      FROM project_phase_history pph
      WHERE pph.workspace_id = p_workspace_id
      AND pph.exited_at IS NULL
      GROUP BY phase
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    'current_wip', (
      SELECT json_build_object(
        'captacao', COUNT(*) FILTER (WHERE current_phase = 'captacao'),
        'edicao', COUNT(*) FILTER (WHERE current_phase = 'edicao'),
        'total', COUNT(*) FILTER (WHERE NOT is_delivered)
      )
      FROM projects
      WHERE workspace_id = p_workspace_id
      AND NOT is_delivered
    ),
    'cycle_time', (
      SELECT json_build_object(
        'avg_days', ROUND(AVG(
          EXTRACT(EPOCH FROM (delivered_at - created_at)) / 86400.0
        )::numeric, 1),
        'median_days', ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (delivered_at - created_at)) / 86400.0
        )::numeric, 1)
      )
      FROM projects
      WHERE workspace_id = p_workspace_id
      AND is_delivered = true
      AND delivered_at BETWEEN p_start_date AND p_end_date
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;