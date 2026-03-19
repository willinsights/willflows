
-- ============================================
-- TIME TRACKING SYSTEM - Phase 1 & 2
-- ============================================

-- 1. Time Sessions table (active work tracking)
CREATE TABLE IF NOT EXISTS public.time_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Time Session Adjustments (audit log)
CREATE TABLE IF NOT EXISTS public.time_session_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.time_sessions(id) ON DELETE CASCADE,
  adjusted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_started_at TIMESTAMPTZ,
  new_started_at TIMESTAMPTZ,
  old_ended_at TIMESTAMPTZ,
  new_ended_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Kanban Column Transitions (movement tracking)
CREATE TABLE IF NOT EXISTS public.kanban_column_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  to_column_id UUID NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  moved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  movement_type TEXT NOT NULL DEFAULT 'manual' CHECK (movement_type IN ('manual', 'automatic'))
);

-- 4. Workspace Time Settings
CREATE TABLE IF NOT EXISTS public.workspace_time_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  auto_start_columns UUID[] DEFAULT '{}',
  auto_pause_columns UUID[] DEFAULT '{}',
  allow_multiple_timers BOOLEAN NOT NULL DEFAULT false,
  require_adjustment_reason BOOLEAN NOT NULL DEFAULT true,
  production_columns UUID[] DEFAULT '{}',
  waiting_columns UUID[] DEFAULT '{}',
  sla_alert_hours INTEGER,
  inactivity_alert_hours INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_time_sessions_project ON public.time_sessions(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_sessions_user ON public.time_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_sessions_workspace ON public.time_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_active ON public.time_sessions(user_id, workspace_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_column_transitions_project ON public.kanban_column_transitions(project_id, moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_column_transitions_workspace ON public.kanban_column_transitions(workspace_id, moved_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_session_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_column_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_time_settings ENABLE ROW LEVEL SECURITY;

-- time_sessions: own sessions
CREATE POLICY "Users can view own time sessions"
ON public.time_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

-- time_sessions: admin/gestao can view all
CREATE POLICY "Admins can view all time sessions"
ON public.time_sessions FOR SELECT TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id) AND
  public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'gestao')
);

-- time_sessions: users can insert own
CREATE POLICY "Users can create own time sessions"
ON public.time_sessions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

-- time_sessions: users can update own
CREATE POLICY "Users can update own time sessions"
ON public.time_sessions FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

-- time_sessions: admin can update all
CREATE POLICY "Admins can update all time sessions"
ON public.time_sessions FOR UPDATE TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id) AND
  public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
)
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id) AND
  public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
);

-- time_sessions: admin can delete
CREATE POLICY "Admins can delete time sessions"
ON public.time_sessions FOR DELETE TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id) AND
  public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
);

-- time_session_adjustments: workspace members can view
CREATE POLICY "Workspace members can view adjustments"
ON public.time_session_adjustments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.time_sessions ts
    WHERE ts.id = time_session_adjustments.session_id
    AND public.is_workspace_member(auth.uid(), ts.workspace_id)
  )
);

-- time_session_adjustments: users can insert
CREATE POLICY "Users can create adjustments"
ON public.time_session_adjustments FOR INSERT TO authenticated
WITH CHECK (adjusted_by = auth.uid());

-- kanban_column_transitions: workspace members can view
CREATE POLICY "Workspace members can view transitions"
ON public.kanban_column_transitions FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- kanban_column_transitions: workspace members can insert
CREATE POLICY "Workspace members can create transitions"
ON public.kanban_column_transitions FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- workspace_time_settings: workspace members can view
CREATE POLICY "Workspace members can view time settings"
ON public.workspace_time_settings FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- workspace_time_settings: admin can manage
CREATE POLICY "Admins can manage time settings"
ON public.workspace_time_settings FOR ALL TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_sessions;

-- ============================================
-- PERMISSIONS - add to initialize_workspace_permissions
-- ============================================

-- Update the function to include new permissions
CREATE OR REPLACE FUNCTION public.initialize_workspace_permissions(_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  permission_keys text[] := ARRAY[
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'clients.view', 'clients.create', 'clients.edit', 'clients.view_contacts', 'clients.view_financials',
    'team.view', 'team.view_contacts', 'team.invite', 'team.manage',
    'payments.view', 'payments.manage',
    'reports.view',
    'visibility.leads', 'visibility.contracts', 'visibility.all_projects',
    'dashboard.view_global_financials', 'dashboard.view_own_earnings', 'dashboard.view_performance',
    'timetracking.view_own', 'timetracking.view_all', 'timetracking.manage', 'timetracking.settings'
  ];
  roles app_role[] := ARRAY['admin', 'edicao', 'captacao', 'gestao', 'visualizacao']::app_role[];
  r app_role;
  k text;
  is_enabled boolean;
BEGIN
  FOREACH r IN ARRAY roles LOOP
    FOREACH k IN ARRAY permission_keys LOOP
      is_enabled := CASE
        WHEN r = 'admin' THEN true
        WHEN r = 'edicao' THEN k NOT IN ('projects.delete', 'team.invite', 'team.manage', 'timetracking.settings')
        WHEN r = 'captacao' THEN k IN (
          'projects.view', 'projects.edit',
          'clients.view', 'clients.create', 'clients.edit', 'clients.view_contacts',
          'team.view',
          'visibility.leads',
          'dashboard.view_own_earnings',
          'timetracking.view_own'
        )
        WHEN r = 'gestao' THEN k IN (
          'projects.view',
          'team.view',
          'dashboard.view_own_earnings',
          'timetracking.view_own', 'timetracking.view_all'
        )
        WHEN r = 'visualizacao' THEN k IN (
          'projects.view',
          'clients.view',
          'team.view',
          'reports.view',
          'dashboard.view_own_earnings', 'dashboard.view_performance',
          'timetracking.view_own'
        )
        ELSE false
      END;
      
      INSERT INTO public.workspace_role_permissions (workspace_id, role, permission_key, enabled)
      VALUES (_workspace_id, r, k, is_enabled)
      ON CONFLICT (workspace_id, role, permission_key) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$function$;

-- ============================================
-- TRIGGER: auto-calculate duration on session end
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_time_session_duration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR NEW.ended_at != OLD.ended_at) THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER tr_calculate_time_session_duration
BEFORE UPDATE ON public.time_sessions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_time_session_duration();

-- ============================================
-- RPC: get_project_time_summary
-- ============================================

CREATE OR REPLACE FUNCTION public.get_project_time_summary(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_total_active integer;
  v_first_started timestamptz;
  v_delivered_at timestamptz;
  v_rework_count integer;
BEGIN
  -- Total active time
  SELECT COALESCE(SUM(
    CASE WHEN ended_at IS NOT NULL THEN duration_seconds
    ELSE EXTRACT(EPOCH FROM (now() - started_at))::integer
    END
  ), 0)
  INTO v_total_active
  FROM time_sessions
  WHERE project_id = p_project_id;

  -- First started
  SELECT MIN(started_at) INTO v_first_started
  FROM time_sessions WHERE project_id = p_project_id;

  -- Delivered at
  SELECT delivered_at INTO v_delivered_at
  FROM projects WHERE id = p_project_id;

  -- Rework count (movements going backward in position)
  SELECT COUNT(*) INTO v_rework_count
  FROM kanban_column_transitions kct
  JOIN kanban_columns kc_from ON kc_from.id = kct.from_column_id
  JOIN kanban_columns kc_to ON kc_to.id = kct.to_column_id
  WHERE kct.project_id = p_project_id
    AND kc_to.position < kc_from.position;

  -- Build result with column time breakdown
  SELECT jsonb_build_object(
    'total_active_seconds', v_total_active,
    'total_cycle_seconds', CASE
      WHEN v_first_started IS NOT NULL AND v_delivered_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (v_delivered_at - v_first_started))::integer
      WHEN v_first_started IS NOT NULL
      THEN EXTRACT(EPOCH FROM (now() - v_first_started))::integer
      ELSE 0
    END,
    'rework_count', COALESCE(v_rework_count, 0),
    'first_started_at', v_first_started,
    'delivered_at', v_delivered_at,
    'column_breakdown', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'column_id', sub.to_column_id,
        'column_name', kc.name,
        'total_seconds', sub.total_seconds,
        'entry_count', sub.entry_count
      ))
      FROM (
        SELECT 
          kct.to_column_id,
          COUNT(*) as entry_count,
          SUM(
            EXTRACT(EPOCH FROM (
              COALESCE(
                (SELECT MIN(kct2.moved_at) FROM kanban_column_transitions kct2 
                 WHERE kct2.project_id = kct.project_id AND kct2.moved_at > kct.moved_at),
                COALESCE(v_delivered_at, now())
              ) - kct.moved_at
            ))::integer
          ) as total_seconds
        FROM kanban_column_transitions kct
        WHERE kct.project_id = p_project_id
        GROUP BY kct.to_column_id
      ) sub
      JOIN kanban_columns kc ON kc.id = sub.to_column_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
