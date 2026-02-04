-- Fase 1: Renomear valores do enum app_role
ALTER TYPE public.app_role RENAME VALUE 'editor' TO 'edicao';
ALTER TYPE public.app_role RENAME VALUE 'freelancer' TO 'gestao';
ALTER TYPE public.app_role RENAME VALUE 'visualizador' TO 'visualizacao';

-- Fase 2: Atualizar função initialize_workspace_permissions com novos roles
CREATE OR REPLACE FUNCTION public.initialize_workspace_permissions(_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  permission_keys text[] := ARRAY[
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'clients.view', 'clients.create', 'clients.edit', 'clients.view_contacts', 'clients.view_financials',
    'team.view', 'team.view_contacts', 'team.invite', 'team.manage',
    'payments.view', 'payments.manage',
    'reports.view',
    'visibility.leads', 'visibility.contracts', 'visibility.all_projects',
    'dashboard.view_global_financials', 'dashboard.view_own_earnings', 'dashboard.view_performance'
  ];
  roles app_role[] := ARRAY['admin', 'edicao', 'captacao', 'gestao', 'visualizacao']::app_role[];
  r app_role;
  k text;
  is_enabled boolean;
BEGIN
  -- Para cada role e permissão, inserir o valor default
  FOREACH r IN ARRAY roles LOOP
    FOREACH k IN ARRAY permission_keys LOOP
      -- Definir permissões default por role
      is_enabled := CASE
        -- Admin tem tudo
        WHEN r = 'admin' THEN true
        
        -- Edição (antigo editor) - quase tudo exceto delete e team.manage
        WHEN r = 'edicao' THEN k NOT IN ('projects.delete', 'team.invite', 'team.manage')
        
        -- Captação - foco em leads e clientes
        WHEN r = 'captacao' THEN k IN (
          'projects.view', 'projects.edit',
          'clients.view', 'clients.create', 'clients.edit', 'clients.view_contacts',
          'team.view',
          'visibility.leads',
          'dashboard.view_own_earnings'
        )
        
        -- Gestão (antigo freelancer) - visualização básica + próprios ganhos
        WHEN r = 'gestao' THEN k IN (
          'projects.view',
          'team.view',
          'dashboard.view_own_earnings'
        )
        
        -- Visualização (antigo visualizador) - apenas leitura
        WHEN r = 'visualizacao' THEN k IN (
          'projects.view',
          'clients.view',
          'team.view',
          'reports.view',
          'dashboard.view_own_earnings', 'dashboard.view_performance'
        )
        
        ELSE false
      END;
      
      -- Inserir ou atualizar permissão
      INSERT INTO public.workspace_role_permissions (workspace_id, role, permission_key, enabled)
      VALUES (_workspace_id, r, k, is_enabled)
      ON CONFLICT (workspace_id, role, permission_key) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Fase 3: Atualizar RLS policies que usam roles antigos
-- Nota: As policies existentes serão migradas automaticamente pelo rename do enum
-- Mas precisamos garantir que novas comparações usam os nomes corretos

-- Recriar função has_workspace_permission para garantir compatibilidade
CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  _user_id uuid,
  _workspace_id uuid,
  _permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT wrp.enabled
      FROM public.workspace_role_permissions wrp
      JOIN public.workspace_members wm ON wm.workspace_id = wrp.workspace_id AND wm.role = wrp.role
      WHERE wm.user_id = _user_id
        AND wm.workspace_id = _workspace_id
        AND wm.is_active = true
        AND wrp.permission_key = _permission_key
    ),
    -- Fallback: admin sempre tem permissão
    (
      SELECT wm.role = 'admin'
      FROM public.workspace_members wm
      WHERE wm.user_id = _user_id
        AND wm.workspace_id = _workspace_id
        AND wm.is_active = true
    )
  );
$$;