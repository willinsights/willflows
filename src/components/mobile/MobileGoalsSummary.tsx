import { Target, Trophy, PartyPopper, Pencil } from 'lucide-react';
import { MobileCollapsibleCard } from './MobileCollapsibleCard';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useWorkspaceGoals } from '@/hooks/useWorkspaceGoals';
import { useHideValues } from '@/hooks/useHideValues';
import { cn } from '@/lib/utils';

interface MobileGoalsSummaryProps {
  currentRevenue: number;
  currentProjectsDelivered: number;
  loading: boolean;
}

export function MobileGoalsSummary({
  currentRevenue,
  currentProjectsDelivered,
  loading: metricsLoading,
}: MobileGoalsSummaryProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { goal, loading: goalLoading } = useWorkspaceGoals();
  const { hideValues } = useHideValues();
  
  const loading = metricsLoading || goalLoading;
  
  const revenueTarget = goal?.revenue_goal || 0;
  const projectsTarget = goal?.projects_goal || 0;
  
  const revenueProgress = revenueTarget > 0 
    ? Math.min(100, Math.round((currentRevenue / revenueTarget) * 100))
    : 0;
  
  const projectsProgress = projectsTarget > 0
    ? Math.min(100, Math.round((currentProjectsDelivered / projectsTarget) * 100))
    : 0;

  const hasGoals = revenueTarget > 0 || projectsTarget > 0;
  const revenueAchieved = revenueProgress >= 100;
  const projectsAchieved = projectsProgress >= 100;

  // Preview showing progress bars
  const PreviewContent = () => (
    <div className="space-y-2">
      {loading ? (
        <>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </>
      ) : !hasGoals ? (
        <p className="text-xs text-muted-foreground">Nenhuma meta definida</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14">Receita</span>
            <Progress value={revenueProgress} className="h-1.5 flex-1" />
            <span className={cn(
              'text-[10px] font-medium w-8 text-right',
              revenueAchieved && 'text-success'
            )}>
              {revenueProgress}%
            </span>
            {revenueAchieved && <Trophy className="h-3 w-3 text-success" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14">Projetos</span>
            <Progress value={projectsProgress} className="h-1.5 flex-1" />
            <span className={cn(
              'text-[10px] font-medium w-8 text-right',
              projectsAchieved && 'text-success'
            )}>
              {projectsProgress}%
            </span>
            {projectsAchieved && <PartyPopper className="h-3 w-3 text-success" />}
          </div>
        </>
      )}
    </div>
  );

  return (
    <MobileCollapsibleCard
      title="Metas Mensais"
      icon={Target}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      defaultExpanded={false}
      preview={<PreviewContent />}
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !hasGoals ? (
        <div className="py-4 text-center">
          <Target className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Nenhuma meta definida
          </p>
          <p className="text-xs text-muted-foreground">
            Defina metas na versão desktop
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Revenue Goal */}
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Meta de Receita</span>
              {revenueAchieved && (
                <span className="flex items-center gap-1 text-success text-[10px] font-medium">
                  <Trophy className="h-3 w-3" />
                  Atingida!
                </span>
              )}
            </div>
            <Progress value={revenueProgress} className="h-2 mb-2" />
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-semibold", hideValues && "blur-md select-none")}>
                {formatCurrency(currentRevenue)}
              </span>
              <span className={cn("text-xs text-muted-foreground", hideValues && "blur-md select-none")}>
                / {formatCurrency(revenueTarget)}
              </span>
            </div>
          </div>

          {/* Projects Goal */}
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Projetos Entregues</span>
              {projectsAchieved && (
                <span className="flex items-center gap-1 text-success text-[10px] font-medium">
                  <PartyPopper className="h-3 w-3" />
                  Atingida!
                </span>
              )}
            </div>
            <Progress value={projectsProgress} className="h-2 mb-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                {currentProjectsDelivered}
              </span>
              <span className="text-xs text-muted-foreground">
                / {projectsTarget}
              </span>
            </div>
          </div>
        </div>
      )}
    </MobileCollapsibleCard>
  );
}
