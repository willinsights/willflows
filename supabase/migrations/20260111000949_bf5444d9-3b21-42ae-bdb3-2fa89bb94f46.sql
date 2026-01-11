-- Create user_preferences table for email and notification settings
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Email preferences
  email_project_updates boolean NOT NULL DEFAULT true,
  email_payment_reminders boolean NOT NULL DEFAULT true,
  email_team_activity boolean NOT NULL DEFAULT true,
  email_weekly_summary boolean NOT NULL DEFAULT false,
  email_marketing boolean NOT NULL DEFAULT true,
  -- Notification preferences
  notify_new_project boolean NOT NULL DEFAULT true,
  notify_task_assigned boolean NOT NULL DEFAULT true,
  notify_payment_received boolean NOT NULL DEFAULT true,
  notify_deadline_reminder boolean NOT NULL DEFAULT true,
  notify_team_updates boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create workspace_role_permissions table for configurable permissions per role
CREATE TABLE public.workspace_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, role, permission_key)
);

-- Enable RLS
ALTER TABLE public.workspace_role_permissions ENABLE ROW LEVEL SECURITY;

-- Members can view permissions
CREATE POLICY "Members can view role permissions"
ON public.workspace_role_permissions
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

-- Admins can manage permissions
CREATE POLICY "Admins can manage role permissions"
ON public.workspace_role_permissions
FOR ALL
USING (is_workspace_admin(auth.uid(), workspace_id));

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_role_permissions_updated_at
BEFORE UPDATE ON public.workspace_role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize default permissions for a workspace
CREATE OR REPLACE FUNCTION public.initialize_workspace_permissions(_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  permission_keys text[] := ARRAY[
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'clients.view', 'clients.create', 'clients.edit', 'clients.view_financials',
    'team.view', 'team.invite', 'team.manage',
    'payments.view', 'payments.manage',
    'reports.view'
  ];
  roles app_role[] := ARRAY['admin', 'editor', 'captacao', 'freelancer', 'visualizador']::app_role[];
  r app_role;
  pkey text;
  is_enabled boolean;
BEGIN
  FOREACH r IN ARRAY roles LOOP
    FOREACH pkey IN ARRAY permission_keys LOOP
      -- Determine default value based on role and permission
      is_enabled := CASE
        -- Admin has all permissions
        WHEN r = 'admin' THEN true
        -- Editor permissions
        WHEN r = 'editor' THEN pkey IN (
          'projects.view', 'projects.create', 'projects.edit',
          'clients.view', 'clients.create', 'clients.edit', 'clients.view_financials',
          'team.view', 'payments.view', 'payments.manage', 'reports.view'
        )
        -- Captacao permissions
        WHEN r = 'captacao' THEN pkey IN (
          'projects.view', 'projects.edit',
          'clients.view', 'clients.create', 'clients.edit',
          'team.view'
        )
        -- Freelancer permissions
        WHEN r = 'freelancer' THEN pkey IN (
          'projects.view', 'team.view'
        )
        -- Visualizador permissions
        WHEN r = 'visualizador' THEN pkey IN (
          'projects.view', 'clients.view', 'team.view', 'reports.view'
        )
        ELSE false
      END;
      
      INSERT INTO public.workspace_role_permissions (workspace_id, role, permission_key, enabled)
      VALUES (_workspace_id, r, pkey, is_enabled)
      ON CONFLICT (workspace_id, role, permission_key) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Add trigger to initialize permissions when workspace is created
CREATE OR REPLACE FUNCTION public.trigger_initialize_workspace_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.initialize_workspace_permissions(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created_init_permissions
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.trigger_initialize_workspace_permissions();