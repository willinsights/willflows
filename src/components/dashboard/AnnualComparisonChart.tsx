import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';

export interface AnnualComparisonData {
  month: string;
  currentYear: number;
  previousYear: number;
}

interface AnnualComparisonChartProps {
  data: AnnualComparisonData[];
  loading: boolean;
  currentYearLabel: string;
  previousYearLabel: string;
}

const chartConfig = {
  currentYear: {
    label: 'Este Ano',
    color: 'hsl(var(--primary))',
  },
  previousYear: {
    label: 'Ano Anterior',
    color: 'hsl(var(--muted-foreground))',
  },
};

export function AnnualComparisonChart({ 
  data, 
  loading, 
  currentYearLabel, 
  previousYearLabel 
}: AnnualComparisonChartProps) {
  const { formatCurrency } = useCurrentWorkspace();

  // Calculate totals for summary
  const currentYearTotal = data.reduce((sum, d) => sum + d.currentYear, 0);
  const previousYearTotal = data.reduce((sum, d) => sum + d.previousYear, 0);
  const growthPercent = previousYearTotal > 0 
    ? Math.round(((currentYearTotal - previousYearTotal) / previousYearTotal) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Comparativo Anual
            </CardTitle>
            {!loading && previousYearTotal > 0 && (
              <span className={`text-xs font-medium ${growthPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {growthPercent >= 0 ? '+' : ''}{growthPercent}% vs {previousYearLabel}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-[180px] w-full" />
              <div className="flex justify-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ) : (
            <>
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span>
                            {name === 'currentYear' ? currentYearLabel : previousYearLabel}: {formatCurrency(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar 
                    dataKey="previousYear" 
                    fill="hsl(var(--muted-foreground))" 
                    radius={[2, 2, 0, 0]}
                    opacity={0.4}
                  />
                  <Bar 
                    dataKey="currentYear" 
                    fill="hsl(var(--primary))" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
              
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-muted-foreground">{currentYearLabel}</span>
                  <span className="font-medium">{formatCurrency(currentYearTotal)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-muted-foreground/40" />
                  <span className="text-muted-foreground">{previousYearLabel}</span>
                  <span className="font-medium">{formatCurrency(previousYearTotal)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
