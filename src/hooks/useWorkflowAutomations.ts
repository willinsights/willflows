import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface WorkflowAutomation {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: Record<string, unknown> | null;
  action_type: string;
  action_config: Record<string, unknown>;
  recipient_config: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationFormData {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  recipient_config: Record<string, unknown>;
}

export const TRIGGER_TYPES = [
  { value: 'card_enters_column', label: 'Card entra numa coluna', icon: '📥' },
  { value: 'card_leaves_column', label: 'Card sai de uma coluna', icon: '📤' },
  { value: 'card_moved', label: 'Card movido entre colunas', icon: '↔️' },
  { value: 'project_created', label: 'Projeto criado', icon: '🆕' },
  { value: 'project_delivered', label: 'Projeto entregue', icon: '✅' },
  { value: 'project_archived', label: 'Projeto arquivado', icon: '📦' },
] as const;

export const ACTION_TYPES = [
  { value: 'send_email', label: 'Enviar Email', icon: '📧' },
  { value: 'notify_in_app', label: 'Notificação In-App', icon: '🔔' },
] as const;

export const RECIPIENT_TYPES = [
  { value: 'project_team', label: 'Equipa do Projeto' },
  { value: 'project_owner', label: 'Responsável do Projeto' },
  { value: 'project_client', label: 'Cliente do Projeto' },
  { value: 'role', label: 'Por Função (Role)' },
  { value: 'fixed_emails', label: 'Emails Fixos' },
  { value: 'group', label: 'Grupo Personalizado' },
] as const;

export function useWorkflowAutomations() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [automations, setAutomations] = useState<WorkflowAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAutomations = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setAutomations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_automations')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching automations:', error);
    } else {
      setAutomations((data || []) as unknown as WorkflowAutomation[]);
    }
    setLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const createAutomation = async (formData: AutomationFormData) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    setSaving(true);
    const { data, error } = await supabase
      .from('workflow_automations')
      .insert({
        workspace_id: currentWorkspace.id,
        name: formData.name,
        description: formData.description || null,
        trigger_type: formData.trigger_type as any,
        trigger_config: formData.trigger_config,
        action_type: formData.action_type as any,
        action_config: formData.action_config,
        recipient_config: formData.recipient_config,
        created_by: user.id,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      logger.error('Error creating automation:', error);
      toast({ title: 'Erro ao criar automação', description: error.message, variant: 'destructive' });
      return null;
    }

    toast({ title: 'Automação criada com sucesso' });
    await fetchAutomations();
    return data;
  };

  const updateAutomation = async (id: string, updates: Partial<AutomationFormData & { is_active: boolean }>) => {
    setSaving(true);
    const { error } = await supabase
      .from('workflow_automations')
      .update(updates as any)
      .eq('id', id);

    setSaving(false);

    if (error) {
      logger.error('Error updating automation:', error);
      toast({ title: 'Erro ao atualizar automação', description: error.message, variant: 'destructive' });
      return false;
    }

    await fetchAutomations();
    return true;
  };

  const deleteAutomation = async (id: string) => {
    const { error } = await supabase
      .from('workflow_automations')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting automation:', error);
      toast({ title: 'Erro ao eliminar automação', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Automação eliminada' });
    await fetchAutomations();
    return true;
  };

  const toggleAutomation = async (id: string, isActive: boolean) => {
    return updateAutomation(id, { is_active: isActive });
  };

  return {
    automations,
    loading,
    saving,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    refresh: fetchAutomations,
  };
}
