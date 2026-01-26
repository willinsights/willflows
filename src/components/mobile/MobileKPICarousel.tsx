import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Film,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Lock,
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

const CARD_WIDTH = 140;
const CARD_GAP = 12;

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
  const [activeIndex, setActiveIndex] = useState(0);

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

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft } = scrollRef.current;
    const cardFullWidth = CARD_WIDTH + CARD_GAP;
    const newIndex = Math.round(scrollLeft / cardFullWidth);
    setActiveIndex(Math.max(0, Math.min(newIndex, kpiData.length - 1)));
  }, [kpiData.length]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const cardFullWidth = CARD_WIDTH + CARD_GAP;
    scrollRef.current.scrollTo({
      left: index * cardFullWidth,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-3">
      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory -mx-4 px-4"
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
            <Card 
              className={cn(
                'bg-card/80 backdrop-blur-sm border-border/60 transition-all duration-200',
                activeIndex === index && 'ring-2 ring-primary/20'
              )}
              style={{ width: CARD_WIDTH }}
            >
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

      {/* Interactive Scroll Indicator Dots */}
      <div className="flex justify-center gap-1.5">
        {kpiData.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-200",
              activeIndex === index 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to KPI ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}