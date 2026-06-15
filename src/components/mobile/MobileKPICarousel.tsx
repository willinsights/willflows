import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Film,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useHideValues } from '@/hooks/useHideValues';
import type { DashboardMetrics } from '@/hooks/useDashboardMetrics';

interface MobileKPICarouselProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

const CARD_WIDTH = 156;
const HERO_CARD_WIDTH = 196;
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

type BaseKpi = {
  label: string;
  value: number | string;
  icon: typeof Camera;
  iconColor: string;
  bgColor: string;
  href?: string;
  hero?: boolean;
  change?: number | null;
  valueClass?: string;
  isCurrency?: boolean;
  invertColor?: boolean;
};

export function MobileKPICarousel({ metrics, loading }: MobileKPICarouselProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { canViewAllFinancials, canViewOwnFinancials } = useFinancialPermissions();
  const { hideValues } = useHideValues();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(1); // Start on Edição (hero)

  // Base KPI data: Edição is the hero — biggest, primary, badge
  const baseKpiData: BaseKpi[] = [
    {
      label: 'Captação',
      value: metrics.captacao,
      icon: Camera,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/app/captacao',
    },
    {
      label: 'Edição',
      value: metrics.edicao,
      icon: Film,
      iconColor: 'text-info',
      bgColor: 'bg-info/15',
      href: '/app/edicao',
      hero: true,
    },
    {
      label: 'Entregues',
      value: metrics.entregues,
      icon: CheckCircle2,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      href: '/app/finalizados',
      change: metrics.entreguesChange,
    },
  ];

  const financialKpiData: BaseKpi[] = canViewAllFinancials ? [
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
    // Approximate index using avg width; close enough for active dot
    const avgWidth = ((CARD_WIDTH * (kpiData.length - 1)) + HERO_CARD_WIDTH) / kpiData.length + CARD_GAP;
    const newIndex = Math.round(scrollLeft / avgWidth);
    setActiveIndex(Math.max(0, Math.min(newIndex, kpiData.length - 1)));
  }, [kpiData.length]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Auto-scroll to Edição (hero) on mount so the destaque is visible immediately
  useEffect(() => {
    if (!scrollRef.current) return;
    const offset = CARD_WIDTH + CARD_GAP; // skip first card (Captação)
    scrollRef.current.scrollTo({ left: offset - 16, behavior: 'auto' });
  }, []);

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    let left = 0;
    for (let i = 0; i < index; i++) {
      left += (kpiData[i].hero ? HERO_CARD_WIDTH : CARD_WIDTH) + CARD_GAP;
    }
    scrollRef.current.scrollTo({ left, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 pt-1 snap-x snap-mandatory -mx-4 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {kpiData.map((kpi, index) => {
          const width = kpi.hero ? HERO_CARD_WIDTH : CARD_WIDTH;
          const isActive = activeIndex === index;

          const inner = (
            <Card
              className={cn(
                'h-full transition-all duration-200 relative overflow-hidden',
                kpi.hero
                  ? 'bg-gradient-to-br from-info/15 via-card to-card border-info/40 shadow-lg shadow-info/10 ring-1 ring-info/30'
                  : 'bg-card/80 backdrop-blur-sm border-border/60',
                isActive && !kpi.hero && 'ring-2 ring-primary/20'
              )}
              style={{ width }}
            >
              {kpi.hero && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-info/20 border border-info/30">
                  <Sparkles className="h-2.5 w-2.5 text-info" />
                  <span className="text-[9px] font-semibold text-info uppercase tracking-wide">Principal</span>
                </div>
              )}
              <CardContent className={cn('p-4', kpi.hero && 'pt-7')}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-2', kpi.bgColor)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.iconColor)} />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="space-y-0.5">
                    <span className={cn(
                      'font-bold block break-words',
                      kpi.hero ? 'text-3xl' : 'text-xl',
                      kpi.valueClass,
                      kpi.isCurrency && hideValues && 'blur-md select-none'
                    )}>
                      {kpi.value}
                    </span>
                    {kpi.change !== undefined && (
                      <ChangeIndicator
                        change={kpi.change ?? null}
                        invertColor={kpi.invertColor ?? false}
                      />
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <p className={cn(
                    'text-xs text-muted-foreground leading-tight',
                    kpi.hero && 'text-sm font-medium text-foreground'
                  )}>
                    {kpi.label}
                  </p>
                  {kpi.href && (
                    <ArrowUpRight className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      kpi.hero ? 'text-info' : 'text-muted-foreground/60'
                    )} />
                  )}
                </div>
              </CardContent>
            </Card>
          );

          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="snap-start shrink-0"
            >
              {kpi.href ? (
                <Link
                  to={kpi.href}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                  aria-label={`Abrir ${kpi.label}`}
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Interactive Scroll Indicator Dots */}
      <div className="flex justify-center gap-1.5">
        {kpiData.map((kpi, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={cn(
              'h-2 rounded-full transition-all duration-200',
              activeIndex === index
                ? kpi.hero ? 'bg-info w-5' : 'bg-primary w-4'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2'
            )}
            aria-label={`Ir para ${kpi.label}`}
          />
        ))}
      </div>
    </div>
  );
}
