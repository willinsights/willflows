import { useState } from 'react';
import { Wallet, Clock, CheckCircle2, Coins, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { MobileCollapsibleCard } from './MobileCollapsibleCard';
import { useCollaboratorForecast } from '@/hooks/useCollaboratorForecast';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useHideValues } from '@/hooks/useHideValues';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isSameMonth } from 'date-fns';
import { pt } from 'date-fns/locale';

export function MobileCollaboratorForecast() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { formatCurrency } = useCurrentWorkspace();
  const { hideValues } = useHideValues();
  const { 
    pendingAmount, 
    paidAmount, 
    totalAmount, 
    projectCount, 
    loading 
  } = useCollaboratorForecast(selectedMonth);

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  // Preview component shown when collapsed
  const PreviewContent = () => (
    <div className="flex items-center justify-between gap-4">
      {loading ? (
        <>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-muted-foreground">A Receber</p>
              <p className={cn("text-sm font-semibold text-warning", hideValues && "blur-md select-none")}>
                {formatCurrency(pendingAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className={cn("text-sm font-semibold text-success", hideValues && "blur-md select-none")}>
                {formatCurrency(paidAmount)}
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {projectCount} projeto(s)
          </div>
        </>
      )}
    </div>
  );

  return (
    <MobileCollapsibleCard
      title="Meus Ganhos Previstos"
      icon={Wallet}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      defaultExpanded={true}
      preview={<PreviewContent />}
    >
      {/* Month Picker */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          onClick={goToPreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium min-w-[90px] text-center capitalize">
          {format(selectedMonth, 'MMM yyyy', { locale: pt })}
        </span>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {!isCurrentMonth && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs ml-1" 
            onClick={goToCurrentMonth}
          >
            <CalendarDays className="h-3 w-3 mr-1" />
            Hoje
          </Button>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {/* A Receber */}
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 text-warning mx-auto mb-1" />
            <p className={cn(
              "text-sm font-bold text-warning",
              hideValues && "blur-md select-none"
            )}>
              {formatCurrency(pendingAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">A Receber</p>
          </div>

          {/* Já Recebido */}
          <div className="bg-success/5 border border-success/20 rounded-lg p-3 text-center">
            <CheckCircle2 className="h-4 w-4 text-success mx-auto mb-1" />
            <p className={cn(
              "text-sm font-bold text-success",
              hideValues && "blur-md select-none"
            )}>
              {formatCurrency(paidAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Recebido</p>
          </div>

          {/* Total */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
            <Coins className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className={cn(
              "text-sm font-bold text-primary",
              hideValues && "blur-md select-none"
            )}>
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
          </div>
        </div>
      )}
    </MobileCollapsibleCard>
  );
}
