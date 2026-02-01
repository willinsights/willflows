import { motion } from 'framer-motion';
import { BarChart3, Lock, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useHideValues } from '@/hooks/useHideValues';
import { cn } from '@/lib/utils';
import type { MonthlyData, AnnualComparisonData } from '@/hooks/useDashboardMetrics';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface FinancialChartProps {
  monthlyData: MonthlyData[];
  annualComparison: AnnualComparisonData[];
  loading: boolean;
  currentYearLabel?: string;
  previousYearLabel?: string;
}

export function FinancialChart({ 
  monthlyData, 
  annualComparison,
  loading,
  currentYearLabel = new Date().getFullYear().toString(),
  previousYearLabel = (new Date().getFullYear() - 1).toString(),
}: FinancialChartProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { canViewAllFinancials } = useFinancialPermissions();
  const { hideValues } = useHideValues();

  // Se não for admin, não mostra o gráfico
  if (!canViewAllFinancials) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card opacity-60">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/50">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              Evolução Financeira
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[200px] flex flex-col items-center justify-center text-center">
              <Lock className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Apenas administradores têm acesso a dados financeiros
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Calculate annual totals for legend
  const currentYearTotal = annualComparison.reduce((sum, d) => sum + d.currentYear, 0);
  const previousYearTotal = annualComparison.reduce((sum, d) => sum + d.previousYear, 0);
  const growthPercentage = previousYearTotal > 0 
    ? ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="glass-card">
        <Tabs defaultValue="6months" className="w-full">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              Evolução Financeira
            </CardTitle>
            <TabsList className="h-7">
              <TabsTrigger value="6months" className="text-xs px-2 h-6">
                <TrendingUp className="h-3 w-3 mr-1" />
                6 Meses
              </TabsTrigger>
              <TabsTrigger value="annual" className="text-xs px-2 h-6">
                <Calendar className="h-3 w-3 mr-1" />
                Anual
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : (
              <>
                {/* 6 Months Chart */}
                <TabsContent value="6months" className="mt-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        {/* Forecast gradients - lighter opacity */}
                        <linearGradient id="colorReceitaPrevisao" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLucroPrevisao" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => [
                          formatCurrency(value), 
                          name.includes('Prev.') ? `${name} (previsto)` : name
                        ]}
                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      {/* Realized data - solid lines */}
                      <Area
                        type="monotone"
                        dataKey="receita"
                        name="Receita"
                        stroke="hsl(var(--success))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorReceita)"
                      />
                      <Area
                        type="monotone"
                        dataKey="custos"
                        name="Custos"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCustos)"
                      />
                      <Area
                        type="monotone"
                        dataKey="lucro"
                        name="Lucro"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorLucro)"
                      />
                      {/* Forecast data - dashed lines (current month only) */}
                      <Area
                        type="monotone"
                        dataKey="receitaPrevisao"
                        name="Prev. Receita"
                        stroke="hsl(var(--success))"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#colorReceitaPrevisao)"
                        connectNulls={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="lucroPrevisao"
                        name="Prev. Lucro"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#colorLucroPrevisao)"
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>

                {/* Annual Comparison Chart - Overlay 6 months */}
                <TabsContent value="annual" className="mt-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={annualComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCurrentYear" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPreviousYear" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Area
                        type="monotone"
                        dataKey="previousYear"
                        name={previousYearLabel}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#colorPreviousYear)"
                      />
                      <Area
                        type="monotone"
                        dataKey="currentYear"
                        name={currentYearLabel}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorCurrentYear)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  
                  {/* Annual Totals Summary */}
                  <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{currentYearLabel}</p>
                      <p className={cn("text-sm font-semibold text-primary", hideValues && "blur-md select-none")}>{formatCurrency(currentYearTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{previousYearLabel}</p>
                      <p className={cn("text-sm font-medium text-muted-foreground", hideValues && "blur-md select-none")}>{formatCurrency(previousYearTotal)}</p>
                    </div>
                    {previousYearTotal > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Crescimento</p>
                        <p className={`text-sm font-semibold ${growthPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </motion.div>
  );
}
