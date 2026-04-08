import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/ui/list-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaymentFilters, FilterState } from './PaymentFilters';
import { PaymentExportButtons, type ExportData } from './PaymentExportButtons';
import { cn } from '@/lib/utils';
import { useHideValues } from '@/hooks/useHideValues';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { paymentStatusLabels as statusLabels, paymentStatusColors as statusColors } from '@/lib/finance/constants';

interface Client {
  id: string;
  name: string;
}

export interface ProjectProfit {
  id: string;
  name: string;
  project_code: string | null;
  agreed_value: number | null;
  custo_captacao: number | null;
  custo_edicao: number | null;
  custos_extras: number | null;
  client_payment_status: string | null;
  client_id: string | null;
  delivery_date: string | null;
  delivered_at: string | null;
  is_delivered: boolean;
  competence_month: string | null;
  clients: { name: string } | null;
}

interface ProfitControlProps {
  clients: Client[];
  formatCurrency: (value: number) => string;
  workspaceName?: string;
}

export function ProfitControl({
  clients,
  formatCurrency,
  workspaceName = 'WillFlow',
}: ProfitControlProps) {
  const { hideValues } = useHideValues();
  const { currentWorkspace } = useWorkspace();
  const [projects, setProjects] = useState<ProjectProfit[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    clientId: null,
    memberId: null,
    status: null,
    dateFilterType: 'delivered_at',
    projectStatus: null,
  });

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentWorkspace?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('projects')
        .select('id, name, project_code, agreed_value, custo_captacao, custo_edicao, custos_extras, client_payment_status, client_id, delivery_date, delivered_at, is_delivered, competence_month, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_delivered', true);

      if (data) {
        setProjects(data as ProjectProfit[]);
      }
      setLoading(false);
    };
    fetchProjects();
  }, [currentWorkspace?.id]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const dateToCheck = project.delivery_date || project.delivered_at;
      if (filters.dateFrom && dateToCheck) {
        if (new Date(dateToCheck) < filters.dateFrom) return false;
      }
      if (filters.dateTo && dateToCheck) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (new Date(dateToCheck) > endOfDay) return false;
      }
      if (filters.clientId && project.client_id !== filters.clientId) return false;
      if (filters.status && project.client_payment_status !== filters.status) return false;
      if (filters.projectStatus === 'entregue' && !project.delivered_at) return false;
      if (filters.projectStatus === 'em_curso' && project.delivered_at) return false;
      return true;
    });
  }, [projects, filters]);

  const pagination = usePagination({
    items: filteredProjects,
    itemsPerPage: 50,
  });

  const getCost = (p: ProjectProfit) =>
    (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);

  const getProfit = (p: ProjectProfit) =>
    (p.agreed_value || 0) - getCost(p);

  const getMargin = (p: ProjectProfit) => {
    const revenue = p.agreed_value || 0;
    if (revenue === 0) return 0;
    return Math.round((getProfit(p) / revenue) * 100);
  };

  const totals = useMemo(() => {
    const totalRevenue = filteredProjects.reduce((s, p) => s + (p.agreed_value || 0), 0);
    const totalCosts = filteredProjects.reduce((s, p) => s + getCost(p), 0);
    const totalProfit = totalRevenue - totalCosts;
    const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
    return { totalRevenue, totalCosts, totalProfit, avgMargin };
  }, [filteredProjects]);

  const exportData: ExportData[] = useMemo(() => {
    return filteredProjects.map(project => ({
      id: project.project_code || project.id.slice(0, 8).toUpperCase(),
      projeto: project.name,
      contraparte: project.clients?.name || '-',
      dataEntrega: project.delivered_at
        ? format(new Date(project.delivered_at), 'dd/MM/yyyy', { locale: pt })
        : project.delivery_date
          ? format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })
          : '-',
      vencimento: project.delivery_date
        ? format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })
        : project.delivered_at
          ? format(new Date(project.delivered_at), 'dd/MM/yyyy', { locale: pt })
          : '-',
      status: project.is_delivered ? 'Entregue' : 'Em Curso',
      valor: formatCurrency(getProfit(project)),
    }));
  }, [filteredProjects, formatCurrency]);

  // Custom export with more columns for lucro
  const exportLucroData = useMemo(() => {
    return filteredProjects.map(project => ({
      id: project.project_code || project.id.slice(0, 8).toUpperCase(),
      projeto: project.name,
      cliente: project.clients?.name || '-',
      estado: project.is_delivered ? 'Entregue' : 'Em Curso',
      statusPagamento: statusLabels[project.client_payment_status || 'pendente'],
      receita: formatCurrency(project.agreed_value || 0),
      custos: formatCurrency(getCost(project)),
      lucro: formatCurrency(getProfit(project)),
      margem: `${getMargin(project)}%`,
    }));
  }, [filteredProjects, formatCurrency]);

  const formatDeliveryDate = (p: any) => {
    const d = p.delivered_at || p.delivery_date;
    return d ? format(new Date(d), 'dd/MM/yyyy', { locale: pt }) : '-';
  };

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/excel-export');
    const headers = ['Código', 'Projeto', 'Cliente', 'Data Entrega', 'Estado', 'Pagamento', 'Receita', 'Custos', 'Lucro', 'Margem'];
    const data = filteredProjects.map(p => [
      p.project_code || p.id.slice(0, 8).toUpperCase(),
      p.name,
      p.clients?.name || '-',
      formatDeliveryDate(p),
      p.is_delivered ? 'Entregue' : 'Em Curso',
      statusLabels[p.client_payment_status || 'pendente'],
      p.agreed_value || 0,
      getCost(p),
      getProfit(p),
      `${getMargin(p)}%`,
    ]);
    await exportToExcel({
      title: 'Relatório de Lucro por Projeto',
      subtitle: workspaceName,
      headers,
      data,
      filename: `lucro-projetos-${format(new Date(), 'yyyy-MM-dd')}`,
    });
  };

  const handleExportPdf = () => {
    import('@/lib/pdf-export').then(({ generatePdfHtml, printPdf }) => {
      const headers = ['Código', 'Projeto', 'Cliente', 'Data Entrega', 'Estado', 'Receita', 'Custos', 'Lucro', 'Margem'];
      const tableRows = filteredProjects.map(p => ({
        cells: [
          p.project_code || p.id.slice(0, 8).toUpperCase(),
          p.name,
          p.clients?.name || '-',
          formatDeliveryDate(p),
          {
            value: `<span class="status-badge ${p.is_delivered ? 'status-pago' : 'status-pendente'}">${p.is_delivered ? 'Entregue' : 'Em Curso'}</span>`,
            className: '',
          },
          { value: formatCurrency(p.agreed_value || 0), className: 'positive' },
          { value: formatCurrency(getCost(p)), className: 'negative' },
          { value: formatCurrency(getProfit(p)), className: getProfit(p) >= 0 ? 'positive' : 'negative' },
          `${getMargin(p)}%`,
        ],
      }));

      const html = generatePdfHtml({
        title: 'Relatório de Lucro por Projeto',
        workspaceName,
        statsBar: [
          { label: 'Receita Total', value: formatCurrency(totals.totalRevenue), className: 'success' },
          { label: 'Custos Totais', value: formatCurrency(totals.totalCosts), className: 'destructive' },
          { label: 'Lucro Total', value: formatCurrency(totals.totalProfit), className: totals.totalProfit >= 0 ? 'success' : 'destructive' },
          { label: 'Margem Média', value: `${totals.avgMargin}%`, className: 'primary' },
        ],
        headers,
        data: tableRows,
        totalLabel: `Total: ${filteredProjects.length} projetos`,
      });

      printPdf(html);
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="h-3 w-16 bg-muted animate-pulse rounded mx-auto mb-2" />
                <div className="h-7 w-24 bg-muted animate-pulse rounded mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: formatCurrency(totals.totalRevenue), color: 'text-success', border: 'border-success/20' },
          { label: 'Custos Totais', value: formatCurrency(totals.totalCosts), color: 'text-destructive', border: 'border-destructive/20' },
          { label: 'Lucro Total', value: `${totals.totalProfit >= 0 ? '+' : ''}${formatCurrency(totals.totalProfit)}`, color: totals.totalProfit >= 0 ? 'text-success' : 'text-destructive', border: totals.totalProfit >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5' },
          { label: 'Margem Média', value: `${totals.avgMargin}%`, color: 'text-primary', border: 'border-primary/20' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
          >
            <Card className={cn("glass-card hover:shadow-md transition-shadow", card.border)}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className={cn("text-2xl font-bold", card.color, hideValues && "blur-md select-none")}>
                  {card.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Lucro por Projeto
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <PaymentFilters
                filters={filters}
                onFilterChange={setFilters}
                clients={clients}
                showClientFilter
                showStatusFilter
                showProjectStatusFilter
              />
              <div className="flex gap-2">
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                >
                  Excel
                </button>
                <button
                  onClick={handleExportPdf}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pagination.totalItems === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Nenhum projeto com receita definida
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead className="min-w-[150px]">Projeto</TableHead>
                    <TableHead className="min-w-[120px]">Cliente</TableHead>
                    <TableHead className="min-w-[80px]">Estado</TableHead>
                    <TableHead className="min-w-[90px]">Pagamento</TableHead>
                    <TableHead className="text-right min-w-[90px]">Receita</TableHead>
                    <TableHead className="text-right min-w-[90px]">Custos</TableHead>
                    <TableHead className="text-right min-w-[90px]">Lucro</TableHead>
                    <TableHead className="text-right min-w-[70px]">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map(project => {
                    const profit = getProfit(project);
                    const margin = getMargin(project);
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {project.project_code || project.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>{project.clients?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              project.is_delivered
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-warning/10 text-warning border-warning/20'
                            )}
                          >
                            {project.is_delivered ? 'Entregue' : 'Em Curso'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(statusColors[project.client_payment_status || 'pendente'])}>
                            {statusLabels[project.client_payment_status || 'pendente']}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-medium text-success", hideValues && "blur-md select-none")}>
                          {formatCurrency(project.agreed_value || 0)}
                        </TableCell>
                        <TableCell className={cn("text-right font-medium text-destructive", hideValues && "blur-md select-none")}>
                          {formatCurrency(getCost(project))}
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", profit >= 0 ? "text-success" : "text-destructive", hideValues && "blur-md select-none")}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", margin >= 30 ? "text-success" : margin >= 0 ? "text-warning" : "text-destructive", hideValues && "blur-md select-none")}>
                          {margin}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <ListPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
                onPageChange={pagination.goToPage}
                onNextPage={pagination.goToNextPage}
                onPreviousPage={pagination.goToPreviousPage}
                onFirstPage={pagination.goToFirstPage}
                onLastPage={pagination.goToLastPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
