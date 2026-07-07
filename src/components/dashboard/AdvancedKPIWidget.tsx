import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Timer, UserCheck, Target, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

interface AdvancedKPIs {
  revenueForecast: number;
  revenueConfirmed: number;
  leadConversionRate: number;
  totalLeads: number;
  convertedLeads: number;
  avgDeliveryDays: number;
  avgDeliveryDaysPrev: number;
  pipelineValue: number;
  loading: boolean;
}

function useAdvancedKPIs(): AdvancedKPIs {
  const { currentWorkspace } = useWorkspace();
  const [state, setState] = useState<AdvancedKPIs>({
    revenueForecast: 0, revenueConfirmed: 0,
    leadConversionRate: 0, totalLeads: 0, convertedLeads: 0,
    avgDeliveryDays: 0, avgDeliveryDaysPrev: 0,
    pipelineValue: 0, loading: true,
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetch = async () => {
      const wsId = currentWorkspace.id;

      // Parallel queries
      const [projectsRes, clientsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, agreed_value, is_delivered, delivered_at, created_at, delivery_date, shoot_date, current_phase')
          .eq('workspace_id', wsId),
        supabase
          .from('clients')
          .select('id, lead_status, converted_at, estimated_value, created_at')
          .eq('workspace_id', wsId),
      ]);

      const projects = projectsRes.data || [];
      const clients = clientsRes.data || [];

      // Revenue forecast: sum of agreed_value for active (not delivered) projects
      const activeProjects = projects.filter(p => !p.is_delivered);
      const revenueForecast = activeProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
      
      // Revenue confirmed: sum of agreed_value for delivered projects this month
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const revenueConfirmed = projects
        .filter(p => p.is_delivered && p.delivered_at && new Date(p.delivered_at).getMonth() === thisMonth && new Date(p.delivered_at).getFullYear() === thisYear)
        .reduce((sum, p) => sum + (p.agreed_value || 0), 0);

      // Lead conversion rate
      const totalLeads = clients.filter(c => c.lead_status !== null).length;
      const convertedLeads = clients.filter(c => c.lead_status === 'ganho' || c.converted_at !== null).length;
      const leadConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Average delivery time (last 3 months)
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const recentDelivered = projects.filter(p => 
        p.is_delivered && p.delivered_at && new Date(p.delivered_at) >= threeMonthsAgo
      );

      let avgDeliveryDays = 0;
      if (recentDelivered.length > 0) {
        const totalDays = recentDelivered.reduce((sum, p) => {
          const start = new Date(p.shoot_date || p.created_at);
          const end = new Date(p.delivered_at!);
          return sum + Math.max(0, differenceInDays(end, start));
        }, 0);
        avgDeliveryDays = Math.round(totalDays / recentDelivered.length);
      }

      // Previous period avg delivery (3-6 months ago)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const prevDelivered = projects.filter(p =>
        p.is_delivered && p.delivered_at && 
        new Date(p.delivered_at) >= sixMonthsAgo && 
        new Date(p.delivered_at) < threeMonthsAgo
      );
      let avgDeliveryDaysPrev = 0;
      if (prevDelivered.length > 0) {
        const totalDays = prevDelivered.reduce((sum, p) => {
          const start = new Date(p.shoot_date || p.created_at);
          const end = new Date(p.delivered_at!);
          return sum + Math.max(0, differenceInDays(end, start));
        }, 0);
        avgDeliveryDaysPrev = Math.round(totalDays / prevDelivered.length);
      }

      // Pipeline value: estimated_value from active leads
      const pipelineValue = clients
        .filter(c => c.lead_status && c.lead_status !== 'ganho' && c.lead_status !== 'perdido')
        .reduce((sum, c) => sum + (c.estimated_value || 0), 0);

      setState({
        revenueForecast, revenueConfirmed,
        leadConversionRate, totalLeads, convertedLeads,
        avgDeliveryDays, avgDeliveryDaysPrev,
        pipelineValue, loading: false,
      });
    };

    fetch();
  }, [currentWorkspace?.id]);

  return state;
}

function ChangeIndicator({ current, previous, invertColors = false }: { current: number; previous: number; invertColors?: boolean }) {
  if (previous === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const diff = current - previous;
  const isPositive = diff > 0;
  const goodDirection = invertColors ? !isPositive : isPositive;

  return (
    <span className={cn(
      'flex items-center text-xs font-medium',
      goodDirection ? 'text-success' : 'text-destructive'
    )}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(diff)}
    </span>
  );
}

export function AdvancedKPIWidget() {
  const kpis = useAdvancedKPIs();
  const { formatCurrency } = useFormatCurrency();

  if (kpis.loading) {
    return (
      <Card className="glass-card h-full">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            KPIs Avançados
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const kpiCards = [
    {
      icon: TrendingUp,
      label: 'Receita em Pipeline',
      value: formatCurrency(kpis.revenueForecast, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      subtitle: `${formatCurrency(kpis.revenueConfirmed, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} confirmado este mês`,
      color: 'text-success',
      bgColor: 'bg-success/10',
      tooltip: 'Soma do valor acordado dos projetos ativos (não entregues)',
    },
    {
      icon: UserCheck,
      label: 'Conversão de Leads',
      value: `${kpis.leadConversionRate.toFixed(1)}%`,
      subtitle: `${kpis.convertedLeads} de ${kpis.totalLeads} leads`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      tooltip: 'Percentagem de leads convertidos em clientes',
    },
    {
      icon: Timer,
      label: 'Tempo Médio Entrega',
      value: `${kpis.avgDeliveryDays}d`,
      subtitle: kpis.avgDeliveryDaysPrev > 0
        ? `${kpis.avgDeliveryDaysPrev > kpis.avgDeliveryDays ? '↓' : '↑'} era ${kpis.avgDeliveryDaysPrev}d`
        : 'Últimos 3 meses',
      color: kpis.avgDeliveryDaysPrev > 0 && kpis.avgDeliveryDays <= kpis.avgDeliveryDaysPrev ? 'text-success' : 'text-warning',
      bgColor: kpis.avgDeliveryDaysPrev > 0 && kpis.avgDeliveryDays <= kpis.avgDeliveryDaysPrev ? 'bg-success/10' : 'bg-warning/10',
      tooltip: 'Tempo médio entre captação/criação e entrega nos últimos 3 meses',
    },
    {
      icon: Target,
      label: 'Pipeline de Leads',
      value: formatCurrency(kpis.pipelineValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      subtitle: `${kpis.totalLeads - kpis.convertedLeads} leads ativos`,
      color: 'text-info',
      bgColor: 'bg-info/10',
      tooltip: 'Valor estimado dos leads ativos (excluindo convertidos e perdidos)',
    },
  ];

  return (
    <Card className="glass-card h-full">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          KPIs Avançados
          <Badge variant="secondary" className="text-[10px] ml-auto">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <TooltipProvider>
          <div className="grid grid-cols-2 gap-3">
            {kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Tooltip key={kpi.label}>
                  <TooltipTrigger asChild>
                    <div className="p-3 rounded-lg border border-border/50 hover:border-border transition-colors cursor-default">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('p-1.5 rounded-md', kpi.bgColor)}>
                          <Icon className={cn('h-3.5 w-3.5', kpi.color)} />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium truncate">{kpi.label}</span>
                      </div>
                      <p className={cn('text-lg font-bold tabular-nums', kpi.color)}>{kpi.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate tabular-nums">{kpi.subtitle}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{kpi.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
