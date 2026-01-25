import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

export interface ContractTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  content: string;
  placeholders: string[];
  category: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplateInsert {
  name: string;
  description?: string | null;
  content: string;
  placeholders?: string[];
  category?: string | null;
  is_default?: boolean;
}

// Available placeholders for contracts
export const AVAILABLE_PLACEHOLDERS = [
  { key: '{{cliente.nome}}', label: 'Nome do Cliente', category: 'cliente' },
  { key: '{{cliente.empresa}}', label: 'Empresa do Cliente', category: 'cliente' },
  { key: '{{cliente.email}}', label: 'Email do Cliente', category: 'cliente' },
  { key: '{{cliente.telefone}}', label: 'Telefone do Cliente', category: 'cliente' },
  { key: '{{cliente.nif}}', label: 'NIF/Tax ID do Cliente', category: 'cliente' },
  { key: '{{cliente.morada}}', label: 'Morada do Cliente', category: 'cliente' },
  { key: '{{projeto.nome}}', label: 'Nome do Projeto', category: 'projeto' },
  { key: '{{projeto.data}}', label: 'Data do Projeto', category: 'projeto' },
  { key: '{{projeto.local}}', label: 'Local do Projeto', category: 'projeto' },
  { key: '{{contrato.valor}}', label: 'Valor do Contrato', category: 'contrato' },
  { key: '{{contrato.data_hoje}}', label: 'Data de Hoje', category: 'contrato' },
  { key: '{{contrato.validade}}', label: 'Validade do Contrato', category: 'contrato' },
  { key: '{{empresa.nome}}', label: 'Nome da Empresa', category: 'empresa' },
];

export function useContractTemplates() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Parse placeholders from JSONB
      const parsed = (data || []).map(t => ({
        ...t,
        placeholders: Array.isArray(t.placeholders) ? t.placeholders : [],
      }));
      
      setTemplates(parsed as ContractTemplate[]);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      logger.error('Error fetching contract templates:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  useEffect(() => {
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchTemplates();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError, fetchTemplates]);

  const createTemplate = async (template: ContractTemplateInsert) => {
    if (!currentWorkspace) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          ...template,
          workspace_id: currentWorkspace.id,
          created_by: user?.id,
          placeholders: template.placeholders || [],
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Template criado com sucesso' });
      
      const parsed = {
        ...data,
        placeholders: Array.isArray(data.placeholders) ? data.placeholders : [],
      } as ContractTemplate;
      
      setTemplates(prev => [...prev, parsed].sort((a, b) => a.name.localeCompare(b.name)));
      return parsed;
    } catch (error) {
      toast({
        title: 'Erro ao criar template',
        description: handleDatabaseError('createTemplate', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<ContractTemplateInsert>) => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Template actualizado com sucesso' });
      
      const parsed = {
        ...data,
        placeholders: Array.isArray(data.placeholders) ? data.placeholders : [],
      } as ContractTemplate;
      
      setTemplates(prev => prev.map(t => t.id === id ? parsed : t));
      return parsed;
    } catch (error) {
      toast({
        title: 'Erro ao actualizar template',
        description: handleDatabaseError('updateTemplate', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Template eliminado com sucesso' });
      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (error) {
      toast({
        title: 'Erro ao eliminar template',
        description: handleDatabaseError('deleteTemplate', error),
        variant: 'destructive',
      });
      return false;
    }
  };

  const duplicateTemplate = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return null;

    return createTemplate({
      name: `${template.name} (Cópia)`,
      description: template.description,
      content: template.content,
      placeholders: template.placeholders,
      category: template.category,
      is_default: false,
    });
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refresh: fetchTemplates,
  };
}
