import { motion } from 'framer-motion';
import { Camera, Film, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { cn } from '@/lib/utils';
import type { DashboardMetrics } from '@/hooks/useDashboardMetrics';

interface ProjectCountersProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

export function ProjectCounters({ metrics, loading }: ProjectCountersProps) {
  const counters = [
    {
      label: 'Em Captação',
      value: metrics.captacao,
      change: null, // Snapshot, no month comparison
      icon: Camera,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      cardClass: 'hover:border-primary/30',
      tooltip: 'Projetos na fase de captação que ainda não foram finalizados',
    },
    {
      label: 'Em Edição',
      value: metrics.edicao,
      change: null, // Snapshot, no month comparison
      icon: Film,
      iconColor: 'text-info',
      bgColor: 'bg-info/10',
      cardClass: 'hover:border-info/30',
      tooltip: 'Projetos na fase de edição que ainda não foram finalizados',
    },
    {
      label: 'Entregues (mês)',
      value: metrics.entregues,
      change: metrics.entreguesChange, // Monthly accumulative metric
      icon: CheckCircle2,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      cardClass: 'hover:border-success/30',
      tooltip: 'Projetos finalizados e entregues neste mês',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {counters.map((counter, index) => {
        const cardContent = (
          <Card className={cn('metric-card', counter.cardClass)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={cn('p-1.5 rounded-md', counter.bgColor)}>
                  <counter.icon className={cn('h-4 w-4', counter.iconColor)} />
                </div>
                <div className="flex flex-col">
                  {loading ? (
                    <Skeleton className="h-7 w-8" />
                  ) : (
                    <>
                      <span className="font-bold text-2xl">
                        {counter.value}
                      </span>
                      <ChangeIndicator change={counter.change} />
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {counter.label}
              </p>
            </CardContent>
          </Card>
        );

        return (
          <motion.div
            key={counter.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                {cardContent}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">{counter.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        );
      })}
    </div>
  );
}
