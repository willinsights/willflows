import { Clock, BarChart3, History, Timer, RotateCcw, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTimeTracking, formatDurationLong } from '@/hooks/useTimeTracking';
import { TimerButton } from './TimerButton';
import { SessionsList } from './SessionsList';
import { ColumnTimeBreakdown } from './ColumnTimeBreakdown';
import { ProjectTimeline } from './ProjectTimeline';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectTimeTabProps {
  projectId: string;
}

export function ProjectTimeTab({ projectId }: ProjectTimeTabProps) {
  const {
    activeTimer,
    projectSessions,
    sessionsLoading,
    projectSummary,
    summaryLoading,
    transitions,
    elapsedSeconds,
    isTimerActiveForProject,
    startTimer,
    pauseTimer,
    isStarting,
    isPausing,
  } = useTimeTracking(projectId);

  // Build column name map from transitions
  const columnNames: Record<string, string> = {};
  projectSummary?.column_breakdown?.forEach(c => {
    columnNames[c.column_id] = c.column_name;
  });

  if (summaryLoading || sessionsLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const totalActive = projectSummary?.total_active_seconds || 0;
  const totalCycle = projectSummary?.total_cycle_seconds || 0;
  const reworkCount = projectSummary?.rework_count || 0;

  // If timer is active on another project, show notice
  const timerOnOtherProject = activeTimer && !activeTimer.ended_at && activeTimer.project_id !== projectId;

  return (
    <div className="space-y-4">
      {/* Timer Control */}
      <div className="flex items-center justify-between">
        <TimerButton
          isActive={isTimerActiveForProject}
          elapsedSeconds={elapsedSeconds}
          onStart={() => startTimer(projectId)}
          onPause={() => pauseTimer()}
          isStarting={isStarting}
          isPausing={isPausing}
        />
      </div>

      {timerOnOtherProject && (
        <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-md px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Timer ativo noutro projeto. Iniciar aqui vai pausar o anterior.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Timer className="h-3 w-3" />
            Tempo Trabalhado
          </div>
          <div className="text-sm font-semibold text-foreground">
            {formatDurationLong(totalActive + (isTimerActiveForProject ? elapsedSeconds : 0))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            Tempo de Ciclo
          </div>
          <div className="text-sm font-semibold text-foreground">
            {totalCycle > 0 ? formatDurationLong(totalCycle) : '—'}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
            <RotateCcw className="h-3 w-3" />
            Retornos
          </div>
          <div className="text-sm font-semibold text-foreground">
            {reworkCount}
          </div>
        </div>
      </div>

      {/* Column Time Breakdown */}
      {projectSummary && projectSummary.column_breakdown?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Tempo por Etapa
          </div>
          <ColumnTimeBreakdown summary={projectSummary} />
        </div>
      )}

      <Separator />

      {/* Sessions */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
          <Clock className="h-3.5 w-3.5" />
          Sessões de Trabalho
        </div>
        <SessionsList sessions={projectSessions} />
      </div>

      <Separator />

      {/* Timeline */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
          <History className="h-3.5 w-3.5" />
          Timeline
        </div>
        <ProjectTimeline 
          sessions={projectSessions} 
          transitions={transitions} 
          columnNames={columnNames}
        />
      </div>
    </div>
  );
}
