import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfYear } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  FileSpreadsheet,
  FileText,
  Lock,
  Crown,
  FolderKanban,
  CalendarDays,
  UserCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useFeatureGate } from '@/components/subscription/FeatureGate';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type PeriodType = '1M' | '3M' | '6M' | '12M' | 'YTD' | 'custom';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--destructive))'];

interface CollaboratorData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalValue: number;
  projectCount: number;
  phases: string[];
  isExternal: boolean;
}

export default function Relatorios() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const { canViewReports } = useFinancialPermissions();
  const { hasAccess: canExportPdf, requireFeature: requirePdfExport, UpgradeAlertComponent } = useFeatureGate('exportPdf');
  const { hasAccess: canExportExcel, requireFeature: requireExcelExport } = useFeatureGate('exportExcel');
  
  // Period state
  const [periodType, setPeriodType] = useState<PeriodType>('6M');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Top Collaborators data
  const [collaboratorsData, setCollaboratorsData] = useState<CollaboratorData[]>([]);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate date range based on period type
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodType) {
      case '1M':
        return { start: subMonths(now, 1), end: now };
      case '3M':
        return { start: subMonths(now, 3), end: now };
      case '6M':
        return { start: subMonths(now, 6), end: now };
      case '12M':
        return { start: subMonths(now, 12), end: now };
      case 'YTD':
        return { start: startOfYear(now), end: now };
      case 'custom':
        return { 
          start: customDateRange.from || subMonths(now, 6), 
          end: customDateRange.to || now 
        };
      default:
        return { start: subMonths(now, 6), end: now };
    }
  }, [periodType, customDateRange]);

  // Calculate number of months between dates
  const periodMonths = useMemo(() => {
    const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 30));
  }, [dateRange]);

  // Fetch collaborators data
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!currentWorkspace?.id) return;

      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) {
        setCollaboratorsData([]);
        return;
      }

      const { data: teamData } = await supabase
        .from('project_team')
        .select(`
          user_id,
          external_name,
          is_external,
          payment_amount,
          phase,
          project_id,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .in('project_id', projectIds);

      if (!teamData) {
        setCollaboratorsData([]);
        return;
      }

      // Aggregate by collaborator (user_id or external_name)
      const collaboratorStats: Record<string, CollaboratorData> = {};

      teamData.forEach((entry: any) => {
        const isExternal = entry.is_external || !entry.user_id;
        const key = isExternal ? `ext_${entry.external_name}` : entry.user_id;
        const name = isExternal 
          ? entry.external_name 
          : (entry.profiles?.full_name || 'Desconhecido');
        const avatarUrl = isExternal ? null : entry.profiles?.avatar_url;

        if (!collaboratorStats[key]) {
          collaboratorStats[key] = {
            userId: key,
            name,
            avatarUrl,
            totalValue: 0,
            projectCount: 0,
            phases: [],
            isExternal,
          };
        }

        collaboratorStats[key].totalValue += entry.payment_amount || 0;
        if (!collaboratorStats[key].phases.includes(entry.phase)) {
          collaboratorStats[key].phases.push(entry.phase);
        }
        // Count unique projects
        collaboratorStats[key].projectCount += 1;
      });

      // Sort by total value and take top 10
      const sorted = Object.values(collaboratorStats)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      setCollaboratorsData(sorted);
    };

    fetchCollaborators();
  }, [projects, currentWorkspace?.id]);

  // Calculate monthly revenue data
  const monthlyData = useMemo(() => {
    const months = [];
    
    for (let i = periodMonths - 1; i >= 0; i--) {
      const date = subMonths(dateRange.end, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      if (end < dateRange.start) continue;
      
      const monthProjects = projects.filter(p => {
        if (!p.is_delivered || !p.delivered_at) return false;
        const delivered = new Date(p.delivered_at);
        return isWithinInterval(delivered, { start, end });
      });
      
      const revenue = monthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
      const costs = monthProjects.reduce((sum, p) => 
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
  }, [projects, dateRange, periodMonths]);

  // Top clients by revenue
  const topClients = useMemo(() => {
    const clientRevenue: Record<string, { name: string; revenue: number; projects: number }> = {};
    
    projects.forEach(project => {
      if (!project.client_id) return;
      const clientName = project.clients?.name || 'Desconhecido';
      
      if (!clientRevenue[project.client_id]) {
        clientRevenue[project.client_id] = { name: clientName, revenue: 0, projects: 0 };
      }
      
      clientRevenue[project.client_id].revenue += project.agreed_value || 0;
      clientRevenue[project.client_id].projects += 1;
    });
    
    return Object.values(clientRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [projects]);

  // Projects by status
  const projectsByStatus = useMemo(() => {
    const captacao = projects.filter(p => p.current_phase === 'captacao' && !p.is_delivered).length;
    const edicao = projects.filter(p => p.current_phase === 'edicao' && !p.is_delivered).length;
    const finalizados = projects.filter(p => p.is_delivered).length;
    
    return [
      { name: 'Captação', value: captacao, color: COLORS[0] },
      { name: 'Edição', value: edicao, color: COLORS[1] },
      { name: 'Finalizados', value: finalizados, color: COLORS[2] },
    ];
  }, [projects]);

  // Projects by priority
  const projectsByPriority = useMemo(() => {
    const priorities: Record<string, number> = {
      urgente: 0,
      alta: 0,
      media: 0,
      baixa: 0,
    };
    
    projects.filter(p => !p.is_delivered).forEach(p => {
      priorities[p.priority] = (priorities[p.priority] || 0) + 1;
    });
    
    return Object.entries(priorities).map(([name, value]) => ({ name, value }));
  }, [projects]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const deliveredProjects = projects.filter(p => p.is_delivered);
    const totalRevenue = deliveredProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const totalCosts = deliveredProjects.reduce((sum, p) => 
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
      activeClients: clients.filter(c => c.is_active).length,
    };
  }, [projects, clients]);

  // Export functions
  const handleExportExcel = () => {
    const headers = ['Mês', 'Receita (€)', 'Custos (€)', 'Lucro (€)', 'Margem (%)', 'Projetos'];
    const rows = monthlyData.map(m => [
      m.fullMonth,
      m.receita.toFixed(2),
      m.custos.toFixed(2),
      m.lucro.toFixed(2),
      m.margin.toFixed(1),
      m.projetos,
    ]);

    const totalReceita = monthlyData.reduce((sum, m) => sum + m.receita, 0);
    const totalCustos = monthlyData.reduce((sum, m) => sum + m.custos, 0);
    const totalLucro = monthlyData.reduce((sum, m) => sum + m.lucro, 0);
    const avgMargin = totalReceita > 0 ? ((totalLucro / totalReceita) * 100) : 0;
    const totalProjetos = monthlyData.reduce((sum, m) => sum + m.projetos, 0);
    
    rows.push(['', '', '', '', '', '']);
    rows.push(['TOTAL', totalReceita.toFixed(2), totalCustos.toFixed(2), totalLucro.toFixed(2), avgMargin.toFixed(1), totalProjetos]);

    const csvContent = [
      `Relatório Financeiro - ${currentWorkspace?.name || 'Workspace'}`,
      `Período: ${format(dateRange.start, "d MMM yyyy", { locale: pt })} - ${format(dateRange.end, "d MMM yyyy", { locale: pt })}`,
      `Gerado em: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt })}`,
      '',
      headers.join(';'),
      ...rows.map(row => row.toString().split(',').join(';'))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const totalReceita = monthlyData.reduce((sum, m) => sum + m.receita, 0);
    const totalCustos = monthlyData.reduce((sum, m) => sum + m.custos, 0);
    const totalLucro = monthlyData.reduce((sum, m) => sum + m.lucro, 0);
    const avgMargin = totalReceita > 0 ? ((totalLucro / totalReceita) * 100) : 0;
    const totalProjetos = monthlyData.reduce((sum, m) => sum + m.projetos, 0);
    
    const printContent = `
      <html>
        <head>
          <title>Relatório Financeiro - ${currentWorkspace?.name || 'Workspace'}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #6b21a8; margin-bottom: 10px; }
            h2 { color: #6b21a8; margin-top: 30px; margin-bottom: 15px; font-size: 18px; }
            .subtitle { color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e5e5; padding: 12px; text-align: right; }
            th { background-color: #f8f4ff; font-weight: 600; color: #6b21a8; }
            th:first-child, td:first-child { text-align: left; }
            tr:nth-child(even) { background-color: #fafafa; }
            tr.total { background-color: #f8f4ff; font-weight: bold; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #6b21a8; padding-bottom: 20px; }
            .summary { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
            .summary-card { padding: 20px; background: linear-gradient(135deg, #f8f4ff 0%, #f0e8ff 100%); border-radius: 12px; flex: 1; min-width: 150px; }
            .summary-label { font-size: 12px; color: #666; margin-bottom: 5px; }
            .summary-value { font-size: 24px; font-weight: bold; color: #6b21a8; }
            .positive { color: #16a34a; }
            .negative { color: #dc2626; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório Financeiro</h1>
            <p class="subtitle">${currentWorkspace?.name || 'Workspace'}</p>
            <p><strong>Período:</strong> ${format(dateRange.start, "d 'de' MMMM 'de' yyyy", { locale: pt })} - ${format(dateRange.end, "d 'de' MMMM 'de' yyyy", { locale: pt })}</p>
          </div>
          
          <h2>Resumo do Período</h2>
          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Receita Total</div>
              <div class="summary-value positive">${formatCurrency(totalReceita)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Custos Total</div>
              <div class="summary-value negative">${formatCurrency(totalCustos)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Lucro</div>
              <div class="summary-value">${formatCurrency(totalLucro)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Margem Média</div>
              <div class="summary-value">${avgMargin.toFixed(1)}%</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Projetos Entregues</div>
              <div class="summary-value">${totalProjetos}</div>
            </div>
          </div>
          
          <h2>Evolução Mensal</h2>
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Receita</th>
                <th>Custos</th>
                <th>Lucro</th>
                <th>Margem</th>
                <th>Projetos</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.map(m => `
                <tr>
                  <td>${m.fullMonth}</td>
                  <td class="positive">${formatCurrency(m.receita)}</td>
                  <td class="negative">${formatCurrency(m.custos)}</td>
                  <td>${formatCurrency(m.lucro)}</td>
                  <td>${m.margin.toFixed(1)}%</td>
                  <td>${m.projetos}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>TOTAL</td>
                <td class="positive">${formatCurrency(totalReceita)}</td>
                <td class="negative">${formatCurrency(totalCustos)}</td>
                <td>${formatCurrency(totalLucro)}</td>
                <td>${avgMargin.toFixed(1)}%</td>
                <td>${totalProjetos}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            Gerado em ${format(new Date(), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })} • WillFlow
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Restricted access
  if (!canViewReports) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Lock className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Relatórios financeiros estão disponíveis apenas para administradores.
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Análises e métricas do seu negócio</p>
          </div>
        </div>
        <EmptyState
          icon={FolderKanban}
          title="Sem dados para analisar"
          description="Os relatórios aparecerão quando tiver projetos entregues. Comece criando o seu primeiro projeto."
          action={{
            label: 'Criar projeto',
            onClick: () => navigate('/app/captacao'),
            icon: FolderKanban,
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análises e métricas do seu negócio</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            {(['1M', '3M', '6M', '12M', 'YTD'] as PeriodType[]).map((p) => (
              <Button
                key={p}
                variant={periodType === p ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 px-3",
                  periodType === p && "bg-primary text-primary-foreground"
                )}
                onClick={() => setPeriodType(p)}
              >
                {p === 'YTD' ? 'YTD' : p}
              </Button>
            ))}
          </div>
          
          {/* Custom Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={periodType === 'custom' ? 'default' : 'outline'}
                size="sm"
                className={cn("h-8 gap-2", periodType === 'custom' && "bg-primary text-primary-foreground")}
                onClick={() => setPeriodType('custom')}
              >
                <CalendarDays className="h-4 w-4" />
                {periodType === 'custom' && customDateRange.from && customDateRange.to
                  ? `${format(customDateRange.from, 'dd/MM')} - ${format(customDateRange.to, 'dd/MM')}`
                  : 'Personalizado'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={{ from: customDateRange.from, to: customDateRange.to }}
                onSelect={(range) => {
                  setCustomDateRange({ from: range?.from, to: range?.to });
                  if (range?.from && range?.to) {
                    setPeriodType('custom');
                  }
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          {/* Export Buttons */}
          {canExportExcel ? (
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => requireExcelExport(handleExportExcel)}
                    className="h-8 gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    <Crown className="h-3 w-3 text-primary" />
                    Excel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Disponível no plano Pro</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canExportPdf ? (
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-8">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => requirePdfExport(handleExportPDF)}
                    className="h-8 gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    <Crown className="h-3 w-3 text-primary" />
                    PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Disponível no plano Pro</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <UpgradeAlertComponent />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Receita Total</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(summaryMetrics.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Lucro</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summaryMetrics.profit)}</p>
            <Badge variant="secondary" className="mt-1">
              {summaryMetrics.margin.toFixed(1)}% margem
            </Badge>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">Média/Projeto</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summaryMetrics.avgProjectValue)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-info" />
              <span className="text-sm text-muted-foreground">Clientes Ativos</span>
            </div>
            <p className="text-2xl font-bold">{summaryMetrics.activeClients}</p>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Financial Evolution */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução Financeira Mensal
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {format(dateRange.start, "MMM yy", { locale: pt })} - {format(dateRange.end, "MMM yy", { locale: pt })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => {
                    const item = monthlyData.find(m => m.month === label);
                    return item?.fullMonth || label;
                  }}
                />
                <Legend />
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
                  dataKey="lucro" 
                  name="Lucro" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLucro)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Summary below chart */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Receita</p>
              <p className="text-lg font-bold text-success">
                {formatCurrency(monthlyData.reduce((sum, m) => sum + m.receita, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Custos</p>
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(monthlyData.reduce((sum, m) => sum + m.custos, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Lucro</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(monthlyData.reduce((sum, m) => sum + m.lucro, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Projetos Entregues</p>
              <p className="text-lg font-bold">
                {monthlyData.reduce((sum, m) => sum + m.projetos, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Revenue vs Costs */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita, Custos e Lucro por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custos" name="Custos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendência do Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Top Rankings */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Clients */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-success" />
              Top 10 Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado de clientes disponível
              </p>
            ) : (
              <div className="space-y-3">
                {topClients.map((client, index) => (
                  <motion.div
                    key={client.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/10 text-success font-bold text-xs">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <span className="font-bold text-success text-sm ml-2">{formatCurrency(client.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{client.projects} projeto(s)</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full"
                            style={{ width: `${(client.revenue / (topClients[0]?.revenue || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Collaborators */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle className="h-4 w-4 text-primary" />
              Top 10 Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collaboratorsData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado de colaboradores disponível
              </p>
            ) : (
              <div className="space-y-3">
                {collaboratorsData.map((collab, index) => (
                  <motion.div
                    key={collab.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {index + 1}
                    </div>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={collab.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {collab.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm truncate">{collab.name}</p>
                          {collab.isExternal && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">Ext</Badge>
                          )}
                        </div>
                        <span className="font-bold text-primary text-sm ml-2">{formatCurrency(collab.totalValue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{collab.projectCount} atrib.</span>
                        <div className="flex gap-1">
                          {collab.phases.includes('captacao') && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">CAP</Badge>
                          )}
                          {collab.phases.includes('edicao') && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">EDI</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4 text-warning" />
              Distribuição de Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {projectsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {projectsByStatus.map((status, index) => (
                <div key={status.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span>{status.name}</span>
                  </div>
                  <span className="font-medium">{status.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Por Prioridade (Ativos)</p>
              <div className="grid grid-cols-2 gap-2">
                {projectsByPriority.map((priority) => (
                  <div key={priority.name} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{priority.name}</span>
                    <Badge variant="secondary" className="text-xs">{priority.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Monthly Details (Collapsible) */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Card className="glass-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Detalhes Mensais</CardTitle>
                {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Mês</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Receita</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Custos</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Lucro</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Margem</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Projetos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">{m.fullMonth}</td>
                        <td className="py-2 px-3 text-right text-success">{formatCurrency(m.receita)}</td>
                        <td className="py-2 px-3 text-right text-destructive">{formatCurrency(m.custos)}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(m.lucro)}</td>
                        <td className="py-2 px-3 text-right">
                          <Badge variant={m.margin >= 30 ? "default" : m.margin >= 15 ? "secondary" : "destructive"}>
                            {m.margin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right">{m.projetos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
