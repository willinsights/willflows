import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
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
  { key: 'projects.view', name: 'Ver projetos', description: 'Visualizar lista de projetos', category: 'Projetos' },
  { key: 'projects.create', name: 'Criar projetos', description: 'Criar novos projetos', category: 'Projetos' },
  { key: 'projects.edit', name: 'Editar projetos', description: 'Modificar detalhes de projetos', category: 'Projetos' },
  { key: 'projects.delete', name: 'Eliminar projetos', description: 'Remover projetos permanentemente', category: 'Projetos' },
  // Clientes
  { key: 'clients.view', name: 'Ver clientes', description: 'Visualizar lista de clientes', category: 'Clientes' },
  { key: 'clients.create', name: 'Criar clientes', description: 'Adicionar novos clientes', category: 'Clientes' },
  { key: 'clients.edit', name: 'Editar clientes', description: 'Modificar dados de clientes', category: 'Clientes' },
  { key: 'clients.view_financials', name: 'Ver valores financeiros', description: 'Aceder a informação financeira', category: 'Clientes' },
  // Equipa
  { key: 'team.view', name: 'Ver equipa', description: 'Visualizar membros da equipa', category: 'Equipa' },
  { key: 'team.invite', name: 'Convidar membros', description: 'Enviar convites para novos membros', category: 'Equipa' },
  { key: 'team.manage', name: 'Gerir membros', description: 'Alterar funções e remover membros', category: 'Equipa' },
  // Pagamentos
  { key: 'payments.view', name: 'Ver pagamentos', description: 'Visualizar pagamentos e faturas', category: 'Pagamentos' },
  { key: 'payments.manage', name: 'Gerir pagamentos', description: 'Criar e editar pagamentos', category: 'Pagamentos' },
  // Relatórios
  { key: 'reports.view', name: 'Ver relatórios', description: 'Aceder a relatórios e métricas', category: 'Relatórios' },
];

export const ALL_ROLES: AppRole[] = ['admin', 'editor', 'captacao', 'freelancer', 'visualizador'];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  captacao: 'Captação',
  freelancer: 'Freelancer',
  visualizador: 'Visualizador',
};

// Default permissions by role
const DEFAULT_PERMISSIONS: Record<AppRole, string[]> = {
  admin: PERMISSION_DEFINITIONS.map(p => p.key), // All permissions
  editor: [
    'projects.view', 'projects.create', 'projects.edit',
    'clients.view', 'clients.create', 'clients.edit', 'clients.view_financials',
    'team.view', 'payments.view', 'payments.manage', 'reports.view'
  ],
  captacao: [
    'projects.view', 'projects.edit',
    'clients.view', 'clients.create', 'clients.edit',
    'team.view'
  ],
  freelancer: ['projects.view', 'team.view'],
  visualizador: ['projects.view', 'clients.view', 'team.view', 'reports.view'],
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
      console.error('Error fetching role permissions:', error);
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
      console.error('Error initializing permissions:', error);
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
      console.error('Error updating permission:', error);
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
