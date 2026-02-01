import { motion } from 'framer-motion';
import {
  Camera,
  Film,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Lock,
  Coins,
  Target,
  Calculator,
  PiggyBank,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useHideValues } from '@/hooks/useHideValues';
import type { DashboardMetrics } from '@/hooks/useDashboardMetrics';

interface KPICardsProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

function ChangeIndicator({ 
  change, 
  invertColor = false 
}: { 
  change: number | null; 
  invertColor?: boolean;
}) {
  if (change === null) return null;
  
  const isPositive = change >= 0;
  // For costs, positive change (increase) is bad, so we invert the color
  const showAsPositive = invertColor ? !isPositive : isPositive;
  
  return (
    <span className={cn(
      "text-[10px] flex items-center gap-0.5 mt-0.5",
      showAsPositive ? "text-success" : "text-destructive"
    )}>
      {isPositive ? (
        <TrendingUp className="h-2.5 w-2.5" />
      ) : (
        <TrendingDown className="h-2.5 w-2.5" />
      )}
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}

export function KPICards({ metrics, loading }: KPICardsProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { 
    canViewAllFinancials, 
    isCollaborator,
    canViewOwnFinancials 
  } = useFinancialPermissions();
  const { hideValues } = useHideValues();

  // Base KPI data (always visible)
  const baseKpiData = [
    {
      label: 'Em Captação',
      value: metrics.captacao,
      icon: Camera,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      cardClass: 'hover:border-primary/30',
      valueClass: '',
      delay: 0.03,
      tooltip: 'Projetos na fase de captação que ainda não foram finalizados',
    },
    {
      label: 'Em Edição',
      value: metrics.edicao,
      icon: Film,
      iconColor: 'text-info',
      bgColor: 'bg-info/10',
      cardClass: 'hover:border-primary/30',
      valueClass: '',
      delay: 0.06,
      tooltip: 'Projetos na fase de edição que ainda não foram finalizados',
    },
    {
      label: 'Entregues (mês)',
      value: metrics.entregues,
      icon: CheckCircle2,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      cardClass: 'hover:border-success/30',
      valueClass: '',
      change: metrics.entreguesChange,
      delay: 0.09,
      tooltip: 'Projetos finalizados e entregues neste mês',
    },
  ];

  // Financial KPI data (only for admins)
  const financialKpiData = canViewAllFinancials ? [
    {
      label: 'Receita (mês)',
      value: formatCurrency(metrics.receita),
      icon: TrendingUp,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      cardClass: 'hover:border-success/30',
      valueClass: 'text-success text-lg',
      isCurrency: true,
      change: metrics.receitaChange,
      delay: 0.12,
    },
    {
      label: 'Custos (mês)',
      value: formatCurrency(metrics.custos),
      icon: TrendingDown,
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/10',
      cardClass: 'hover:border-destructive/30',
      valueClass: 'text-destructive text-lg',
      isCurrency: true,
      change: metrics.custosChange,
      invertColor: true,
      delay: 0.15,
    },
    {
      label: 'Lucro (mês)',
      value: formatCurrency(metrics.lucro),
      icon: Wallet,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/15',
      cardClass: 'border-primary/20 hover:border-primary/40 bg-card',
      valueClass: cn('text-lg', (metrics.lucro ?? 0) >= 0 ? 'text-primary' : 'text-destructive'),
      isCurrency: true,
      change: metrics.lucroChange,
      delay: 0.18,
    },
  ] : canViewOwnFinancials ? [
    // For users with 'dashboard.view_own_earnings' permission: show personal earnings
    {
      label: 'Meus Ganhos (mês)',
      value: formatCurrency(metrics.meusGanhos ?? 0),
      icon: Coins,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      cardClass: 'hover:border-success/30',
      valueClass: 'text-success text-lg',
      isCurrency: true,
      delay: 0.12,
      tooltip: 'Valor dos seus pagamentos este mês',
    },
  ] : [
    // Placeholder cards for non-admins (editor, captacao)
    {
      label: 'Receita (mês)',
      value: '---',
      icon: Lock,
      iconColor: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      cardClass: 'opacity-60',
      valueClass: 'text-muted-foreground text-lg',
      isCurrency: true,
      delay: 0.12,
      isRestricted: true,
    },
    {
      label: 'Custos (mês)',
      value: '---',
      icon: Lock,
      iconColor: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      cardClass: 'opacity-60',
      valueClass: 'text-muted-foreground text-lg',
      isCurrency: true,
      delay: 0.15,
      isRestricted: true,
    },
    {
      label: 'Lucro (mês)',
      value: '---',
      icon: Lock,
      iconColor: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      cardClass: 'opacity-60',
      valueClass: 'text-muted-foreground text-lg',
      isCurrency: true,
      delay: 0.18,
      isRestricted: true,
    },
  ];

  // Forecast KPIs (only for admins with financial access)
  const forecastKpiData = canViewAllFinancials ? [
    {
      label: 'Prev. Receita',
      value: formatCurrency(metrics.previsaoReceita),
      icon: Target,
      iconColor: 'text-info',
      bgColor: 'bg-info/10',
      cardClass: 'hover:border-info/30',
      valueClass: 'text-info text-lg',
      isCurrency: true,
      delay: 0.21,
      tooltip: `Receita prevista de ${metrics.projetosAtivos} projeto(s) activo(s)`,
    },
    {
      label: 'Prev. Custos',
      value: formatCurrency(metrics.previsaoCustos),
      icon: Calculator,
      iconColor: 'text-warning',
      bgColor: 'bg-warning/10',
      cardClass: 'hover:border-warning/30',
      valueClass: 'text-warning text-lg',
      isCurrency: true,
      delay: 0.24,
      tooltip: 'Custos previstos para projetos activos + pagamentos de equipa pendentes',
    },
    {
      label: 'Prev. Lucro',
      value: formatCurrency(metrics.previsaoLucro),
      icon: PiggyBank,
      iconColor: metrics.previsaoLucro >= 0 ? 'text-success' : 'text-destructive',
      bgColor: metrics.previsaoLucro >= 0 ? 'bg-success/10' : 'bg-destructive/10',
      cardClass: metrics.previsaoLucro >= 0 ? 'hover:border-success/30' : 'hover:border-destructive/30',
      valueClass: cn('text-lg', metrics.previsaoLucro >= 0 ? 'text-success' : 'text-destructive'),
      isCurrency: true,
      delay: 0.27,
      tooltip: `Margem prevista: ${metrics.previsaoMargemPercent}%`,
    },
  ] : [];

  const kpiData = [...baseKpiData, ...financialKpiData];

  return (
    <div className="space-y-4">
      {/* Main KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {kpiData.map((kpi) => {
          const cardContent = (
            <Card className={cn('metric-card', kpi.cardClass)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded-md', kpi.bgColor)}>
                    <kpi.icon className={cn('h-4 w-4', kpi.iconColor)} />
                  </div>
                  <div className="flex flex-col">
                    {loading ? (
                      <Skeleton className={cn('h-7', 'isCurrency' in kpi && kpi.isCurrency ? 'w-16' : 'w-8')} />
                    ) : (
                      <>
                        <span className={cn(
                          'font-bold', 
                          'isCurrency' in kpi && kpi.isCurrency ? kpi.valueClass : 'text-2xl',
                          'isCurrency' in kpi && kpi.isCurrency && hideValues && 'blur-md select-none'
                        )}>
                          {kpi.value}
                        </span>
                        {'change' in kpi && !('isRestricted' in kpi) && (
                          <ChangeIndicator change={kpi.change ?? null} invertColor={'invertColor' in kpi ? kpi.invertColor : false} />
                        )}
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {kpi.label}
                  {'isRestricted' in kpi && (
                    <span className="ml-1 text-[10px]">(restrito)</span>
                  )}
                </p>
              </CardContent>
            </Card>
          );

          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: kpi.delay }}
            >
              {'tooltip' in kpi && kpi.tooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {cardContent}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="text-xs">{kpi.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                cardContent
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Forecast KPIs (separate row for admins) */}
      {forecastKpiData.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Target className="h-3 w-3" />
            Previsão do Mês (projetos activos)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {forecastKpiData.map((kpi) => {
              const cardContent = (
                <Card className={cn('metric-card', kpi.cardClass)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-1.5 rounded-md', kpi.bgColor)}>
                        <kpi.icon className={cn('h-4 w-4', kpi.iconColor)} />
                      </div>
                      <div className="flex flex-col">
                        {loading ? (
                          <Skeleton className="h-7 w-16" />
                        ) : (
                          <span className={cn(
                            'font-bold',
                            kpi.valueClass,
                            hideValues && 'blur-md select-none'
                          )}>
                            {kpi.value}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {kpi.label}
                    </p>
                  </CardContent>
                </Card>
              );

              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: kpi.delay }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {cardContent}
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <p className="text-xs">{kpi.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
