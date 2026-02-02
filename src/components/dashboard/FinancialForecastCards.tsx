import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Calculator, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMonthlyForecast } from '@/hooks/useMonthlyForecast';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useHideValues } from '@/hooks/useHideValues';
import { MonthPicker } from './MonthPicker';

export function FinancialForecastCards() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { formatCurrency } = useCurrentWorkspace();
  const { hideValues } = useHideValues();
  const { totalRevenue, totalCost, totalProfit, projectCount, loading } = useMonthlyForecast(selectedMonth);

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const forecastCards = [
    {
      label: 'Receita Prevista',
      value: formatCurrency(totalRevenue),
      icon: Target,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      cardClass: 'hover:border-success/30',
      valueClass: 'text-success',
      tooltip: `Receita prevista de ${projectCount} projeto(s)`,
    },
    {
      label: 'Custo Previsto',
      value: formatCurrency(totalCost),
      icon: Calculator,
      iconColor: 'text-warning',
      bgColor: 'bg-warning/10',
      cardClass: 'hover:border-warning/30',
      valueClass: 'text-warning',
      tooltip: 'Custos previstos (projetos + pagamentos de equipa pendentes)',
    },
    {
      label: 'Lucro Previsto',
      value: formatCurrency(totalProfit),
      icon: PiggyBank,
      iconColor: totalProfit >= 0 ? 'text-primary' : 'text-destructive',
      bgColor: totalProfit >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
      cardClass: totalProfit >= 0 ? 'hover:border-primary/30' : 'hover:border-destructive/30',
      valueClass: totalProfit >= 0 ? 'text-primary' : 'text-destructive',
      tooltip: `Margem: ${totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0}%`,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header with title and month picker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Previsão Financeira
          </h3>
        </div>
        <MonthPicker
          selectedMonth={selectedMonth}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onToday={goToCurrentMonth}
        />
      </div>

      {/* Forecast cards */}
      <div className="grid grid-cols-3 gap-2">
        {forecastCards.map((card, index) => {
          const cardContent = (
            <Card className={cn('metric-card', card.cardClass)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded-md', card.bgColor)}>
                    <card.icon className={cn('h-4 w-4', card.iconColor)} />
                  </div>
                  <div className="flex flex-col">
                    {loading ? (
                      <Skeleton className="h-7 w-20" />
                    ) : (
                      <span className={cn(
                        'font-bold text-lg',
                        card.valueClass,
                        hideValues && 'blur-md select-none'
                      )}>
                        {card.value}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {card.label}
                </p>
              </CardContent>
            </Card>
          );

          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.03 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  {cardContent}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">{card.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
