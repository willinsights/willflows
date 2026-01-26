import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Film,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Lock,
  ChevronLeft,
  ChevronRight,
  Coins,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import type { DashboardMetrics } from '@/hooks/useDashboardMetrics';

interface MobileKPICarouselProps {
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
  const showAsPositive = invertColor ? !isPositive : isPositive;
  
  return (
    <span className={cn(
      "text-[11px] flex items-center gap-0.5",
      showAsPositive ? "text-success" : "text-destructive"
    )}>
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}

export function MobileKPICarousel({ metrics, loading }: MobileKPICarouselProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { canViewAllFinancials, canViewOwnFinancials } = useFinancialPermissions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Base KPI data (always visible)
  const baseKpiData = [
    {
      label: 'Captação',
      value: metrics.captacao,
      icon: Camera,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Edição',
      value: metrics.edicao,
      icon: Film,
      iconColor: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'Entregues',
      value: metrics.entregues,
      icon: CheckCircle2,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      change: metrics.entreguesChange,
    },
  ];

  // Financial KPIs
  const financialKpiData = canViewAllFinancials ? [
    {
      label: 'Receita',
      value: formatCurrency(metrics.receita),
      icon: TrendingUp,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      valueClass: 'text-success',
      isCurrency: true,
      change: metrics.receitaChange,
    },
    {
      label: 'Custos',
      value: formatCurrency(metrics.custos),
      icon: TrendingDown,
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/10',
      valueClass: 'text-destructive',
      isCurrency: true,
      change: metrics.custosChange,
      invertColor: true,
    },
    {
      label: 'Lucro',
      value: formatCurrency(metrics.lucro),
      icon: Wallet,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/15',
      valueClass: cn((metrics.lucro ?? 0) >= 0 ? 'text-primary' : 'text-destructive'),
      isCurrency: true,
      change: metrics.lucroChange,
    },
  ] : canViewOwnFinancials ? [
    {
      label: 'Meus Ganhos',
      value: formatCurrency(metrics.meusGanhos ?? 0),
      icon: Coins,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      valueClass: 'text-success',
      isCurrency: true,
    },
  ] : [];

  const kpiData = [...baseKpiData, ...financialKpiData];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 140;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {kpiData.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="snap-start shrink-0"
          >
            <Card className="w-[140px] bg-card/80 backdrop-blur-sm border-border/60">
              <CardContent className="p-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-2', kpi.bgColor)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.iconColor)} />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="space-y-0.5">
                    <span className={cn('text-xl font-bold block', 'valueClass' in kpi ? kpi.valueClass : '')}>
                      {kpi.value}
                    </span>
                    {'change' in kpi && (
                      <ChangeIndicator 
                        change={(kpi as any).change ?? null} 
                        invertColor={'invertColor' in kpi ? Boolean((kpi as any).invertColor) : false} 
                      />
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Scroll Indicator Dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {kpiData.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              index === 0 ? "bg-primary" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}
