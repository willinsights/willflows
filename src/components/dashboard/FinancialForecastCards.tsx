import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Calculator, PiggyBank, ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { cn } from '@/lib/utils';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useHideValues } from '@/hooks/useHideValues';
import { MonthPicker } from './MonthPicker';
import type { FinancialViewMode, MonthlyMetrics } from '@/lib/finance/types';

interface FinancialForecastCardsProps {
  viewMode: FinancialViewMode;
  metrics: MonthlyMetrics;
  revenueChange: number | null;
  costChange: number | null;
  profitChange: number | null;
  loading: boolean;
  selectedMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  /** Hide the internal month picker/title bar (when parent renders its own control bar). */
  hideMonthPicker?: boolean;
}

export function FinancialForecastCards({
  viewMode,
  metrics,
  revenueChange,
  costChange,
  profitChange,
  loading,
  selectedMonth,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  hideMonthPicker = false,
}: FinancialForecastCardsProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { hideValues } = useHideValues();

  const getCards = () => {
    switch (viewMode) {
      case 'REALIZADO':
        return [
          {
            label: 'Receita Realizada',
            value: formatCurrency(metrics.revenue),
            change: revenueChange,
            invertColor: false,
            icon: Target,
            iconColor: 'text-success',
            bgColor: 'bg-success/10',
            cardClass: 'hover:border-success/30',
            valueClass: 'text-success',
            tooltip: `${metrics.projectCount} projeto(s) entregue(s) no mês`,
            subtitle: null,
          },
          {
            label: 'Custo Realizado',
            value: formatCurrency(metrics.cost),
            change: costChange,
            invertColor: true,
            icon: Calculator,
            iconColor: 'text-warning',
            bgColor: 'bg-warning/10',
            cardClass: 'hover:border-warning/30',
            valueClass: 'text-warning',
            tooltip: 'Custos dos projetos entregues no mês',
            subtitle: null,
          },
          {
            label: 'Lucro Realizado',
            value: formatCurrency(metrics.profit),
            change: profitChange,
            invertColor: false,
            icon: PiggyBank,
            iconColor: metrics.profit >= 0 ? 'text-primary' : 'text-destructive',
            bgColor: metrics.profit >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
            cardClass: metrics.profit >= 0 ? 'hover:border-primary/30' : 'hover:border-destructive/30',
            valueClass: metrics.profit >= 0 ? 'text-primary' : 'text-destructive',
            tooltip: `Margem: ${metrics.revenue > 0 ? Math.round((metrics.profit / metrics.revenue) * 100) : 0}%`,
            subtitle: null,
          },
        ];
      case 'PREVISAO': {
        const bd = metrics.breakdown;
        const rolloverText = bd && bd.rolloverCount > 0
          ? `Inclui ${bd.rolloverCount} projeto(s) atrasado(s)`
          : null;
        return [
          {
            label: 'Receita Prevista',
            value: formatCurrency(metrics.revenue),
            change: revenueChange,
            invertColor: false,
            icon: Target,
            iconColor: 'text-success',
            bgColor: 'bg-success/10',
            cardClass: 'hover:border-success/30',
            valueClass: 'text-success',
            tooltip: `${metrics.projectCount} projeto(s) previstos`,
            subtitle: bd ? `Planeado: ${formatCurrency(bd.plannedRevenue)} · Rollover: ${formatCurrency(bd.rolloverRevenue)}` : null,
          },
          {
            label: 'Custo Previsto',
            value: formatCurrency(metrics.cost),
            change: costChange,
            invertColor: true,
            icon: Calculator,
            iconColor: 'text-warning',
            bgColor: 'bg-warning/10',
            cardClass: 'hover:border-warning/30',
            valueClass: 'text-warning',
            tooltip: 'Custos previstos (projetos planeados + rollover)',
            subtitle: bd ? `Planeado: ${formatCurrency(bd.plannedCost)} · Rollover: ${formatCurrency(bd.rolloverCost)}` : null,
          },
          {
            label: 'Lucro Previsto',
            value: formatCurrency(metrics.profit),
            change: profitChange,
            invertColor: false,
            icon: PiggyBank,
            iconColor: metrics.profit >= 0 ? 'text-primary' : 'text-destructive',
            bgColor: metrics.profit >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
            cardClass: metrics.profit >= 0 ? 'hover:border-primary/30' : 'hover:border-destructive/30',
            valueClass: metrics.profit >= 0 ? 'text-primary' : 'text-destructive',
            tooltip: `Margem: ${metrics.revenue > 0 ? Math.round((metrics.profit / metrics.revenue) * 100) : 0}%`,
            subtitle: rolloverText,
          },
        ];
      }
      case 'CAIXA': {
        const cf = metrics.cashflow;
        return [
          {
            label: 'Entradas Recebidas',
            value: formatCurrency(metrics.revenue),
            change: revenueChange,
            invertColor: false,
            icon: ArrowDownCircle,
            iconColor: 'text-success',
            bgColor: 'bg-success/10',
            cardClass: 'hover:border-success/30',
            valueClass: 'text-success',
            tooltip: `${metrics.projectCount} pagamento(s) recebido(s) de clientes`,
            subtitle: null,
          },
          {
            label: 'Saídas Pagas',
            value: formatCurrency(metrics.cost),
            change: costChange,
            invertColor: true,
            icon: ArrowUpCircle,
            iconColor: 'text-destructive',
            bgColor: 'bg-destructive/10',
            cardClass: 'hover:border-destructive/30',
            valueClass: 'text-destructive',
            tooltip: cf
              ? `Equipa: ${formatCurrency(cf.teamExpenses)} · Extras: ${formatCurrency(cf.extrasExpenses)}`
              : 'Saídas pagas no mês',
            subtitle: null,
          },
          {
            label: 'Saldo do Mês',
            value: formatCurrency(metrics.profit),
            change: profitChange,
            invertColor: false,
            icon: Scale,
            iconColor: metrics.profit >= 0 ? 'text-primary' : 'text-destructive',
            bgColor: metrics.profit >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
            cardClass: metrics.profit >= 0 ? 'hover:border-primary/30' : 'hover:border-destructive/30',
            valueClass: metrics.profit >= 0 ? 'text-primary' : 'text-destructive',
            tooltip: 'Entradas - Saídas no mês',
            subtitle: null,
          },
        ];
      }
    }
  };

  const forecastCards = getCards();
  const modeLabels: Record<FinancialViewMode, string> = {
    REALIZADO: 'Financeiro Realizado',
    PREVISAO: 'Previsão Financeira',
    CAIXA: 'Fluxo de Caixa',
  };

  return (
    <div className="space-y-3">
      {!hideMonthPicker && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              {modeLabels[viewMode]}
            </h3>
          </div>
          <MonthPicker
            selectedMonth={selectedMonth}
            onPrevious={onPreviousMonth}
            onNext={onNextMonth}
            onToday={onCurrentMonth}
          />
        </div>
      )}

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
                {card.subtitle && !loading && !hideValues && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">
                    {card.subtitle}
                  </p>
                )}
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
