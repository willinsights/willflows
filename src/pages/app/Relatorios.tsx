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
  Activity,
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
import { AccessDenied } from '@/components/ui/access-denied';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import KanbanMetrics from '@/components/kanban/KanbanMetrics';

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
  const { canViewReports } = useFinancialPermissions();
  
  // Block access for non-admins
  if (!canViewReports) {
    return <AccessDenied description="Apenas administradores podem aceder aos Relatórios financeiros." />;
  }

  const navigate = useNavigate();
  const { projects } = useProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const { hasAccess: canExportPdf, requireFeature: requirePdfExport, UpgradeAlertComponent } = useFeatureGate('exportPdf');
  const { hasAccess: canExportExcel, requireFeature: requireExcelExport } = useFeatureGate('exportExcel');
  
  // Period state
  const [periodType, setPeriodType] = useState<PeriodType>('6M');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

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

  // Fetch collaborators data - only from DELIVERED projects
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!currentWorkspace?.id) return;

      setCollaboratorsLoading(true);
      setCollaboratorsError(null);

      // Filter only delivered projects
      const deliveredProjectIds = projects.filter(p => p.is_delivered).map(p => p.id);
      if (deliveredProjectIds.length === 0) {
        setCollaboratorsData([]);
        setCollaboratorsLoading(false);
        return;
      }

      // Try the join query first
      const { data: teamData, error } = await supabase
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
        .in('project_id', deliveredProjectIds);

      // If join fails, use fallback with separate queries
      let finalTeamData = teamData;
      if (error || !teamData) {
        console.warn('Join query failed, using fallback:', error?.message);
        
        // Fallback: fetch project_team without join
        const { data: basicTeamData, error: fallbackError } = await supabase
          .from('project_team')
          .select('user_id, external_name, is_external, payment_amount, phase, project_id')
          .in('project_id', deliveredProjectIds);

        if (fallbackError || !basicTeamData) {
          console.error('Fallback query also failed:', fallbackError?.message);
          setCollaboratorsError('Falha ao carregar colaboradores');
          setCollaboratorsLoading(false);
          return;
        }

        // Get unique user_ids for profiles lookup
        const userIds = [...new Set(basicTeamData.filter(t => t.user_id).map(t => t.user_id))];
        
        // Fetch profiles separately
        let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);
          
          if (profilesData) {
            profilesMap = profilesData.reduce((acc, p) => {
              acc[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
              return acc;
            }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
          }
        }

        // Merge profiles into team data
        finalTeamData = basicTeamData.map(entry => ({
          ...entry,
          profiles: entry.user_id ? profilesMap[entry.user_id] || null : null,
        }));
      }

      if (!finalTeamData || finalTeamData.length === 0) {
        setCollaboratorsData([]);
        setCollaboratorsLoading(false);
        return;
      }

      // Aggregate by collaborator (user_id or external_name)
      const collaboratorStats: Record<string, CollaboratorData & { projectIds: Set<string> }> = {};

      finalTeamData.forEach((entry: any) => {
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
            projectIds: new Set(),
          };
        }

        collaboratorStats[key].totalValue += entry.payment_amount || 0;
        if (!collaboratorStats[key].phases.includes(entry.phase)) {
          collaboratorStats[key].phases.push(entry.phase);
        }
        // Track unique delivered projects
        collaboratorStats[key].projectIds.add(entry.project_id);
      });

      // Convert projectIds Set to count and sort by total value
      const sorted = Object.values(collaboratorStats)
        .map(({ projectIds, ...rest }) => ({
          ...rest,
          projectCount: projectIds.size, // Unique delivered projects count
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      setCollaboratorsData(sorted);
      setCollaboratorsLoading(false);
    };

    fetchCollaborators();
  }, [projects, currentWorkspace?.id]);

  // Calculate monthly revenue data - using project cost fields as source of truth
  const monthlyData = useMemo(() => {
    const months = [];
    
    for (let i = periodMonths - 1; i >= 0; i--) {
      const date = subMonths(dateRange.end, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      if (end < dateRange.start) continue;
      
      const monthProjects = projects.filter(p => {
        if (!p.is_delivered) return false;
        // Use competence_month with fallback to delivered_at
        const effectiveDate = p.competence_month
          ? new Date(p.competence_month + '-01')
          : p.delivered_at ? new Date(p.delivered_at) : null;
        if (!effectiveDate) return false;
        if (p.competence_month) {
          return effectiveDate.getFullYear() === start.getFullYear() && effectiveDate.getMonth() === start.getMonth();
        }
        return isWithinInterval(effectiveDate, { start, end });
      });
      
      const revenue = monthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
      
      // Use project cost fields as source of truth (custo_captacao + custo_edicao + custos_extras)
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

  // Summary metrics - using project cost fields as source of truth
  const summaryMetrics = useMemo(() => {
    const deliveredProjects = projects.filter(p => p.is_delivered);
    
    const totalRevenue = deliveredProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    
    // Use project cost fields as source of truth (custo_captacao + custo_edicao + custos_extras)
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
  const handleExportExcel = async () => {
    const { exportMultiSectionToExcel } = await import('@/lib/excel-export');
    
    const totalReceita = monthlyData.reduce((sum, m) => sum + m.receita, 0);
    const totalCustos = monthlyData.reduce((sum, m) => sum + m.custos, 0);
    const totalLucro = monthlyData.reduce((sum, m) => sum + m.lucro, 0);
    const avgMargin = totalReceita > 0 ? ((totalLucro / totalReceita) * 100) : 0;
    const totalProjetos = monthlyData.reduce((sum, m) => sum + m.projetos, 0);
    
    await exportMultiSectionToExcel({
      title: 'Relatório Financeiro',
      subtitle: `${currentWorkspace?.name || 'WillFlow'} • Período: ${format(dateRange.start, "d MMM yyyy", { locale: pt })} - ${format(dateRange.end, "d MMM yyyy", { locale: pt })}`,
      sections: [
        {
          title: 'EVOLUÇÃO MENSAL',
          headers: ['Mês', 'Receita', 'Custos', 'Lucro', 'Margem (%)', 'Projetos'],
          data: [
            ...monthlyData.map(m => [
              m.fullMonth,
              formatCurrency(m.receita),
              formatCurrency(m.custos),
              formatCurrency(m.lucro),
              `${m.margin.toFixed(1)}%`,
              m.projetos,
            ]),
            ['TOTAL', formatCurrency(totalReceita), formatCurrency(totalCustos), formatCurrency(totalLucro), `${avgMargin.toFixed(1)}%`, totalProjetos],
          ],
        },
        {
          title: 'TOP 10 CLIENTES POR RECEITA',
          headers: ['#', 'Cliente', 'Receita', 'Projetos'],
          data: topClients.map((client, i) => [
            i + 1,
            client.name,
            formatCurrency(client.revenue),
            client.projects,
          ]),
        },
        {
          title: 'TOP 10 COLABORADORES',
          headers: ['#', 'Colaborador', 'Total Ganho', 'Projetos Finalizados'],
          data: collaboratorsData.map((collab, i) => [
            i + 1,
            collab.name,
            formatCurrency(collab.totalValue),
            collab.projectCount,
          ]),
        },
      ],
      filename: `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    });
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
          <title>Relatório Financeiro - ${currentWorkspace?.name || 'WillFlow'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
            .header { border-left: 4px solid #8224e3; padding-left: 20px; margin-bottom: 30px; }
            .header h1 { color: #8224e3; font-size: 28px; margin-bottom: 8px; }
            .header .workspace-name { color: #666; font-size: 16px; margin-bottom: 4px; }
            .header .date { color: #999; font-size: 12px; }
            .stats-bar { display: flex; gap: 20px; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f8f4ff 0%, #f0e8ff 100%); border-radius: 12px; flex-wrap: wrap; }
            .stat-item { flex: 1; min-width: 120px; }
            .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; }
            .stat-value.success { color: #16a34a; }
            .stat-value.negative { color: #dc2626; }
            .stat-value.primary { color: #8224e3; }
            h2 { color: #8224e3; margin-top: 30px; margin-bottom: 15px; font-size: 16px; display: flex; align-items: center; gap: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #e5e5e5; padding: 10px 8px; text-align: left; }
            th { background: #8224e3; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
            th.right, td.right { text-align: right; }
            tr:nth-child(even) { background-color: #fafafa; }
            tr:hover { background-color: #f5f0ff; }
            tr.total { background-color: #f8f4ff; font-weight: bold; }
            .positive { color: #16a34a; }
            .negative { color: #dc2626; }
            .rankings { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
            .ranking-card { background: #fafafa; border-radius: 12px; padding: 20px; }
            .ranking-card h3 { color: #8224e3; font-size: 14px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
            .ranking-list { list-style: none; }
            .ranking-list li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; font-size: 12px; }
            .ranking-list li:last-child { border-bottom: none; }
            .ranking-list .name { font-weight: 500; }
            .ranking-list .value { font-weight: 600; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center; }
            .footer-brand { color: #8224e3; font-weight: 600; font-size: 14px; }
            .footer-date { color: #999; font-size: 11px; }
            @media print { 
              body { padding: 20px; } 
              .stats-bar, .rankings { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Relatório Financeiro</h1>
            <p class="workspace-name">${currentWorkspace?.name || 'WillFlow'}</p>
            <p class="date">Período: ${format(dateRange.start, "d 'de' MMMM 'de' yyyy", { locale: pt })} - ${format(dateRange.end, "d 'de' MMMM 'de' yyyy", { locale: pt })}</p>
          </div>
          
          <div class="stats-bar">
            <div class="stat-item">
              <div class="stat-label">Receita Total</div>
              <div class="stat-value success">${formatCurrency(totalReceita)}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Custos Total</div>
              <div class="stat-value negative">${formatCurrency(totalCustos)}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Lucro</div>
              <div class="stat-value primary">${formatCurrency(totalLucro)}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Margem Média</div>
              <div class="stat-value">${avgMargin.toFixed(1)}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Projetos Entregues</div>
              <div class="stat-value">${totalProjetos}</div>
            </div>
          </div>
          
          <h2>📈 Evolução Mensal</h2>
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th class="right">Receita</th>
                <th class="right">Custos</th>
                <th class="right">Lucro</th>
                <th class="right">Margem</th>
                <th class="right">Projetos</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.map(m => `
                <tr>
                  <td>${m.fullMonth}</td>
                  <td class="right positive">${formatCurrency(m.receita)}</td>
                  <td class="right negative">${formatCurrency(m.custos)}</td>
                  <td class="right">${formatCurrency(m.lucro)}</td>
                  <td class="right">${m.margin.toFixed(1)}%</td>
                  <td class="right">${m.projetos}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>TOTAL</td>
                <td class="right positive">${formatCurrency(totalReceita)}</td>
                <td class="right negative">${formatCurrency(totalCustos)}</td>
                <td class="right">${formatCurrency(totalLucro)}</td>
                <td class="right">${avgMargin.toFixed(1)}%</td>
                <td class="right">${totalProjetos}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="rankings">
            <div class="ranking-card">
              <h3>🏆 Top 10 Clientes por Receita</h3>
              <ul class="ranking-list">
                ${topClients.map((client, i) => `
                  <li>
                    <span class="name">${i + 1}. ${client.name}</span>
                    <span class="value positive">${formatCurrency(client.revenue)}</span>
                  </li>
                `).join('')}
                ${topClients.length === 0 ? '<li><span class="name">Sem dados</span></li>' : ''}
              </ul>
            </div>
            
            <div class="ranking-card">
              <h3>👥 Top 10 Colaboradores</h3>
              <ul class="ranking-list">
                ${collaboratorsData.map((collab, i) => `
                  <li>
                    <span class="name">${i + 1}. ${collab.name}</span>
                    <span class="value negative">${formatCurrency(collab.totalValue)}</span>
                  </li>
                `).join('')}
                ${collaboratorsData.length === 0 ? '<li><span class="name">Sem dados</span></li>' : ''}
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <span class="footer-brand">WillFlow</span>
            <span class="footer-date">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
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
            {collaboratorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : collaboratorsError ? (
              <p className="text-center text-destructive py-8">
                {collaboratorsError}
              </p>
            ) : collaboratorsData.length === 0 ? (
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
                    <Avatar className="h-[30px] w-[30px]">
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
                        <span>{collab.projectCount} projeto{collab.projectCount !== 1 ? 's' : ''} finalizado{collab.projectCount !== 1 ? 's' : ''}</span>
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

      {/* Kanban Metrics Section */}
      <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
        <Card className="glass-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Métricas de Kanban
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Performance</Badge>
                  {metricsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <KanbanMetrics />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
