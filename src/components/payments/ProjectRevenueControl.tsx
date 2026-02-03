import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TrendingUp, Euro } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/ui/list-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaymentFilters, FilterState } from './PaymentFilters';
import { PaymentExportButtons } from './PaymentExportButtons';
import { cn } from '@/lib/utils';
import { useHideValues } from '@/hooks/useHideValues';

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/10 text-warning border-warning/20',
  pago: 'bg-success/10 text-success border-success/20',
  vencido: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelado: 'bg-muted text-muted-foreground',
};

interface Client {
  id: string;
  name: string;
}

export interface ProjectRevenue {
  id: string;
  name: string;
  project_code: string | null;
  agreed_value: number | null;
  client_payment_status: string | null;
  client_payment_due_date: string | null;
  client_id: string | null;
  delivery_date: string | null;
  clients: { name: string } | null;
}

interface ProjectRevenueControlProps {
  projects: ProjectRevenue[];
  clients: Client[];
  onStatusChange: (projectId: string, newStatus: string) => Promise<void>;
  formatCurrency: (value: number) => string;
  workspaceName?: string;
}

export function ProjectRevenueControl({
  projects,
  clients,
  onStatusChange,
  formatCurrency,
  workspaceName = 'WillFlow',
}: ProjectRevenueControlProps) {
  const { hideValues } = useHideValues();
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    clientId: null,
    memberId: null,
    status: null,
  });

  // Only projects with agreed_value > 0
  const revenueProjects = useMemo(() => {
    return projects.filter(p => p.agreed_value && p.agreed_value > 0);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return revenueProjects.filter(project => {
      // Date filter uses delivery_date or client_payment_due_date
      const dateToCheck = project.client_payment_due_date || project.delivery_date;
      if (filters.dateFrom && dateToCheck) {
        if (new Date(dateToCheck) < filters.dateFrom) return false;
      }
      if (filters.dateTo && dateToCheck) {
        if (new Date(dateToCheck) > filters.dateTo) return false;
      }
      if (filters.clientId && project.client_id !== filters.clientId) return false;
      if (filters.status && project.client_payment_status !== filters.status) return false;
      return true;
    });
  }, [revenueProjects, filters]);

  // Pagination
  const pagination = usePagination({
    items: filteredProjects,
    itemsPerPage: 50,
  });

  const totalPending = useMemo(() => {
    return filteredProjects
      .filter(p => p.client_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
  }, [filteredProjects]);

  const totalReceived = useMemo(() => {
    return filteredProjects
      .filter(p => p.client_payment_status === 'pago')
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
  }, [filteredProjects]);

  const exportData = useMemo(() => {
    return filteredProjects.map(project => ({
      id: project.project_code || project.id.slice(0, 8).toUpperCase(),
      projeto: project.name,
      contraparte: project.clients?.name || '-',
      vencimento: project.client_payment_due_date 
        ? format(new Date(project.client_payment_due_date), 'dd/MM/yyyy', { locale: pt })
        : project.delivery_date 
          ? format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })
          : '-',
      status: statusLabels[project.client_payment_status || 'pendente'],
      valor: formatCurrency(project.agreed_value || 0),
    }));
  }, [filteredProjects, formatCurrency]);

  const getProjectCode = (project: ProjectRevenue) => {
    return project.project_code || project.id.slice(0, 8).toUpperCase();
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Euro className="h-5 w-5 text-success" />
            Receita de Projetos (Preço Cliente)
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <PaymentFilters
              filters={filters}
              onFilterChange={setFilters}
              clients={clients}
              showClientFilter
              showStatusFilter
            />
            <PaymentExportButtons
              data={exportData}
              filename="receita-clientes"
              type="clients"
              workspaceName={workspaceName}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            Total pendente: <span className={cn("font-semibold text-warning", hideValues && "blur-md select-none")}>{formatCurrency(totalPending)}</span>
          </span>
          <span>
            Total recebido: <span className={cn("font-semibold text-success", hideValues && "blur-md select-none")}>{formatCurrency(totalReceived)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {pagination.totalItems === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhum projeto com Preço Cliente definido
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Adicione um valor em "Preço Cliente" nos seus projetos para visualizar a receita aqui.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] min-w-[80px]">ID</TableHead>
                  <TableHead className="min-w-[150px]">Projeto</TableHead>
                  <TableHead className="min-w-[120px]">Cliente</TableHead>
                  <TableHead className="min-w-[100px]">Data Entrega</TableHead>
                  <TableHead className="min-w-[130px]">Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Preço Cliente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map(project => (
                  <TableRow key={project.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {getProjectCode(project)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>{project.clients?.name || '-'}</TableCell>
                    <TableCell>
                      {project.client_payment_due_date
                        ? format(new Date(project.client_payment_due_date), 'dd/MM/yyyy', { locale: pt })
                        : project.delivery_date
                          ? format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })
                          : '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={project.client_payment_status || 'pendente'}
                        onValueChange={(newStatus) => onStatusChange(project.id, newStatus)}
                      >
                        <SelectTrigger className={cn('w-[130px]', statusColors[project.client_payment_status || 'pendente'])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn("text-right font-medium text-success", hideValues && "blur-md select-none")}>
                      +{formatCurrency(project.agreed_value || 0)}
                    </TableCell>
                  </TableRow>
                ))}
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
  );
}
