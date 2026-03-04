import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfYear } from 'date-fns';
import { pt } from 'date-fns/locale';

export type PeriodType = '1M' | '3M' | '6M' | '12M' | 'YTD' | 'custom';

export interface MonthlyReportData {
  month: string;
  fullMonth: string;
  receita: number;
  custos: number;
  lucro: number;
  margin: number;
  projetos: number;
}

export interface TopClientData {
  name: string;
  revenue: number;
  projects: number;
}

export interface SummaryMetrics {
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  margin: number;
  avgProjectValue: number;
  totalProjects: number;
  deliveredProjects: number;
  activeClients: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

export function useDateRange(periodType: PeriodType, customRange: { from: Date | undefined; to: Date | undefined }) {
  return useMemo<DateRange>(() => {
    const now = new Date();
    switch (periodType) {
      case '1M': return { start: subMonths(now, 1), end: now };
      case '3M': return { start: subMonths(now, 3), end: now };
      case '6M': return { start: subMonths(now, 6), end: now };
      case '12M': return { start: subMonths(now, 12), end: now };
      case 'YTD': return { start: startOfYear(now), end: now };
      case 'custom': return {
        start: customRange.from || subMonths(now, 6),
        end: customRange.to || now,
      };
      default: return { start: subMonths(now, 6), end: now };
    }
  }, [periodType, customRange]);
}

export function useMonthlyData(projects: any[], dateRange: DateRange): MonthlyReportData[] {
  return useMemo(() => {
    const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
    const periodMonths = Math.max(1, Math.ceil(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) / 30));
    const months: MonthlyReportData[] = [];

    for (let i = periodMonths - 1; i >= 0; i--) {
      const date = subMonths(dateRange.end, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      if (end < dateRange.start) continue;

      const monthProjects = projects.filter(p => {
        if (!p.is_delivered) return false;
        const effectiveDate = p.competence_month
          ? new Date(p.competence_month + '-01')
          : p.delivered_at ? new Date(p.delivered_at) : null;
        if (!effectiveDate) return false;
        if (p.competence_month) {
          return effectiveDate.getFullYear() === start.getFullYear() && effectiveDate.getMonth() === start.getMonth();
        }
        return isWithinInterval(effectiveDate, { start, end });
      });

      const revenue = monthProjects.reduce((sum: number, p: any) => sum + (p.agreed_value || 0), 0);
      const costs = monthProjects.reduce((sum: number, p: any) =>
        sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);

      months.push({
        month: format(date, 'MMM yy', { locale: pt }),
        fullMonth: format(date, 'MMMM yyyy', { locale: pt }),
        receita: revenue,
        custos: costs,
        lucro: revenue - costs,
        margin: revenue > 0 ? ((revenue - costs) / revenue * 100) : 0,
        projetos: monthProjects.length,
      });
    }
    return months;
  }, [projects, dateRange]);
}

export function useTopClients(projects: any[]): TopClientData[] {
  return useMemo(() => {
    const clientRevenue: Record<string, TopClientData> = {};
    const deliveredProjects = projects.filter((p: any) => p.is_delivered);

    deliveredProjects.forEach((project: any) => {
      if (!project.client_id) return;
      const clientName = project.clients?.name || 'Desconhecido';
      if (!clientRevenue[project.client_id]) {
        clientRevenue[project.client_id] = { name: clientName, revenue: 0, projects: 0 };
      }
      clientRevenue[project.client_id].revenue += project.agreed_value || 0;
      clientRevenue[project.client_id].projects += 1;
    });

    return Object.values(clientRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [projects]);
}

export function useSummaryMetrics(projects: any[], clients: any[]): SummaryMetrics {
  return useMemo(() => {
    const deliveredProjects = projects.filter((p: any) => p.is_delivered);
    const totalRevenue = deliveredProjects.reduce((sum: number, p: any) => sum + (p.agreed_value || 0), 0);
    const totalCosts = deliveredProjects.reduce((sum: number, p: any) =>
      sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
    const avgProjectValue = deliveredProjects.length > 0 ? totalRevenue / deliveredProjects.length : 0;

    return {
      totalRevenue,
      totalCosts,
      profit: totalRevenue - totalCosts,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100) : 0,
      avgProjectValue,
      totalProjects: projects.length,
      deliveredProjects: deliveredProjects.length,
      activeClients: clients.filter((c: any) => c.is_active).length,
    };
  }, [projects, clients]);
}

export function useProjectDistribution(projects: any[]) {
  const byStatus = useMemo(() => {
    const captacao = projects.filter((p: any) => p.current_phase === 'captacao' && !p.is_delivered).length;
    const edicao = projects.filter((p: any) => p.current_phase === 'edicao' && !p.is_delivered).length;
    const finalizados = projects.filter((p: any) => p.is_delivered).length;
    return [
      { name: 'Captação', value: captacao, color: 'hsl(var(--primary))' },
      { name: 'Edição', value: edicao, color: 'hsl(var(--success))' },
      { name: 'Finalizados', value: finalizados, color: 'hsl(var(--warning))' },
    ];
  }, [projects]);

  const byPriority = useMemo(() => {
    const priorities: Record<string, number> = { urgente: 0, alta: 0, media: 0, baixa: 0 };
    projects.filter((p: any) => !p.is_delivered).forEach((p: any) => {
      priorities[p.priority] = (priorities[p.priority] || 0) + 1;
    });
    return Object.entries(priorities).map(([name, value]) => ({ name, value }));
  }, [projects]);

  return { projectsByStatus: byStatus, projectsByPriority: byPriority };
}
