import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  BarChart3, TrendingUp, Users, Award, FileSpreadsheet, FileText,
  Lock, Crown, FolderKanban, CalendarDays, UserCircle, ChevronDown,
  ChevronUp, Activity, Layers, GitCompare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFeatureGate } from '@/components/subscription/FeatureGate';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { AccessDenied } from '@/components/ui/access-denied';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import KanbanMetrics from '@/components/kanban/KanbanMetrics';
import { useDateRange, useMonthlyData, useTopClients, useSummaryMetrics, useProjectDistribution, type PeriodType } from '@/hooks/useReportData';
import { useCollaboratorRanking } from '@/hooks/useCollaboratorRanking';
import { generateReportPdfHtml, printReportPdf } from '@/lib/pdf-export-reports';
import { CostBreakdownReport } from '@/components/reports/CostBreakdownReport';
import { PeriodComparisonCard } from '@/components/reports/PeriodComparisonCard';

export default function Relatorios() {
  const { canViewReports } = useFinancialPermissions();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const { hasAccess: canExportPdf, requireFeature: requirePdfExport, UpgradeAlertComponent } = useFeatureGate('exportPdf');
  const { hasAccess: canExportExcel, requireFeature: requireExcelExport } = useFeatureGate('exportExcel');

  const [periodType, setPeriodType] = useState<PeriodType>('6M');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

  const { formatCurrency: formatCurrencyFull } = useFormatCurrency();
  const formatCurrency = (value: number) => formatCurrencyFull(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const dateRange = useDateRange(periodType, customDateRange);
  const monthlyData = useMonthlyData(projects, dateRange);
  const topClients = useTopClients(projects);
  const summaryMetrics = useSummaryMetrics(projects, clients);
  const { projectsByStatus, projectsByPriority } = useProjectDistribution(projects);

  const deliveredProjectIds = useMemo(() => projects.filter(p => p.is_delivered).map(p => p.id), [projects]);
  const { collaboratorsData, collaboratorsLoading, collaboratorsError } = useCollaboratorRanking({
    workspaceId: currentWorkspace?.id,
    deliveredProjectIds,
  });

  if (!canViewReports) {
    return <AccessDenied description="Apenas administradores podem aceder aos Relatórios financeiros." />;
  }

  // Cost breakdown data for Excel export
  const [costBreakdownData, setCostBreakdownData] = useState<{ category: string; estimated: number; actual: number; variance: number }[]>([]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const fetchCosts = async () => {
      const { data } = await supabase
        .from('project_cost_lines')
        .select('category, estimated_amount, actual_amount')
        .eq('workspace_id', currentWorkspace.id);
      if (data) {
        const grouped: Record<string, { estimated: number; actual: number }> = {};
        data.forEach((line: any) => {
          const cat = line.category || 'outro';
          if (!grouped[cat]) grouped[cat] = { estimated: 0, actual: 0 };
          grouped[cat].estimated += line.estimated_amount || 0;
          grouped[cat].actual += line.actual_amount || 0;
        });
        setCostBreakdownData(Object.entries(grouped).map(([category, vals]) => ({
          category,
          estimated: vals.estimated,
          actual: vals.actual,
          variance: vals.actual - vals.estimated,
        })));
      }
    };
    fetchCosts();
  }, [currentWorkspace?.id]);

  // Export functions
  const handleExportExcel = async () => {
    const { exportFinancialExcel } = await import('@/lib/excel-export-financial');
    await exportFinancialExcel({
      workspaceName: currentWorkspace?.name || 'WillFlow',
      dateRange,
      monthlyData,
      topClients,
      collaborators: collaboratorsData,
      costBreakdown: costBreakdownData.length > 0 ? costBreakdownData : undefined,
      summary: summaryMetrics,
    });
  };

  const handleExportPDF = () => {
    const html = generateReportPdfHtml({
      workspaceName: currentWorkspace?.name || 'WillFlow',
      dateRange,
      monthlyData,
      topClients,
      collaboratorsData,
      formatCurrency,
    });
    printReportPdf(html);
  };

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
          action={{ label: 'Criar projeto', onClick: () => navigate('/app/captacao'), icon: FolderKanban }}
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
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            {(['1M', '3M', '6M', '12M', 'YTD'] as PeriodType[]).map((p) => (
              <Button
                key={p}
                variant={periodType === p ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-8 px-3", periodType === p && "bg-primary text-primary-foreground")}
                onClick={() => setPeriodType(p)}
              >
                {p === 'YTD' ? 'YTD' : p}
              </Button>
            ))}
          </div>
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
                  : 'Personalizado'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={{ from: customDateRange.from, to: customDateRange.to }}
                onSelect={(range) => {
                  setCustomDateRange({ from: range?.from, to: range?.to });
                  if (range?.from && range?.to) setPeriodType('custom');
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {canExportExcel ? (
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8">
              <FileSpreadsheet className="h-4 w-4 mr-2" />Excel
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => requireExcelExport(handleExportExcel)} className="h-8 gap-2">
                    <Lock className="h-4 w-4" /><Crown className="h-3 w-3 text-primary" />Excel
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Disponível no plano Pro</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canExportPdf ? (
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-8">
              <FileText className="h-4 w-4 mr-2" />PDF
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => requirePdfExport(handleExportPDF)} className="h-8 gap-2">
                    <Lock className="h-4 w-4" /><Crown className="h-3 w-3 text-primary" />PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Disponível no plano Pro</p></TooltipContent>
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
            <Badge variant="secondary" className="mt-1">{summaryMetrics.margin.toFixed(1)}% margem</Badge>
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

      {/* Financial Evolution Chart */}
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
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => monthlyData.find(m => m.month === label)?.fullMonth || label}
                />
                <Legend />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--success))" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" />
                <Area type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorLucro)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Receita</p>
              <p className="text-lg font-bold text-success">{formatCurrency(monthlyData.reduce((s, m) => s + m.receita, 0))}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Custos</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(monthlyData.reduce((s, m) => s + m.custos, 0))}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Lucro</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(monthlyData.reduce((s, m) => s + m.lucro, 0))}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Projetos Entregues</p>
              <p className="text-lg font-bold">{monthlyData.reduce((s, m) => s + m.projetos, 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue vs Costs */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Receita, Custos e Lucro por Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => formatCurrency(value)} />
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
          <CardHeader className="pb-2"><CardTitle className="text-base">Tendência do Lucro</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown by Category */}
      <CostBreakdownReport />

      {/* Period Comparison */}
      <PeriodComparisonCard projects={projects} />

      {/* Rankings */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Clients */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-success" />Top 10 Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum dado de clientes disponível</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((client, index) => (
                  <motion.div key={client.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/10 text-success font-bold text-xs">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <span className="font-bold text-success text-sm ml-2">{formatCurrency(client.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{client.projects} projeto(s)</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-success rounded-full" style={{ width: `${(client.revenue / (topClients[0]?.revenue || 1)) * 100}%` }} />
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
            <CardTitle className="flex items-center gap-2 text-base"><UserCircle className="h-4 w-4 text-primary" />Top 10 Colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            {collaboratorsLoading ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
            ) : collaboratorsError ? (
              <p className="text-center text-destructive py-8">{collaboratorsError}</p>
            ) : collaboratorsData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum dado de colaboradores disponível</p>
            ) : (
              <div className="space-y-3">
                {collaboratorsData.map((collab, index) => (
                  <motion.div key={collab.userId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">{index + 1}</div>
                    <Avatar className="h-[30px] w-[30px]">
                      <AvatarImage src={collab.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">{collab.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm truncate">{collab.name}</p>
                          {collab.isExternal && <Badge variant="outline" className="text-[10px] px-1 py-0">Ext</Badge>}
                        </div>
                        <span className="font-bold text-primary text-sm ml-2">{formatCurrency(collab.totalValue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{collab.projectCount} projeto{collab.projectCount !== 1 ? 's' : ''} finalizado{collab.projectCount !== 1 ? 's' : ''}</span>
                        <div className="flex gap-1">
                          {collab.phases.includes('captacao') && <Badge variant="secondary" className="text-[9px] px-1 py-0">CAP</Badge>}
                          {collab.phases.includes('edicao') && <Badge variant="secondary" className="text-[9px] px-1 py-0">EDI</Badge>}
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
            <CardTitle className="flex items-center gap-2 text-base"><FolderKanban className="h-4 w-4 text-warning" />Distribuição de Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projectsByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {projectsByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {projectsByStatus.map((status) => (
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

      {/* Monthly Details */}
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

      {/* Kanban Metrics */}
      <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
        <Card className="glass-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />Métricas de Kanban
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Performance</Badge>
                  {metricsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0"><KanbanMetrics /></CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
