import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface RolePermission {
  id: string;
  workspace_id: string;
  role: AppRole;
  permission_key: string;
  enabled: boolean;
}

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  category: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Projetos
  { key: 'projects.view', name: 'Ver projetos', description: 'Visualizar lista de projetos no kanban', category: 'Projetos' },
  { key: 'projects.create', name: 'Criar projetos', description: 'Criar novos projetos', category: 'Projetos' },
  { key: 'projects.edit', name: 'Editar projetos', description: 'Modificar detalhes e mover no kanban', category: 'Projetos' },
  // Clientes
  { key: 'clients.view', name: 'Página de Clientes', description: 'Aceder à página /clientes no menu', category: 'Clientes' },
  { key: 'clients.create', name: 'Criar clientes', description: 'Adicionar novos clientes', category: 'Clientes' },
  { key: 'clients.edit', name: 'Editar clientes', description: 'Modificar dados de clientes existentes', category: 'Clientes' },
  { key: 'clients.view_contacts', name: 'Ver contactos', description: 'Ver email, telefone, NIF e morada', category: 'Clientes' },
  { key: 'clients.view_financials', name: 'Ver valores financeiros', description: 'Ver valor acordado e receita do cliente', category: 'Clientes' },
  // Páginas e Navegação
  { key: 'visibility.leads', name: 'Página de Leads', description: 'Aceder à página de Leads no menu', category: 'Páginas e Navegação' },
  { key: 'visibility.contracts', name: 'Página de Contratos', description: 'Aceder à página de Contratos no menu', category: 'Páginas e Navegação' },
  { key: 'visibility.all_projects', name: 'Ver todos os projetos', description: 'Se desativado, vê apenas os projetos atribuídos', category: 'Páginas e Navegação' },
  { key: 'team.view', name: 'Página de Equipa', description: 'Aceder à página da equipa e ver membros', category: 'Páginas e Navegação' },
  { key: 'reports.view', name: 'Página de Relatórios', description: 'Aceder à página de relatórios e métricas', category: 'Páginas e Navegação' },
  // Financeiro e Dashboard
  { key: 'dashboard.view_global_financials', name: 'Financeiro global', description: 'Ver receita total, custos e lucro no dashboard', category: 'Financeiro e Dashboard' },
  { key: 'dashboard.view_own_earnings', name: 'Meus ganhos', description: 'Ver os próprios ganhos no dashboard', category: 'Financeiro e Dashboard' },
  { key: 'dashboard.view_performance', name: 'Métricas de desempenho', description: 'Ver gráficos de performance', category: 'Financeiro e Dashboard' },
  { key: 'payments.manage', name: 'Gerir pagamentos', description: 'Criar, editar e registar pagamentos', category: 'Financeiro e Dashboard' },
  // Automações
  { key: 'automations.view', name: 'Ver automações', description: 'Visualizar automações configuradas', category: 'Automações' },
  { key: 'automations.manage', name: 'Gerir automações', description: 'Criar, editar e eliminar automações', category: 'Automações' },
];

export const ALL_ROLES: AppRole[] = ['admin', 'edicao', 'captacao', 'gestao', 'visualizacao'];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  edicao: 'Edição',
  captacao: 'Captação',
  gestao: 'Gestão',
  visualizacao: 'Visualização',
};

// Default permissions by role
const DEFAULT_PERMISSIONS: Record<AppRole, string[]> = {
  admin: PERMISSION_DEFINITIONS.map(p => p.key), // All permissions
  edicao: [
    'projects.view', 'projects.create', 'projects.edit',
    'clients.view', 'clients.create', 'clients.edit', 'clients.view_financials', 'clients.view_contacts',
    'team.view', 'payments.manage', 'reports.view',
    'visibility.leads', 'visibility.contracts', 'visibility.all_projects',
    'dashboard.view_global_financials', 'dashboard.view_performance'
  ],
  captacao: [
    'projects.view', 'projects.edit',
    'clients.view', 'clients.create', 'clients.edit',
    'team.view',
    'visibility.leads',
    'dashboard.view_own_earnings'
  ],
  gestao: [
    'projects.view', 'team.view',
    'dashboard.view_own_earnings'
  ],
  visualizacao: [
    'projects.view', 'clients.view', 'team.view', 'reports.view',
    'dashboard.view_own_earnings', 'dashboard.view_performance'
  ],
};

export function useRolePermissions() {
  const { currentWorkspace, isAdmin } = useWorkspace();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('workspace_role_permissions')
      .select('*')
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      logger.error('Error fetching role permissions:', error);
      setPermissions([]);
    } else {
      // If no permissions exist, initialize them
      if (!data || data.length === 0) {
        await initializePermissions();
      } else {
        setPermissions(data as RolePermission[]);
      }
    }
    
    setLoading(false);
  }, [currentWorkspace?.id]);

  const initializePermissions = async () => {
    if (!currentWorkspace?.id) return;

    // Call the database function to initialize permissions
    const { error } = await supabase.rpc('initialize_workspace_permissions', {
      _workspace_id: currentWorkspace.id,
    });

    if (error) {
      logger.error('Error initializing permissions:', error);
    }

    // Fetch the newly created permissions
    const { data } = await supabase
      .from('workspace_role_permissions')
      .select('*')
      .eq('workspace_id', currentWorkspace.id);

    if (data) {
      setPermissions(data as RolePermission[]);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const getPermission = (role: AppRole, permissionKey: string): boolean => {
    // Admin always has all permissions
    if (role === 'admin') return true;
    
    const perm = permissions.find(
      p => p.role === role && p.permission_key === permissionKey
    );
    return perm?.enabled ?? false;
  };

  const updatePermission = async (role: AppRole, permissionKey: string, enabled: boolean) => {
    if (!currentWorkspace?.id || !isAdmin) return { success: false, error: 'Sem permissão' };
    
    // Can't modify admin permissions
    if (role === 'admin') return { success: false, error: 'Não é possível modificar permissões de admin' };

    setSaving(true);

    const { error } = await supabase
      .from('workspace_role_permissions')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('workspace_id', currentWorkspace.id)
      .eq('role', role)
      .eq('permission_key', permissionKey);

    setSaving(false);

    if (error) {
      logger.error('Error updating permission:', error);
      return { success: false, error: error.message };
    }

    // Update local state
    setPermissions(prev => 
      prev.map(p => 
        p.role === role && p.permission_key === permissionKey 
          ? { ...p, enabled } 
          : p
      )
    );

    return { success: true };
  };

  const resetToDefaults = async () => {
    if (!currentWorkspace?.id || !isAdmin) return { success: false, error: 'Sem permissão' };

    setSaving(true);

    // Update each role's permissions to defaults
    for (const role of ALL_ROLES) {
      if (role === 'admin') continue; // Skip admin
      
      for (const permDef of PERMISSION_DEFINITIONS) {
        const shouldBeEnabled = DEFAULT_PERMISSIONS[role].includes(permDef.key);
        
        await supabase
          .from('workspace_role_permissions')
          .update({ enabled: shouldBeEnabled, updated_at: new Date().toISOString() })
          .eq('workspace_id', currentWorkspace.id)
          .eq('role', role)
          .eq('permission_key', permDef.key);
      }
    }

    await fetchPermissions();
    
    setSaving(false);
    return { success: true };
  };

  const saveAllPermissions = async (updatedPermissions: { role: AppRole; key: string; enabled: boolean }[]) => {
    if (!currentWorkspace?.id || !isAdmin) return { success: false, error: 'Sem permissão' };

    setSaving(true);

    const updates = updatedPermissions
      .filter(p => p.role !== 'admin') // Skip admin
      .map(p => 
        supabase
          .from('workspace_role_permissions')
          .update({ enabled: p.enabled, updated_at: new Date().toISOString() })
          .eq('workspace_id', currentWorkspace.id)
          .eq('role', p.role)
          .eq('permission_key', p.key)
      );

    await Promise.all(updates);
    await fetchPermissions();
    
    setSaving(false);
    return { success: true };
  };

  return {
    permissions,
    loading,
    saving,
    getPermission,
    updatePermission,
    resetToDefaults,
    saveAllPermissions,
    refresh: fetchPermissions,
  };
}
