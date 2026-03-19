import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Timer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface KanbanTimerIndicatorProps {
  projectId: string;
}

export function KanbanTimerIndicator({ projectId }: KanbanTimerIndicatorProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // Read from the shared active-timer cache (set by useTimeTracking)
  const { data: activeTimer } = useQuery({
    queryKey: ['active-timer', user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !currentWorkspace?.id) return null;
      const { data, error } = await supabase
        .from('time_sessions')
        .select('id, project_id')
        .eq('user_id', user.id)
        .eq('workspace_id', currentWorkspace.id)
        .is('ended_at', null)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id && !!currentWorkspace?.id,
    staleTime: 1000 * 60 * 5, // use cache from useTimeTracking
  });

  if (!activeTimer || activeTimer.project_id !== projectId) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Timer className="h-3 w-3 text-primary animate-pulse" />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] px-2 py-1">
          Timer ativo
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
