import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Clock, CheckCircle2, Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { cn } from '@/lib/utils';
import { useCollaboratorForecast } from '@/hooks/useCollaboratorForecast';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useHideValues } from '@/hooks/useHideValues';
import { MonthPicker } from './MonthPicker';

export function CollaboratorForecastCards() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { formatCurrency } = useCurrentWorkspace();
  const { hideValues } = useHideValues();
  const { 
    pendingAmount, 
    paidAmount, 
    totalAmount, 
    projectCount, 
    pendingChange,
    paidChange,
    totalChange,
    loading 
  } = useCollaboratorForecast(selectedMonth);

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
      label: 'A Receber',
      value: formatCurrency(pendingAmount),
      change: pendingChange,
      invertColor: false,
      icon: Clock,
      iconColor: 'text-warning',
      bgColor: 'bg-warning/10',
      cardClass: 'hover:border-warning/30',
      valueClass: 'text-warning',
      tooltip: `Pagamentos pendentes de ${projectCount} projeto(s)`,
    },
    {
      label: 'Já Recebido',
      value: formatCurrency(paidAmount),
      change: paidChange,
      invertColor: false,
      icon: CheckCircle2,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      cardClass: 'hover:border-success/30',
      valueClass: 'text-success',
      tooltip: 'Pagamentos já confirmados neste mês',
    },
    {
      label: 'Total Previsto',
      value: formatCurrency(totalAmount),
      change: totalChange,
      invertColor: false,
      icon: Coins,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      cardClass: 'hover:border-primary/30',
      valueClass: 'text-primary',
      tooltip: 'Total de ganhos previstos (pendentes + pagos)',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header with title and month picker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Meus Ganhos Previstos
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
                      <>
                        <span className={cn(
                          'font-bold text-lg',
                          card.valueClass,
                          hideValues && 'blur-md select-none'
                        )}>
                          {card.value}
                        </span>
                        {!hideValues && (
                          <ChangeIndicator 
                            change={card.change} 
                            invertColor={card.invertColor} 
                          />
                        )}
                      </>
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
