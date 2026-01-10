import { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
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
}

interface Member {
  user_id: string;
  full_name: string | null;
}

interface FreelancerPaymentsControlProps {
  teamPayments: ProjectTeamPayment[];
  projects: Project[];
  members: Member[];
  onStatusChange: (teamId: string, newStatus: string) => Promise<void>;
  formatCurrency: (value: number) => string;
}

export function FreelancerPaymentsControl({
  teamPayments,
  projects,
  members,
  onStatusChange,
  formatCurrency,
}: FreelancerPaymentsControlProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    clientId: null,
    memberId: null,
    status: null,
  });

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

  const filteredPayments = useMemo(() => {
    return teamPayments.filter(tp => {
      if (filters.memberId && tp.user_id !== filters.memberId) return false;
      if (filters.status && tp.payment_status !== filters.status) return false;
      return true;
    });
  }, [teamPayments, filters]);

  const totalPending = useMemo(() => {
    return filteredPayments
      .filter(tp => tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
  }, [filteredPayments]);

  const exportData = useMemo(() => {
    return filteredPayments.map(tp => ({
      id: getProjectCode(tp.project_id),
      projeto: getProjectName(tp.project_id),
      contraparte: getMemberName(tp.user_id),
      fase: tp.phase === 'captacao' ? 'Captação' : 'Edição',
      status: statusLabels[tp.payment_status] || tp.payment_status,
      valor: formatCurrency(tp.payment_amount || 0),
    }));
  }, [filteredPayments, formatCurrency, projects]);

  return (
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
            />
            <PaymentExportButtons
              data={exportData}
              filename="pagamentos-colaboradores"
              type="freelancers"
            />
          </div>
        </div>
        {totalPending > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            Total pendente: <span className="font-semibold text-destructive">{formatCurrency(totalPending)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredPayments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum pagamento a colaborador encontrado
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map(tp => (
                <TableRow key={tp.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {getProjectCode(tp.project_id)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getProjectName(tp.project_id)}
                  </TableCell>
                  <TableCell>
                    {getMemberName(tp.user_id)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={tp.phase === 'captacao' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}>
                      {tp.phase === 'captacao' ? 'Captação' : 'Edição'}
                    </Badge>
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
                  <TableCell className="text-right font-medium text-destructive">
                    -{formatCurrency(tp.payment_amount || 0)}
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
