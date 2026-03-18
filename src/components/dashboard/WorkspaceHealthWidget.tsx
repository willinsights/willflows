import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { usePaymentAlerts } from '@/hooks/usePaymentAlerts';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface HealthMetric {
  label: string;
  score: number; // 0-100
  detail: string;
}

export function WorkspaceHealthWidget() {
  const { projects } = useProjects();
  const { criticalCount, warningCount } = usePaymentAlerts();
  const { formatCurrency } = useFormatCurrency();

  const { overallScore, metrics, level } = useMemo(() => {
    const activeProjects = projects.filter(p => !p.is_delivered);
    const deliveredProjects = projects.filter(p => p.is_delivered);

    // 1. Delivery rate (weight: 30%)
    const totalWithDate = projects.filter(p => p.delivery_date || p.is_delivered).length;
    const onTime = deliveredProjects.filter(p => {
      if (!p.delivery_date || !p.delivered_at) return true;
      return new Date(p.delivered_at) <= new Date(p.delivery_date);
    }).length;
    const deliveryScore = totalWithDate > 0 ? (onTime / totalWithDate) * 100 : 100;

    // 2. Margin health (weight: 30%)
    const margins = deliveredProjects.map(p => {
      const revenue = p.agreed_value || 0;
      const cost = (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);
      return revenue > 0 ? ((revenue - cost) / revenue * 100) : 0;
    });
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 50;
    const marginScore = Math.min(100, Math.max(0, avgMargin * 2.5)); // 40% margin = 100

    // 3. Payment health (weight: 25%)
    const paymentPenalty = (criticalCount * 15) + (warningCount * 5);
    const paymentScore = Math.max(0, 100 - paymentPenalty);

    // 4. Pipeline balance (weight: 15%)
    const pipelineScore = activeProjects.length > 0 ? Math.min(100, activeProjects.length * 15) : 30;

    const overall = Math.round(
      deliveryScore * 0.30 +
      marginScore * 0.30 +
      paymentScore * 0.25 +
      pipelineScore * 0.15
    );

    const metricsArr: HealthMetric[] = [
      { label: 'Entregas', score: Math.round(deliveryScore), detail: `${onTime}/${totalWithDate} no prazo` },
      { label: 'Margens', score: Math.round(marginScore), detail: `${avgMargin.toFixed(0)}% média` },
      { label: 'Pagamentos', score: Math.round(paymentScore), detail: criticalCount > 0 ? `${criticalCount} crítico(s)` : 'Em dia' },
      { label: 'Pipeline', score: Math.round(pipelineScore), detail: `${activeProjects.length} ativo(s)` },
    ];

    const lvl = overall >= 80 ? 'excellent' : overall >= 60 ? 'good' : overall >= 40 ? 'warning' : 'critical';

    return { overallScore: overall, metrics: metricsArr, level: lvl };
  }, [projects, criticalCount, warningCount]);

  const levelConfig = {
    excellent: { label: 'Excelente', color: 'text-success', bg: 'bg-success/10', progressColor: 'bg-success' },
    good: { label: 'Bom', color: 'text-primary', bg: 'bg-primary/10', progressColor: 'bg-primary' },
    warning: { label: 'Atenção', color: 'text-yellow-500', bg: 'bg-yellow-500/10', progressColor: 'bg-yellow-500' },
    critical: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10', progressColor: 'bg-destructive' },
  };

  const config = levelConfig[level];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Saúde do Workspace
          </CardTitle>
          <Badge variant="outline" className={cn('text-xs', config.color, config.bg)}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div className={cn('text-4xl font-bold', config.color)}>
            {overallScore}
          </div>
          <div className="flex-1">
            <Progress value={overallScore} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">Pontuação geral de saúde</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className={cn(
                  'text-xs font-medium',
                  m.score >= 70 ? 'text-success' : m.score >= 40 ? 'text-yellow-500' : 'text-destructive'
                )}>
                  {m.score}
                </span>
              </div>
              <Progress value={m.score} className="h-1" />
              <p className="text-[10px] text-muted-foreground">{m.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
