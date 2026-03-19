
-- Trigger types enum
CREATE TYPE public.automation_trigger_type AS ENUM (
  'card_enters_column',
  'card_leaves_column', 
  'card_moved',
  'project_created',
  'project_delivered',
  'project_archived',
  'comment_added'
);

-- Action types enum
CREATE TYPE public.automation_action_type AS ENUM (
  'send_email',
  'notify_in_app',
  'webhook'
);

-- Workflow automations table
CREATE TABLE public.workflow_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  trigger_type automation_trigger_type NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  conditions jsonb,
  action_type automation_action_type NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}',
  recipient_config jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace automations"
  ON public.workflow_automations FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage automations"
  ON public.workflow_automations FOR ALL TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- Recipient groups
CREATE TABLE public.automation_recipient_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  members jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_recipient_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view recipient groups"
  ON public.automation_recipient_groups FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage recipient groups"
  ON public.automation_recipient_groups FOR ALL TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- Execution log
CREATE TABLE public.automation_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.workflow_automations(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  trigger_type text NOT NULL,
  action_type text NOT NULL,
  recipients jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  executed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view execution logs"
  ON public.automation_execution_log FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Service can insert execution logs"
  ON public.automation_execution_log FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Allow service_role full access for edge function
CREATE POLICY "Service role full access automations"
  ON public.workflow_automations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access execution log"
  ON public.automation_execution_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access recipient groups"
  ON public.automation_recipient_groups FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add automation permissions to initialize function
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
    'timetracking.view_own', 'timetracking.view_all', 'timetracking.manage', 'timetracking.settings',
    'automations.view', 'automations.manage'
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
        WHEN r = 'edicao' THEN k NOT IN ('projects.delete', 'team.invite', 'team.manage', 'timetracking.settings', 'automations.manage')
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
          'timetracking.view_own', 'timetracking.view_all',
          'automations.view'
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

-- Updated at trigger
CREATE TRIGGER update_workflow_automations_updated_at
  BEFORE UPDATE ON public.workflow_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_recipient_groups_updated_at
  BEFORE UPDATE ON public.automation_recipient_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
