import { motion } from 'framer-motion';
import {
  Camera,
  Film,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import type { DashboardMetrics } from '@/hooks/useDashboardMetrics';

interface KPICardsProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

export function KPICards({ metrics, loading }: KPICardsProps) {
  const { formatCurrency } = useCurrentWorkspace();

  const kpiData = [
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
      delay: 0.09,
    },
    {
      label: 'Receita (mês)',
      value: formatCurrency(metrics.receita),
      icon: TrendingUp,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      cardClass: 'hover:border-success/30',
      valueClass: 'text-success text-lg',
      isCurrency: true,
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
      delay: 0.15,
    },
    {
      label: 'Lucro (mês)',
      value: formatCurrency(metrics.lucro),
      icon: Wallet,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/15',
      cardClass: 'border-primary/20 hover:border-primary/40 bg-primary/5',
      valueClass: cn('text-lg', metrics.lucro >= 0 ? 'text-primary' : 'text-destructive'),
      isCurrency: true,
      delay: 0.18,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {kpiData.map((kpi, index) => (
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
                {loading ? (
                  <Skeleton className={cn('h-7', kpi.isCurrency ? 'w-16' : 'w-8')} />
                ) : (
                  <span className={cn('font-bold', kpi.isCurrency ? kpi.valueClass : 'text-2xl')}>
                    {kpi.value}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{kpi.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
