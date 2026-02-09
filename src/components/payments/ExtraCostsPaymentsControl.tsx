import { useState, useMemo } from 'react';
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

export interface ProjectCustoExtra {
  id: string;
  name: string;
  project_code?: string | null;
  custos_extras: number | null;
  custos_extras_payment_status: string | null;
  client_id?: string | null;
  clients?: { name: string } | null;
  delivery_date?: string | null;
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
  });

  const filteredCosts = useMemo(() => {
    return projectCosts.filter(cost => {
      // Filter by status
      if (filters.status && (cost.custos_extras_payment_status || 'pendente') !== filters.status) {
        return false;
      }
      // Date filter using delivery_date
      if (filters.dateFrom || filters.dateTo) {
        const dateValue = cost.delivery_date;
        if (dateValue) {
          if (filters.dateFrom && new Date(dateValue) < filters.dateFrom) return false;
          if (filters.dateTo) {
            const endOfDay = new Date(filters.dateTo);
            endOfDay.setHours(23, 59, 59, 999);
            if (new Date(dateValue) > endOfDay) return false;
          }
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
                  <TableCell className={cn("text-right font-medium text-destructive", hideValues && "blur-md select-none")}>
                    {formatCurrency(cost.custos_extras || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
