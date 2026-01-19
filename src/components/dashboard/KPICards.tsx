import { motion } from 'framer-motion';
import {
  Camera,
  Film,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Lock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
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
  const { canViewAllFinancials } = useFinancialPermissions();

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
  ] : [
    // Placeholder cards for non-admins
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

  const kpiData = [...baseKpiData, ...financialKpiData];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {kpiData.map((kpi) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: kpi.delay }}
        >
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
                      <span className={cn('font-bold', 'isCurrency' in kpi && kpi.isCurrency ? kpi.valueClass : 'text-2xl')}>
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
        </motion.div>
      ))}
    </div>
  );
}
