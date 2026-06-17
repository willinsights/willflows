import { PrivacyBlur } from '@/components/ui/PrivacyBlur';
import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';

interface MonthPoint {
  month: string;
  label: string;
  revenue: number;
  isForecast: boolean;
}

export function RevenueForecastReport() {
  const { currentWorkspace } = useWorkspace();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<MonthPoint[]>([]);
  const [forecastTotal, setForecastTotal] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [avgGrowth, setAvgGrowth] = useState(0);
  const [seasonalityNote, setSeasonalityNote] = useState('');

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchData = async () => {
      setLoading(true);
      const wsId = currentWorkspace.id;
      const now = new Date();

      const [projectsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, agreed_value, is_delivered, delivered_at, created_at, delivery_date, shoot_date, competence_month')
          .eq('workspace_id', wsId),
      ]);

      const projects = projectsRes.data || [];

      // Build historical monthly revenue (last 12 months)
      const historicalMonths: MonthPoint[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const key = format(monthDate, 'yyyy-MM');
        const label = format(monthDate, 'MMM yy', { locale: pt });

        const monthRevenue = projects
          .filter(p => {
            if (!p.is_delivered) return false;
            const cm = p.competence_month;
            if (cm) return cm === key;
            if (p.delivered_at) return format(new Date(p.delivered_at), 'yyyy-MM') === key;
            return false;
          })
          .reduce((sum, p) => sum + (p.agreed_value || 0), 0);

        historicalMonths.push({ month: key, label, revenue: monthRevenue, isForecast: false });
      }

      // Calculate average monthly revenue and growth rate
      const revenueValues = historicalMonths.map(m => m.revenue).filter(v => v > 0);
      const avgRevenue = revenueValues.length > 0 ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length : 0;

      // Growth: compare last 3 months avg vs previous 3 months avg
      const last3 = historicalMonths.slice(-3).reduce((s, m) => s + m.revenue, 0) / 3;
      const prev3 = historicalMonths.slice(-6, -3).reduce((s, m) => s + m.revenue, 0) / 3;
      const growthRate = prev3 > 0 ? ((last3 - prev3) / prev3) : 0;

      // Pipeline: active projects with scheduled dates
      const activeProjects = projects.filter(p => !p.is_delivered);
      const pipeline = activeProjects.reduce((s, p) => s + (p.agreed_value || 0), 0);

      // Seasonality detection: find best/worst months
      const monthAvgs = new Map<number, number[]>();
      for (const m of historicalMonths) {
        const monthNum = parseInt(m.month.split('-')[1]);
        const arr = monthAvgs.get(monthNum) || [];
        arr.push(m.revenue);
        monthAvgs.set(monthNum, arr);
      }

      // Forecast next 3 months
      const forecastMonths: MonthPoint[] = [];
      let forecastSum = 0;
      for (let i = 1; i <= 3; i++) {
        const monthDate = addMonths(now, i);
        const key = format(monthDate, 'yyyy-MM');
        const label = format(monthDate, 'MMM yy', { locale: pt });

        // Scheduled pipeline for this month
        const scheduledRevenue = activeProjects
          .filter(p => {
            const target = p.delivery_date || p.shoot_date;
            if (!target) return false;
            return format(new Date(target), 'yyyy-MM') === key;
          })
          .reduce((s, p) => s + (p.agreed_value || 0), 0);

        // Trend-based estimate (weighted: 60% scheduled + 40% trend)
        const trendEstimate = avgRevenue * (1 + growthRate * i * 0.3);
        const forecastValue = scheduledRevenue > 0
          ? scheduledRevenue * 0.6 + trendEstimate * 0.4
          : trendEstimate;

        forecastMonths.push({ month: key, label, revenue: Math.round(forecastValue), isForecast: true });
        forecastSum += Math.round(forecastValue);
      }

      // Seasonality note
      let seasonNote = '';
      const currentMonth = now.getMonth() + 1;
      const nextMonths = [1, 2, 3].map(i => ((currentMonth + i - 1) % 12) + 1);
      const summerMonths = [7, 8];
      const decemberMonth = [12];
      if (nextMonths.some(m => summerMonths.includes(m))) {
        seasonNote = 'Período de verão pode afetar o volume de projetos';
      } else if (nextMonths.some(m => decemberMonth.includes(m))) {
        seasonNote = 'Dezembro tende a ter menor atividade';
      }

      setChartData([...historicalMonths, ...forecastMonths]);
      setForecastTotal(forecastSum);
      setPipelineValue(pipeline);
      setAvgGrowth(growthRate * 100);
      setSeasonalityNote(seasonNote);
      setLoading(false);
    };

    fetchData();
  }, [currentWorkspace?.id]);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader><Skeleton className="h-6 w-56" /></CardHeader>
        <CardContent><Skeleton className="h-[280px]" /></CardContent>
      </Card>
    );
  }

  const currentMonthKey = format(new Date(), 'yyyy-MM');

  return (
    <PrivacyBlur>
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Previsão de Receita
            <Badge variant="secondary" className="text-[10px]">3 meses</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* KPI Summary */}
        <TooltipProvider>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Forecast 3M</span>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(forecastTotal, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent><p>Receita estimada para os próximos 3 meses</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="h-3 w-3 text-success" />
                    <span className="text-[11px] text-muted-foreground">Pipeline</span>
                  </div>
                  <p className="text-lg font-bold text-success">
                    {formatCurrency(pipelineValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent><p>Valor total dos projetos ativos em pipeline</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3 w-3 text-info" />
                    <span className="text-[11px] text-muted-foreground">Tendência</span>
                  </div>
                  <p className={cn('text-lg font-bold', avgGrowth >= 0 ? 'text-success' : 'text-destructive')}>
                    {avgGrowth >= 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
                  </p>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent><p>Taxa de crescimento (últimos 3 meses vs anteriores)</p></TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Chart */}
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <RechartsTooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, _name: string, props: any) => {
                  const point = props.payload as MonthPoint;
                  return [formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), point.isForecast ? '📊 Previsão' : 'Receita'];
                }}
              />
              <ReferenceLine x={chartData.find(d => d.month === currentMonthKey)?.label} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: 'Hoje', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorHistorical)"
                dot={(props: any) => {
                  const point = chartData[props.index];
                  if (!point) return <circle key={props.index} />;
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={point.isForecast ? 4 : 3}
                      fill={point.isForecast ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                      stroke={point.isForecast ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                      strokeWidth={point.isForecast ? 2 : 1}
                      strokeDasharray={point.isForecast ? '3 3' : '0'}
                    />
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Seasonality */}
        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-primary rounded" />
              <span>Histórico</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-success" />
              <span>Previsão</span>
            </div>
          </div>
          {seasonalityNote && (
            <div className="flex items-center gap-1.5 text-[11px] text-warning">
              <AlertTriangle className="h-3 w-3" />
              <span>{seasonalityNote}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </PrivacyBlur>
  );
}
