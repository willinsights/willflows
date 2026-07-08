import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { format } from 'date-fns';
import { paymentStatusLabels as statusLabels, paymentStatusColors as statusColors } from '@/lib/finance/constants';

export interface ProjectTeamPayment {
  id: string;
  project_id: string;
  user_id: string;
  phase: 'captacao' | 'edicao';
  payment_amount: number | null;
  payment_status: string;
}

interface Project {
  id: string;
  name: string;
  project_code?: string | null;
  client_id?: string | null;
  delivery_date?: string | null;
  delivered_at?: string | null;
  is_delivered?: boolean;
  created_at?: string;
}

interface Client {
  id: string;
  name: string;
}

interface Member {
  user_id: string;
  full_name: string | null;
}

interface FreelancerPaymentsControlProps {
  teamPayments: ProjectTeamPayment[];
  projects: Project[];
  members: Member[];
  clients?: Client[];
  onStatusChange: (teamId: string, newStatus: string) => Promise<void>;
  formatCurrency: (value: number) => string;
  workspaceName?: string;
  /** If true, only show payments for this specific user ID */
  filterByUserId?: string | null;
}

export function FreelancerPaymentsControl({
  teamPayments,
  projects,
  members,
  clients,
  onStatusChange,
  formatCurrency,
  workspaceName = 'WillFlow',
  filterByUserId,
}: FreelancerPaymentsControlProps) {
  const { hideValues } = useHideValues();
  const { formatCurrencyRaw } = useFormatCurrency();
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    clientId: null,
    memberId: null,
    status: null,
    projectStatus: null,
    dateFilterType: 'delivered_at',
  });
  
  // REGRA CENTRAL: Apenas projetos entregues aparecem no financeiro
  const deliveredTeamPayments = useMemo(() => {
    return teamPayments.filter(tp => {
      const project = projects.find(p => p.id === tp.project_id);
      return project?.is_delivered === true;
    });
  }, [teamPayments, projects]);

  // If filterByUserId is provided, filter to only that user's payments
  const baseTeamPayments = useMemo(() => {
    if (filterByUserId) {
      return deliveredTeamPayments.filter(tp => tp.user_id === filterByUserId);
    }
    return deliveredTeamPayments;
  }, [deliveredTeamPayments, filterByUserId]);

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.full_name || 'Colaborador';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Projeto';
  };

  const getProjectCode = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.project_code || projectId.slice(0, 8).toUpperCase();
  };

  const getClientName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project?.client_id || !clients) return '-';
    const client = clients.find(c => c.id === project.client_id);
    return client?.name || '-';
  };

  const getProjectDeliveredAt = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.delivered_at;
  };

  const filteredPayments = useMemo(() => {
    return baseTeamPayments.filter(tp => {
      if (filters.memberId && tp.user_id !== filters.memberId) return false;
      if (filters.status && tp.payment_status !== filters.status) return false;
      
      // Date filter based on selected type
      if (filters.dateFrom || filters.dateTo) {
        const project = projects.find(p => p.id === tp.project_id);
        const dateValue = filters.dateFilterType === 'delivered_at'
          ? project?.delivered_at
          : project?.created_at;
        
        if (!dateValue) return false;
        
        const date = new Date(dateValue);
        if (filters.dateFrom && date < filters.dateFrom) return false;
        if (filters.dateTo) {
          const endOfDay = new Date(filters.dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (date > endOfDay) return false;
        }
      }
      return true;
    });
  }, [baseTeamPayments, filters, projects]);

  // Sort by delivered_at descending
  const sortedPayments = useMemo(() => {
    return [...filteredPayments].sort((a, b) => {
      const projA = projects.find(p => p.id === a.project_id);
      const projB = projects.find(p => p.id === b.project_id);
      const dateA = projA?.delivered_at ? new Date(projA.delivered_at).getTime() : 0;
      const dateB = projB?.delivered_at ? new Date(projB.delivered_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredPayments, projects]);

  const pagination = usePagination({
    items: sortedPayments,
    itemsPerPage: 50,
  });

  const totalPending = useMemo(() => {
    return filteredPayments
      .filter(tp => tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
  }, [filteredPayments]);

  const totalPaid = useMemo(() => {
    return filteredPayments
      .filter(tp => tp.payment_status === 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
  }, [filteredPayments]);

  const exportData = useMemo(() => {
    // Group payments by project for export (one row per project)
    const grouped = new Map<string, typeof sortedPayments>();
    for (const tp of sortedPayments) {
      const existing = grouped.get(tp.project_id) || [];
      existing.push(tp);
      grouped.set(tp.project_id, existing);
    }

    return Array.from(grouped.entries()).map(([projectId, payments]) => {
      const deliveredAt = getProjectDeliveredAt(projectId);
      const colaboradores = payments
        .map(tp => `${getMemberName(tp.user_id)} (${formatCurrencyRaw(tp.payment_amount || 0)})`)
        .join(', ');
      const totalValor = payments.reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
      const allPaid = payments.every(tp => tp.payment_status === 'pago');
      const status = allPaid ? 'Pago' : 'Pendente';

      return {
        id: getProjectCode(projectId),
        projeto: getProjectName(projectId),
        cliente: getClientName(projectId),
        dataEntrega: deliveredAt ? format(new Date(deliveredAt), 'dd/MM/yyyy') : '-',
        colaboradores,
        status,
        valor: formatCurrencyRaw(totalValor),
      };
    });
  }, [sortedPayments, formatCurrency, projects, clients]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-destructive" />
            Pagamentos Colaboradores
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <PaymentFilters
              filters={filters}
              onFilterChange={setFilters}
              members={members}
              showMemberFilter
              showStatusFilter
              showDateFilter
              showDateFilterType
            />
            <PaymentExportButtons
              data={exportData}
              filename="pagamentos-colaboradores"
              type="freelancers"
              workspaceName={workspaceName}
            />
          </div>
        </div>
        {/* Summary bar */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Total pendente:</span>
            <span className={cn("font-semibold text-destructive", hideValues && "blur-md select-none")}>
              {formatCurrency(totalPending)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Total pago:</span>
            <span className={cn("font-semibold text-success", hideValues && "blur-md select-none")}>
              {formatCurrency(totalPaid)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Registos:</span>
            <span className="font-semibold">{filteredPayments.length}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pagination.totalItems === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum pagamento encontrado — apenas projetos entregues aparecem aqui.
          </p>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {pagination.paginatedItems.map(tp => {
                const deliveredAt = getProjectDeliveredAt(tp.project_id);
                return (
                  <div key={tp.id} className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{getProjectName(tp.project_id)}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {getMemberName(tp.user_id)} · {getClientName(tp.project_id)}
                        </div>
                      </div>
                      <div className={cn('text-right font-semibold text-destructive shrink-0', hideValues && 'blur-md select-none')}>
                        -{formatCurrency(tp.payment_amount || 0)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className={tp.phase === 'captacao' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}>
                          {tp.phase === 'captacao' ? 'Captação' : 'Edição'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {deliveredAt ? format(new Date(deliveredAt), 'dd/MM/yyyy') : 'Sem entrega'}
                        </span>
                      </div>
                      <Select
                        value={tp.payment_status}
                        onValueChange={(newStatus) => onStatusChange(tp.id, newStatus)}
                      >
                        <SelectTrigger className={cn('h-8 w-[130px]', statusColors[tp.payment_status] || statusColors.pendente)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px] min-w-[80px]">ID</TableHead>
                    <TableHead className="min-w-[150px]">Projeto</TableHead>
                    <TableHead className="min-w-[120px]">Cliente</TableHead>
                    <TableHead className="min-w-[120px]">Colaborador</TableHead>
                    <TableHead className="min-w-[90px]">Fase</TableHead>
                    <TableHead className="min-w-[100px]">Data Entrega</TableHead>
                    <TableHead className="min-w-[130px]">Status Pgto</TableHead>
                    <TableHead className="text-right min-w-[100px]">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map(tp => {
                    const deliveredAt = getProjectDeliveredAt(tp.project_id);
                    return (
                      <TableRow key={tp.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {getProjectCode(tp.project_id)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getProjectName(tp.project_id)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getClientName(tp.project_id)}
                        </TableCell>
                        <TableCell>
                          {getMemberName(tp.user_id)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tp.phase === 'captacao' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}>
                            {tp.phase === 'captacao' ? 'Captação' : 'Edição'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {deliveredAt ? format(new Date(deliveredAt), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={tp.payment_status}
                            onValueChange={(newStatus) => onStatusChange(tp.id, newStatus)}
                          >
                            <SelectTrigger className={cn('w-[130px]', statusColors[tp.payment_status] || statusColors.pendente)}>
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
                        <TableCell className={cn('text-right font-medium text-destructive', hideValues && 'blur-md select-none')}>
                          -{formatCurrency(tp.payment_amount || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            
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
    </motion.div>
  );
}
