import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
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
import type { PaymentWithDetails } from '@/hooks/usePayments';
import { paymentStatusLabels as statusLabels, paymentStatusColors as statusColors } from '@/lib/finance/constants';

interface Client {
  id: string;
  name: string;
}

interface ClientPaymentsControlProps {
  payments: PaymentWithDetails[];
  clients: Client[];
  onStatusChange: (paymentId: string, newStatus: string) => Promise<void>;
  formatCurrency: (value: number) => string;
  projects?: { id: string; name: string; project_code: string | null }[];
  workspaceName?: string;
}

export function ClientPaymentsControl({
  payments,
  clients,
  onStatusChange,
  formatCurrency,
  projects = [],
  workspaceName = 'WillFlow',
}: ClientPaymentsControlProps) {
  const { hideValues } = useHideValues();
  const { formatCurrencyRaw } = useFormatCurrency();
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    clientId: null,
    memberId: null,
    status: null,
    dateFilterType: 'delivered_at',
    projectStatus: null,
  });

  const clientPayments = useMemo(() => {
    return payments.filter(p => p.is_receivable);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return clientPayments.filter(payment => {
      if (filters.dateFrom && payment.due_date) {
        if (new Date(payment.due_date) < filters.dateFrom) return false;
      }
      if (filters.dateTo && payment.due_date) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (new Date(payment.due_date) > endOfDay) return false;
      }
      if (filters.clientId && payment.client_id !== filters.clientId) return false;
      if (filters.status && payment.status !== filters.status) return false;
      return true;
    });
  }, [clientPayments, filters]);

  // Pagination
  const pagination = usePagination({
    items: filteredPayments,
    itemsPerPage: 50,
  });

  const totalPending = useMemo(() => {
    return filteredPayments
      .filter(p => p.status !== 'pago')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const getProjectCode = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.project_code || projectId.slice(0, 8).toUpperCase();
  };

  const exportData = useMemo(() => {
    return filteredPayments.map(payment => {
      const proj = projects.find(p => p.id === payment.project_id);
      const deliveryDate = (proj as any)?.delivered_at || (proj as any)?.delivery_date;
      return {
        id: getProjectCode(payment.project_id) || '-',
        projeto: payment.description || payment.projects?.name || 'Pagamento',
        contraparte: payment.clients?.name || '-',
        dataEntrega: deliveryDate
          ? format(new Date(deliveryDate), 'dd/MM/yyyy', { locale: pt })
          : '-',
        vencimento: payment.due_date 
          ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt })
          : '-',
        status: statusLabels[payment.status] || payment.status,
        valor: formatCurrencyRaw(payment.amount),
      };
    });
  }, [filteredPayments, formatCurrency, projects]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Pagamentos Clientes
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
              filename="pagamentos-clientes"
              type="clients"
              workspaceName={workspaceName}
            />
          </div>
        </div>
        {totalPending > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            Total pendente: <span className={cn("font-semibold text-success", hideValues && "blur-md select-none")}>{formatCurrency(totalPending)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {pagination.totalItems === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum pagamento de cliente encontrado
          </p>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {pagination.paginatedItems.map(payment => (
                <div key={payment.id} className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{payment.description || payment.projects?.name || 'Pagamento'}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {payment.clients?.name || '-'} · <span className="font-mono">{getProjectCode(payment.project_id) || '-'}</span>
                      </div>
                    </div>
                    <div className={cn('text-right font-semibold text-success shrink-0', hideValues && 'blur-md select-none')}>
                      +{formatCurrency(payment.amount)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-xs text-muted-foreground">
                      {payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt }) : 'Sem data'}
                    </div>
                    <Select
                      value={payment.status}
                      onValueChange={(newStatus) => onStatusChange(payment.id, newStatus)}
                    >
                      <SelectTrigger className={cn('h-8 w-[130px]', statusColors[payment.status])}>
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
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] min-w-[80px]">ID</TableHead>
                    <TableHead className="min-w-[150px]">Projeto</TableHead>
                    <TableHead className="min-w-[120px]">Cliente</TableHead>
                    <TableHead className="min-w-[100px]">Vencimento</TableHead>
                    <TableHead className="min-w-[130px]">Status</TableHead>
                    <TableHead className="text-right min-w-[100px]">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {getProjectCode(payment.project_id) || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.description || payment.projects?.name || 'Pagamento'}
                      </TableCell>
                      <TableCell>{payment.clients?.name || '-'}</TableCell>
                      <TableCell>
                        {payment.due_date
                          ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={payment.status}
                          onValueChange={(newStatus) => onStatusChange(payment.id, newStatus)}
                        >
                          <SelectTrigger className={cn('w-[130px]', statusColors[payment.status])}>
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
                      <TableCell className={cn('text-right font-medium text-success', hideValues && 'blur-md select-none')}>
                        +{formatCurrency(payment.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
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
