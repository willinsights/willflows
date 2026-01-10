import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import type { PaymentWithDetails } from '@/hooks/usePayments';

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

interface ClientPaymentsControlProps {
  payments: PaymentWithDetails[];
  clients: Client[];
  onStatusChange: (paymentId: string, newStatus: string) => Promise<void>;
  formatCurrency: (value: number) => string;
}

export function ClientPaymentsControl({
  payments,
  clients,
  onStatusChange,
  formatCurrency,
}: ClientPaymentsControlProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    clientId: null,
    memberId: null,
    status: null,
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
        if (new Date(payment.due_date) > filters.dateTo) return false;
      }
      if (filters.clientId && payment.client_id !== filters.clientId) return false;
      if (filters.status && payment.status !== filters.status) return false;
      return true;
    });
  }, [clientPayments, filters]);

  const exportData = useMemo(() => {
    return filteredPayments.map(payment => ({
      projeto: payment.description || payment.projects?.name || 'Pagamento',
      contraparte: payment.clients?.name || '-',
      vencimento: payment.due_date 
        ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt })
        : '-',
      status: statusLabels[payment.status] || payment.status,
      valor: formatCurrency(payment.amount),
    }));
  }, [filteredPayments, formatCurrency]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Controle de Pagamentos - Clientes
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
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
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPayments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum pagamento de cliente encontrado
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map(payment => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.description || payment.projects?.name || 'Pagamento'}
                  </TableCell>
                  <TableCell>
                    {payment.clients?.name || '-'}
                  </TableCell>
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
                  <TableCell className="text-right font-medium text-success">
                    +{formatCurrency(payment.amount)}
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
