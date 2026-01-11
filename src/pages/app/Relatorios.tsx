import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Award,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { usePayments } from '@/hooks/usePayments';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--destructive))'];

export default function Relatorios() {
  const { projects } = useProjects();
  const { clients } = useClients();
  const { payments } = usePayments();
  const { currentWorkspace } = useWorkspace();
  const [period, setPeriod] = useState('6');

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate monthly revenue data
  const monthlyData = useMemo(() => {
    const months = [];
    const periodMonths = parseInt(period);
    
    for (let i = periodMonths - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthProjects = projects.filter(p => {
        if (!p.created_at) return false;
        const created = new Date(p.created_at);
        return isWithinInterval(created, { start, end });
      });
      
      const revenue = monthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
      const costs = monthProjects.reduce((sum, p) => sum + (p.custo_captacao || 0) + (p.custo_edicao || 0), 0);
      
      months.push({
        month: format(date, 'MMM', { locale: pt }),
        receita: revenue,
        custos: costs,
        lucro: revenue - costs,
        projetos: monthProjects.length,
      });
    }
    
    return months;
  }, [projects, period]);

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
    const totalRevenue = projects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const totalCosts = projects.reduce((sum, p) => sum + (p.custo_captacao || 0) + (p.custo_edicao || 0), 0);
    const avgProjectValue = projects.length > 0 ? totalRevenue / projects.length : 0;
    
    return {
      totalRevenue,
      totalCosts,
      profit: totalRevenue - totalCosts,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100) : 0,
      avgProjectValue,
      totalProjects: projects.length,
      activeClients: clients.filter(c => c.is_active).length,
    };
  }, [projects, clients]);

  // Export functions
  const handleExportExcel = () => {
    // Prepare CSV data
    const headers = ['Mês', 'Receita', 'Custos', 'Lucro', 'Projetos'];
    const rows = monthlyData.map(m => [
      m.month,
      m.receita,
      m.custos,
      m.lucro,
      m.projetos,
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Add BOM for Excel to recognize UTF-8
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
    // For PDF, we'll create a printable version
    const printContent = `
      <html>
        <head>
          <title>Relatório Financeiro - ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt })}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .header { margin-bottom: 30px; }
            .summary { display: flex; gap: 20px; margin-bottom: 30px; }
            .summary-card { padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .summary-label { font-size: 12px; color: #666; }
            .summary-value { font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório Financeiro</h1>
            <p>Período: Últimos ${period} meses</p>
            <p>Gerado em: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt })}</p>
          </div>
          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Receita Total</div>
              <div class="summary-value">${formatCurrency(summaryMetrics.totalRevenue)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Lucro</div>
              <div class="summary-value">${formatCurrency(summaryMetrics.profit)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Margem</div>
              <div class="summary-value">${summaryMetrics.margin.toFixed(1)}%</div>
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
                <th>Projetos</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.map(m => `
                <tr>
                  <td>${m.month}</td>
                  <td>${formatCurrency(m.receita)}</td>
                  <td>${formatCurrency(m.custos)}</td>
                  <td>${formatCurrency(m.lucro)}</td>
                  <td>${m.projetos}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análises e métricas do seu negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
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

      {/* Charts */}
      <Tabs defaultValue="receita">
        <TabsList>
          <TabsTrigger value="receita">Evolução Financeira</TabsTrigger>
          <TabsTrigger value="clientes">Top Clientes</TabsTrigger>
          <TabsTrigger value="projetos">Projetos</TabsTrigger>
        </TabsList>

        {/* Receita Tab */}
        <TabsContent value="receita" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Receita e Lucro por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="custos" name="Custos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Evolução do Lucro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Clientes Tab */}
        <TabsContent value="clientes">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Top 10 Clientes por Receita</CardTitle>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado de clientes disponível
                </p>
              ) : (
                <div className="space-y-4">
                  {topClients.map((client, index) => (
                    <motion.div
                      key={client.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{client.name}</p>
                          <span className="font-bold text-success">{formatCurrency(client.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{client.projects} projeto(s)</span>
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
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
        </TabsContent>

        {/* Projetos Tab */}
        <TabsContent value="projetos" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Projetos por Fase</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {projectsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Projetos por Prioridade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectsByPriority} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
