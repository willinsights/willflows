import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import { logger } from '@/lib/logger';
export interface WorkspaceGoal {
  id: string;
  workspace_id: string;
  month: string;
  revenue_goal: number;
  projects_goal: number;
}

export function useWorkspaceGoals() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [goal, setGoal] = useState<WorkspaceGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const fetchGoal = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workspace_goals')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (error) throw error;
      setGoal(data);
    } catch (error) {
      logger.error('Error fetching workspace goals:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, currentMonth]);

  const saveGoal = useCallback(async (revenueGoal: number, projectsGoal: number) => {
    if (!currentWorkspace?.id) return;

    try {
      const { data, error } = await supabase
        .from('workspace_goals')
        .upsert({
          workspace_id: currentWorkspace.id,
          month: currentMonth,
          revenue_goal: revenueGoal,
          projects_goal: projectsGoal,
        }, {
          onConflict: 'workspace_id,month',
        })
        .select()
        .single();

      if (error) throw error;

      setGoal(data);
      toast({
        title: 'Metas atualizadas',
        description: 'As metas mensais foram guardadas com sucesso.',
      });

      return data;
    } catch (error) {
      logger.error('Error saving workspace goals:', error);
      toast({
        title: 'Erro ao guardar',
        description: 'Não foi possível guardar as metas.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [currentWorkspace?.id, currentMonth, toast]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  return {
    goal,
    loading,
    saveGoal,
    refresh: fetchGoal,
  };
}
