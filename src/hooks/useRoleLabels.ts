import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Database } from '@/integrations/supabase/types';

import { logger } from '@/lib/logger';
type AppRole = Database['public']['Enums']['app_role'];

interface RoleLabel {
  role: AppRole;
  custom_label: string;
}

// Labels padrão para cada role
export const DEFAULT_ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  edicao: 'Edição',
  captacao: 'Captação',
  gestao: 'Gestão',
  visualizacao: 'Visualização',
};

// Roles que podem ser personalizados (exclui admin)
export const CUSTOMIZABLE_ROLES: AppRole[] = ['edicao', 'captacao', 'gestao', 'visualizacao'];

// Roles disponíveis para convite (exclui admin)
export const INVITE_ROLES: AppRole[] = ['edicao', 'captacao', 'gestao', 'visualizacao'];

export function useRoleLabels() {
  const { workspace } = useWorkspace();
  const [customLabels, setCustomLabels] = useState<Record<AppRole, string>>({} as Record<AppRole, string>);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLabels = useCallback(async () => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('workspace_role_labels')
        .select('role, custom_label')
        .eq('workspace_id', workspace.id);

      if (error) throw error;

      const labels: Record<AppRole, string> = {} as Record<AppRole, string>;
      data?.forEach((item: RoleLabel) => {
        labels[item.role] = item.custom_label;
      });
      setCustomLabels(labels);
    } catch (err) {
      logger.error('Erro ao buscar labels de roles:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Retorna o label customizado ou o padrão
  const getRoleLabel = useCallback((role: AppRole): string => {
    return customLabels[role] || DEFAULT_ROLE_LABELS[role];
  }, [customLabels]);

  // Atualiza um label de role
  const updateRoleLabel = useCallback(async (role: AppRole, newLabel: string): Promise<{ success: boolean; error?: string }> => {
    if (!workspace?.id) {
      return { success: false, error: 'Workspace não encontrado' };
    }

    if (role === 'admin') {
      return { success: false, error: 'Não é possível alterar o nome do role Admin' };
    }

    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) {
      return { success: false, error: 'O nome não pode estar vazio' };
    }

    setSaving(true);
    try {
      // Upsert: insere ou atualiza
      const { error } = await supabase
        .from('workspace_role_labels')
        .upsert({
          workspace_id: workspace.id,
          role,
          custom_label: trimmedLabel,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id,role',
        });

      if (error) throw error;

      setCustomLabels(prev => ({ ...prev, [role]: trimmedLabel }));
      return { success: true };
    } catch (err: any) {
      logger.error('Erro ao atualizar label:', err);
      return { success: false, error: err.message || 'Erro ao guardar' };
    } finally {
      setSaving(false);
    }
  }, [workspace?.id]);

  // Atualiza múltiplos labels de uma vez
  const updateMultipleLabels = useCallback(async (updates: { role: AppRole; label: string }[]): Promise<{ success: boolean; error?: string }> => {
    if (!workspace?.id) {
      return { success: false, error: 'Workspace não encontrado' };
    }

    const validUpdates = updates.filter(u => u.role !== 'admin' && u.label.trim());
    if (validUpdates.length === 0) {
      return { success: true };
    }

    setSaving(true);
    try {
      const upsertData = validUpdates.map(u => ({
        workspace_id: workspace.id,
        role: u.role,
        custom_label: u.label.trim(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('workspace_role_labels')
        .upsert(upsertData, {
          onConflict: 'workspace_id,role',
        });

      if (error) throw error;

      const newLabels = { ...customLabels };
      validUpdates.forEach(u => {
        newLabels[u.role] = u.label.trim();
      });
      setCustomLabels(newLabels);

      return { success: true };
    } catch (err: any) {
      logger.error('Erro ao atualizar labels:', err);
      return { success: false, error: err.message || 'Erro ao guardar' };
    } finally {
      setSaving(false);
    }
  }, [workspace?.id, customLabels]);

  // Reset para labels padrão
  const resetToDefaults = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!workspace?.id) {
      return { success: false, error: 'Workspace não encontrado' };
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('workspace_role_labels')
        .delete()
        .eq('workspace_id', workspace.id);

      if (error) throw error;

      setCustomLabels({} as Record<AppRole, string>);
      return { success: true };
    } catch (err: any) {
      logger.error('Erro ao resetar labels:', err);
      return { success: false, error: err.message || 'Erro ao resetar' };
    } finally {
      setSaving(false);
    }
  }, [workspace?.id]);

  return {
    loading,
    saving,
    getRoleLabel,
    updateRoleLabel,
    updateMultipleLabels,
    resetToDefaults,
    customLabels,
    refetch: fetchLabels,
  };
}
