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
    items,
    olderPendingAmount,
    loading 
  } = useCollaboratorForecast(selectedMonth);
  const [showItems, setShowItems] = useState(false);
  const statusLabel = { pago: 'Pago', a_receber: 'A receber', em_curso: 'Em curso' } as const;
  const statusClass = { pago: 'text-success', a_receber: 'text-warning', em_curso: 'text-muted-foreground' } as const;

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

      {!loading && olderPendingAmount > 0 && (
        <p className="text-xs text-warning">
          Ainda por receber de meses anteriores:{' '}
          <span className={cn('font-semibold', hideValues && 'blur-md select-none')}>{formatCurrency(olderPendingAmount)}</span>
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setShowItems(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>{items.length} trabalho(s) neste mês</span>
            <span>{showItems ? 'Esconder' : 'Ver detalhe'}</span>
          </button>
          {showItems && (
            <ul className="border-t border-border divide-y divide-border">
              {items.map(it => (
                <li key={it.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 truncate">
                    <span className="text-muted-foreground mr-1">{it.projectCode}</span>{it.projectName}
                  </span>
                  <span className={cn('text-xs', statusClass[it.status])}>{statusLabel[it.status]}</span>
                  <span className={cn('tabular-nums font-medium', hideValues && 'blur-md select-none')}>
                    {formatCurrency(it.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
