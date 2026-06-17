import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export type CostCategory = 'equipamento' | 'deslocacao' | 'alojamento' | 'alimentacao' | 'equipa' | 'software' | 'outro';

export interface ProjectCostLine {
  id: string;
  project_id: string;
  workspace_id: string;
  category: CostCategory;
  description: string | null;
  estimated_amount: number;
  actual_amount: number;
  payment_status: string;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const costCategoryLabels: Record<CostCategory, string> = {
  equipamento: 'Equipamento',
  deslocacao: 'Deslocação',
  alojamento: 'Alojamento',
  alimentacao: 'Alimentação',
  equipa: 'Equipa',
  software: 'Software',
  outro: 'Outro',
};

export const costCategoryIcons: Record<CostCategory, string> = {
  equipamento: '📷',
  deslocacao: '🚗',
  alojamento: '🏨',
  alimentacao: '🍽️',
  equipa: '👥',
  software: '💻',
  outro: '📦',
};

export function useProjectCostLines(projectId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [costLines, setCostLines] = useState<ProjectCostLine[]>([]);
  const [loading, setLoading] = useState(true);

  const invalidateEngine = useCallback(() => {
    if (currentWorkspace?.id) {
      queryClient.invalidateQueries({ queryKey: ['finance', 'engine-cost-lines', currentWorkspace.id] });
    }
  }, [queryClient, currentWorkspace?.id]);

  const fetchCostLines = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);

    let query = supabase
      .from('project_cost_lines')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Error fetching cost lines:', error);
    } else {
      setCostLines((data || []) as ProjectCostLine[]);
    }
    setLoading(false);
  }, [currentWorkspace?.id, projectId]);

  useEffect(() => {
    fetchCostLines();
  }, [fetchCostLines]);

  const addCostLine = async (line: {
    project_id: string;
    category: CostCategory;
    description?: string;
    estimated_amount: number;
    actual_amount?: number;
  }) => {
    if (!currentWorkspace?.id) return null;

    const { data, error } = await supabase
      .from('project_cost_lines')
      .insert({
        project_id: line.project_id,
        workspace_id: currentWorkspace.id,
        category: line.category,
        description: line.description || null,
        estimated_amount: line.estimated_amount,
        actual_amount: line.actual_amount || 0,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao adicionar linha de custo');
      logger.error(error);
      return null;
    }

    await fetchCostLines();
    invalidateEngine();
    toast.success('Linha de custo adicionada');
    return data as ProjectCostLine;
  };

  const updateCostLine = async (id: string, updates: {
    category?: CostCategory;
    description?: string | null;
    estimated_amount?: number;
    actual_amount?: number;
    payment_status?: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  }) => {
    const { error } = await supabase
      .from('project_cost_lines')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar linha de custo');
      logger.error(error);
      return false;
    }

    await fetchCostLines();
    invalidateEngine();
    return true;
  };

  const deleteCostLine = async (id: string) => {
    const { error } = await supabase
      .from('project_cost_lines')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao remover linha de custo');
      logger.error(error);
      return false;
    }

    await fetchCostLines();
    toast.success('Linha de custo removida');
    return true;
  };

  // Aggregations
  const totalEstimated = costLines.reduce((s, l) => s + l.estimated_amount, 0);
  const totalActual = costLines.reduce((s, l) => s + l.actual_amount, 0);
  const variance = totalActual - totalEstimated;
  const variancePercent = totalEstimated > 0 ? Math.round((variance / totalEstimated) * 100) : 0;

  return {
    costLines,
    loading,
    addCostLine,
    updateCostLine,
    deleteCostLine,
    refresh: fetchCostLines,
    totalEstimated,
    totalActual,
    variance,
    variancePercent,
  };
}
