import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Film, CheckCircle2, Sparkles, ArrowUpRight } from 'lucide-react';
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
      change: null,
      icon: Camera,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/app/captacao',
      tooltip: 'Projetos na fase de captação que ainda não foram finalizados',
    },
    {
      label: 'Em Edição',
      value: metrics.edicao,
      change: null,
      icon: Film,
      iconColor: 'text-info',
      bgColor: 'bg-info/15',
      href: '/app/edicao',
      hero: true,
      tooltip: 'Página principal — projetos na fase de edição',
    },
    {
      label: 'Entregues (mês)',
      value: metrics.entregues,
      change: metrics.entreguesChange,
      icon: CheckCircle2,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      href: '/app/finalizados',
      tooltip: 'Projetos finalizados e entregues neste mês',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 items-stretch">
      {counters.map((counter, index) => {
        const cardContent = (
          <Card
            className={cn(
              'metric-card group relative overflow-hidden h-full transition-all duration-200',
              counter.hero
                ? 'bg-gradient-to-br from-info/15 via-card to-card border-info/40 shadow-lg shadow-info/10 ring-1 ring-info/30 hover:ring-info/50 hover:shadow-info/20 md:scale-[1.02]'
                : 'hover:border-primary/30'
            )}
          >
            {counter.hero && (
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/20 border border-info/30">
                <Sparkles className="h-3 w-3 text-info" />
                <span className="text-[10px] font-semibold text-info uppercase tracking-wider">Principal</span>
              </div>
            )}
            <CardContent className={cn('p-3', counter.hero && 'p-4 pr-24')}>
              <div className="flex items-center gap-2">
                <div className={cn('rounded-md flex items-center justify-center', counter.bgColor, counter.hero ? 'p-2' : 'p-1.5')}>
                  <counter.icon className={cn(counter.iconColor, counter.hero ? 'h-5 w-5' : 'h-4 w-4')} />
                </div>
                <div className="flex flex-col min-w-0">
                  {loading ? (
                    <Skeleton className={cn(counter.hero ? 'h-9 w-12' : 'h-7 w-8')} />
                  ) : (
                    <>
                      <span className={cn('font-bold leading-none tabular-nums', counter.hero ? 'text-3xl md:text-4xl' : 'text-3xl')}>
                        {counter.value}
                      </span>
                      <ChangeIndicator change={counter.change} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 gap-2">
                <p className={cn(
                  'text-xs text-muted-foreground truncate',
                  counter.hero && 'text-sm font-medium text-foreground'
                )}>
                  {counter.label}
                </p>
                {counter.href && (
                  <ArrowUpRight className={cn(
                    'h-3.5 w-3.5 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all',
                    counter.hero ? 'text-info opacity-70' : 'text-muted-foreground'
                  )} />
                )}
              </div>
            </CardContent>
          </Card>
        );

        const wrappedCard = counter.href ? (
          <Link
            to={counter.href}
            className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
            aria-label={`Abrir ${counter.label}`}
          >
            {cardContent}
          </Link>
        ) : cardContent;

        return (
          <motion.div
            key={counter.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="h-full"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                {wrappedCard}
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
