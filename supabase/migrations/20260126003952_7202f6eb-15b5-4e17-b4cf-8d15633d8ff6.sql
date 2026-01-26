-- Add new visibility and dashboard permissions for existing workspaces
DO $$
DECLARE
  new_permission_keys text[] := ARRAY[
    'visibility.leads',
    'visibility.contracts', 
    'visibility.all_projects',
    'dashboard.view_global_financials',
    'dashboard.view_own_earnings',
    'dashboard.view_performance'
  ];
  ws_id uuid;
  roles app_role[] := ARRAY['admin', 'editor', 'captacao', 'freelancer', 'visualizador']::app_role[];
  r app_role;
  pkey text;
  is_enabled boolean;
BEGIN
  -- Loop through all workspaces
  FOR ws_id IN SELECT id FROM workspaces LOOP
    FOREACH r IN ARRAY roles LOOP
      FOREACH pkey IN ARRAY new_permission_keys LOOP
        -- Determine default value based on role and permission
        is_enabled := CASE
          -- Admin has all permissions
          WHEN r = 'admin' THEN true
          -- Editor permissions (same as admin for visibility, can see performance)
          WHEN r = 'editor' THEN pkey IN (
            'visibility.leads', 'visibility.contracts', 'visibility.all_projects',
            'dashboard.view_global_financials', 'dashboard.view_performance'
          )
          -- Captacao permissions (can see leads, own earnings)
          WHEN r = 'captacao' THEN pkey IN (
            'visibility.leads',
            'dashboard.view_own_earnings'
          )
          -- Freelancer permissions (only own earnings, only their projects)
          WHEN r = 'freelancer' THEN pkey IN (
            'dashboard.view_own_earnings'
          )
          -- Visualizador permissions (view performance but not global financials)
          WHEN r = 'visualizador' THEN pkey IN (
            'dashboard.view_own_earnings',
            'dashboard.view_performance'
          )
          ELSE false
        END;
        
        INSERT INTO public.workspace_role_permissions (workspace_id, role, permission_key, enabled)
        VALUES (ws_id, r, pkey, is_enabled)
        ON CONFLICT (workspace_id, role, permission_key) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- Update the initialize_workspace_permissions function to include new permissions
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
    'reports.view',
    -- New visibility permissions
    'visibility.leads', 'visibility.contracts', 'visibility.all_projects',
    -- New dashboard permissions
    'dashboard.view_global_financials', 'dashboard.view_own_earnings', 'dashboard.view_performance'
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
          'team.view', 'payments.view', 'payments.manage', 'reports.view',
          'visibility.leads', 'visibility.contracts', 'visibility.all_projects',
          'dashboard.view_global_financials', 'dashboard.view_performance'
        )
        -- Captacao permissions
        WHEN r = 'captacao' THEN pkey IN (
          'projects.view', 'projects.edit',
          'clients.view', 'clients.create', 'clients.edit',
          'team.view',
          'visibility.leads',
          'dashboard.view_own_earnings'
        )
        -- Freelancer permissions
        WHEN r = 'freelancer' THEN pkey IN (
          'projects.view', 'team.view',
          'dashboard.view_own_earnings'
        )
        -- Visualizador permissions
        WHEN r = 'visualizador' THEN pkey IN (
          'projects.view', 'clients.view', 'team.view', 'reports.view',
          'dashboard.view_own_earnings', 'dashboard.view_performance'
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