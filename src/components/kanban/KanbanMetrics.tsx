import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  BarChart3,
  Timer,
  Layers,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useKanbanMetrics, formatDuration, getPhaseName, getPhaseColor } from '@/hooks/useKanbanMetrics';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: 'primary' | 'green' | 'yellow' | 'red';
  loading?: boolean;
}

function MetricCard({ title, value, subtitle, icon: Icon, color = 'primary', loading }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    red: 'bg-red-500/10 text-red-500',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-lg', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PhaseBarProps {
  phase: string;
  avgHours: number;
  maxAvgHours: number;
  count: number;
}

function PhaseBar({ phase, avgHours, maxAvgHours, count }: PhaseBarProps) {
  const percentage = maxAvgHours > 0 ? (avgHours / maxAvgHours) * 100 : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{getPhaseName(phase)}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{count} projetos</span>
          <Badge variant="secondary">{formatDuration(avgHours)}</Badge>
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: getPhaseColor(phase) }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function KanbanMetrics() {
  const { currentWorkspace } = useWorkspace();
  const { data: metrics, isLoading, error } = useKanbanMetrics({
    workspaceId: currentWorkspace?.id || null,
  });

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <p>Erro ao carregar métricas. Tente novamente.</p>
        </div>
      </Card>
    );
  }

  // Calculate max avg hours for bar scaling
  const maxAvgHours = metrics?.avg_time_by_phase?.reduce(
    (max, p) => Math.max(max, p.avg_hours || 0), 
    0
  ) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Métricas de Performance</h2>
        <p className="text-muted-foreground">Últimos 30 dias</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Projetos Entregues"
          value={metrics?.throughput.total_completed || 0}
          subtitle={`${metrics?.throughput.avg_per_week || 0}/semana`}
          icon={CheckCircle2}
          color="green"
          loading={isLoading}
        />
        <MetricCard
          title="Tempo Médio de Ciclo"
          value={metrics?.cycle_time?.avg_days ? `${metrics.cycle_time.avg_days}d` : '-'}
          subtitle={metrics?.cycle_time?.median_days ? `Mediana: ${metrics.cycle_time.median_days}d` : undefined}
          icon={Timer}
          color="primary"
          loading={isLoading}
        />
        <MetricCard
          title="Em Progresso (WIP)"
          value={metrics?.current_wip.total || 0}
          subtitle={`${metrics?.current_wip.captacao || 0} captação · ${metrics?.current_wip.edicao || 0} edição`}
          icon={Layers}
          loading={isLoading}
        />
        {metrics?.bottleneck ? (
          <MetricCard
            title="Bottleneck"
            value={getPhaseName(metrics.bottleneck.phase)}
            subtitle={`${metrics.bottleneck.current_count} projetos · ~${formatDuration(metrics.bottleneck.avg_wait_hours)} espera`}
            icon={AlertTriangle}
            color="yellow"
            loading={isLoading}
          />
        ) : (
          <MetricCard
            title="Bottleneck"
            value="Nenhum"
            subtitle="Fluxo equilibrado"
            icon={Target}
            color="green"
            loading={isLoading}
          />
        )}
      </div>

      {/* Time by Phase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tempo Médio por Fase
          </CardTitle>
          <CardDescription>
            Quanto tempo os projetos ficam em cada fase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : metrics?.avg_time_by_phase && metrics.avg_time_by_phase.length > 0 ? (
            metrics.avg_time_by_phase.map((phase) => (
              <PhaseBar
                key={phase.phase}
                phase={phase.phase}
                avgHours={phase.avg_hours}
                maxAvgHours={maxAvgHours}
                count={phase.count}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Ainda não há dados suficientes.</p>
              <p className="text-sm">Mova projetos entre fases para gerar métricas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {metrics.throughput.total_completed > 0 && (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>
                    Você entrega em média <strong>{metrics.throughput.avg_per_week}</strong> projetos por semana.
                  </span>
                </li>
              )}
              {metrics.cycle_time?.avg_days && (
                <li className="flex items-start gap-2">
                  <Timer className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    O tempo médio do início à entrega é de <strong>{metrics.cycle_time.avg_days} dias</strong>.
                  </span>
                </li>
              )}
              {metrics.bottleneck && metrics.bottleneck.current_count > 2 && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <span>
                    A fase <strong>{getPhaseName(metrics.bottleneck.phase)}</strong> tem {metrics.bottleneck.current_count} projetos acumulados. 
                    Considere redistribuir recursos.
                  </span>
                </li>
              )}
              {metrics.current_wip.total > 10 && (
                <li className="flex items-start gap-2">
                  <Layers className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <span>
                    Você tem <strong>{metrics.current_wip.total}</strong> projetos em progresso. 
                    Considere limitar o WIP para melhorar o foco.
                  </span>
                </li>
              )}
              {!metrics.throughput.total_completed && !metrics.bottleneck && (
                <li className="text-muted-foreground">
                  Continue usando o Kanban para gerar mais insights sobre sua performance.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
