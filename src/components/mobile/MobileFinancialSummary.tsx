import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { MobileCollapsibleCard } from './MobileCollapsibleCard';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useHideValues } from '@/hooks/useHideValues';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MonthlyData, AnnualComparisonData } from '@/hooks/useDashboardMetrics';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MobileFinancialSummaryProps {
  monthlyData: MonthlyData[];
  annualComparison: AnnualComparisonData[];
  loading: boolean;
  currentYearLabel?: string;
  previousYearLabel?: string;
}

export function MobileFinancialSummary({
  monthlyData,
  annualComparison,
  loading,
  currentYearLabel = new Date().getFullYear().toString(),
  previousYearLabel = (new Date().getFullYear() - 1).toString(),
}: MobileFinancialSummaryProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { hideValues } = useHideValues();

  // Get current month data for preview
  const currentMonthData = monthlyData[monthlyData.length - 1];
  const previousMonthData = monthlyData[monthlyData.length - 2];
  
  const revenueChange = previousMonthData && previousMonthData.receita > 0
    ? Math.round(((currentMonthData?.receita || 0) - previousMonthData.receita) / previousMonthData.receita * 100)
    : null;

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
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className={cn("text-sm font-semibold text-success", hideValues && "blur-md select-none")}>
                {formatCurrency(currentMonthData?.receita || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className={cn("text-sm font-semibold text-primary", hideValues && "blur-md select-none")}>
                {formatCurrency(currentMonthData?.lucro || 0)}
              </p>
            </div>
          </div>
          {revenueChange !== null && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              revenueChange >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {revenueChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {revenueChange >= 0 ? '+' : ''}{revenueChange}%
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <MobileCollapsibleCard
      title="Evolução Financeira"
      icon={BarChart3}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      defaultExpanded={false}
      preview={<PreviewContent />}
    >
      {loading ? (
        <Skeleton className="h-[150px] w-full rounded-lg" />
      ) : (
        <div className="space-y-4">
          {/* Simplified chart for mobile */}
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="mobileColorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="mobileColorLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={35}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Area
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#mobileColorReceita)"
              />
              <Area
                type="monotone"
                dataKey="lucro"
                name="Lucro"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#mobileColorLucro)"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Simple legend */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-muted-foreground">Receita</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-muted-foreground">Lucro</span>
            </div>
          </div>
        </div>
      )}
    </MobileCollapsibleCard>
  );
}
