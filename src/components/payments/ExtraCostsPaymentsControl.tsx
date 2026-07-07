import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentFilters, type FilterState } from './PaymentFilters';
import { PaymentExportButtons } from './PaymentExportButtons';
import { useHideValues } from '@/hooks/useHideValues';
import { paymentStatusLabels as statusLabels, paymentStatusColors as statusColors } from '@/lib/finance/constants';

export interface ProjectCustoExtra {
  id: string;
  name: string;
  project_code?: string | null;
  custos_extras: number | null;
  custos_extras_payment_status: string | null;
  client_id?: string | null;
  clients?: { name: string } | null;
  delivery_date?: string | null;
  delivered_at?: string | null;
}

interface ExtraCostsPaymentsControlProps {
  projectCosts: ProjectCustoExtra[];
  onStatusChange: (projectId: string, newStatus: string) => Promise<void>;
  formatCurrency: (value: number) => string;
  workspaceName?: string;
}

export function ExtraCostsPaymentsControl({
  projectCosts,
  onStatusChange,
  formatCurrency,
  workspaceName = 'WillFlow',
}: ExtraCostsPaymentsControlProps) {
  const { hideValues } = useHideValues();
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    clientId: null,
    memberId: null,
    status: null,
    dateFilterType: 'delivered_at',
    projectStatus: null,
  });

  const filteredCosts = useMemo(() => {
    return projectCosts.filter(cost => {
      // Filter by status
      if (filters.status && (cost.custos_extras_payment_status || 'pendente') !== filters.status) {
        return false;
      }
      // Project status filter
      if (filters.projectStatus === 'entregue' && !cost.delivered_at) return false;
      if (filters.projectStatus === 'em_curso' && cost.delivered_at) return false;
      // Date filter using actual delivery date as source of truth
      if (filters.dateFrom || filters.dateTo) {
        const dateValue = cost.delivered_at || cost.delivery_date;
        if (dateValue) {
          if (filters.dateFrom && new Date(dateValue) < filters.dateFrom) return false;
          if (filters.dateTo) {
            const endOfDay = new Date(filters.dateTo);
            endOfDay.setHours(23, 59, 59, 999);
            if (new Date(dateValue) > endOfDay) return false;
          }
        } else {
          return false;
        }
      }
      return true;
    });
  }, [projectCosts, filters]);

  const exportData = useMemo(() => {
    return filteredCosts.map(cost => ({
      id: cost.project_code || cost.id.slice(0, 8).toUpperCase(),
      projeto: cost.name,
      cliente: cost.clients?.name || '-',
      dataEntrega: cost.delivered_at
        ? format(new Date(cost.delivered_at), 'dd/MM/yyyy', { locale: pt })
        : cost.delivery_date
          ? format(new Date(cost.delivery_date), 'dd/MM/yyyy', { locale: pt })
          : '-',
      status: statusLabels[cost.custos_extras_payment_status || 'pendente'] || 'Pendente',
      valor: formatCurrency(cost.custos_extras || 0),
    }));
  }, [filteredCosts, formatCurrency]);

  const totalPending = useMemo(() => {
    return filteredCosts
      .filter(c => (c.custos_extras_payment_status || 'pendente') !== 'pago')
      .reduce((sum, c) => sum + (c.custos_extras || 0), 0);
  }, [filteredCosts]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-warning" />
            Custos Extras
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <PaymentFilters
              filters={filters}
              onFilterChange={setFilters}
              showClientFilter={false}
              showMemberFilter={false}
              showStatusFilter={true}
              showDateFilter={true}
              showProjectStatusFilter
            />
            <PaymentExportButtons
              data={exportData}
              filename="custos-extras"
              type="custos"
              workspaceName={workspaceName}
            />
          </div>
        </div>
        {totalPending > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            Total pendente: <span className={cn("font-semibold text-destructive", hideValues && "blur-md select-none")}>{formatCurrency(totalPending)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredCosts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum custo extra encontrado
          </p>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {filteredCosts.map((cost) => (
                <div key={cost.id} className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{cost.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {cost.clients?.name || '-'} · <span className="font-mono">{cost.project_code || cost.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className={cn('text-right font-semibold text-destructive shrink-0', hideValues && 'blur-md select-none')}>
                      {formatCurrency(cost.custos_extras || 0)}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Select
                      value={cost.custos_extras_payment_status || 'pendente'}
                      onValueChange={(value) => onStatusChange(cost.id, value)}
                    >
                      <SelectTrigger className={cn('h-8 w-[130px]', statusColors[cost.custos_extras_payment_status || 'pendente'])}>
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
                    <TableHead className="min-w-[130px]">Status</TableHead>
                    <TableHead className="text-right min-w-[100px]">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {cost.project_code || cost.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium">{cost.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cost.clients?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={cost.custos_extras_payment_status || 'pendente'}
                          onValueChange={(value) => onStatusChange(cost.id, value)}
                        >
                          <SelectTrigger className={cn('w-[130px]', statusColors[cost.custos_extras_payment_status || 'pendente'])}>
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
                        {formatCurrency(cost.custos_extras || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}
