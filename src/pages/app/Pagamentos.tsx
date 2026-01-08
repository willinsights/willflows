import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Plus,
  CreditCard,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
import { usePayments } from '@/hooks/usePayments';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspace } from '@/contexts/WorkspaceContext';
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

export default function Pagamentos() {
  const { payments, loading, summaries } = usePayments();
  const { projects } = useProjects();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState('previsao');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Filter payments for the current month view
  const monthPayments = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    return payments.filter(payment => {
      if (!payment.due_date) return false;
      const dueDate = new Date(payment.due_date);
      return isWithinInterval(dueDate, { start, end });
    });
  }, [payments, currentMonth]);

  // Calculate monthly forecasts
  const monthlyForecast = useMemo(() => {
    const receivable = monthPayments.filter(p => p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0);
    const payable = monthPayments.filter(p => !p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0);
    return { receivable, payable, net: receivable - payable };
  }, [monthPayments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      if (filterType === 'receivable' && !payment.is_receivable) return false;
      if (filterType === 'payable' && payment.is_receivable) return false;
      if (filterStatus !== 'all' && payment.status !== filterStatus) return false;
      return true;
    });
  }, [payments, filterType, filterStatus]);

  // Projects available for invoicing
  const invoiceableProjects = useMemo(() => {
    return projects.filter(p => p.agreed_value && p.agreed_value > 0);
  }, [projects]);

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectedTotal = useMemo(() => {
    return invoiceableProjects
      .filter(p => selectedProjects.includes(p.id))
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
  }, [invoiceableProjects, selectedProjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="text-muted-foreground">Controle de receitas e despesas</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold text-success">{formatCurrency(summaries.totalReceivable)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">A Receber</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{formatCurrency(summaries.totalPayable)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">A Pagar</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{formatCurrency(summaries.totalReceived)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Recebido</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{summaries.overdue}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Vencidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="previsao">Previsão</TabsTrigger>
          <TabsTrigger value="lista">Lista Completa</TabsTrigger>
          <TabsTrigger value="faturas">Exportar Faturas</TabsTrigger>
        </TabsList>

        {/* Previsão Tab */}
        <TabsContent value="previsao" className="space-y-6">
          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="min-w-[140px]">
              {format(currentMonth, 'MMMM yyyy', { locale: pt })}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Monthly Forecast */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="glass-card border-success/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Previsão de Entrada</p>
                <p className="text-3xl font-bold text-success">{formatCurrency(monthlyForecast.receivable)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-destructive/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Previsão de Saída</p>
                <p className="text-3xl font-bold text-destructive">{formatCurrency(monthlyForecast.payable)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-primary/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Saldo Previsto</p>
                <p className={cn('text-3xl font-bold', monthlyForecast.net >= 0 ? 'text-success' : 'text-destructive')}>
                  {formatCurrency(monthlyForecast.net)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Month Payments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Movimentos do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {monthPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum pagamento previsto para este mês
                </p>
              ) : (
                <div className="space-y-3">
                  {monthPayments.map(payment => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          payment.is_receivable ? 'bg-success/10' : 'bg-destructive/10'
                        )}>
                          {payment.is_receivable ? (
                            <TrendingUp className="h-5 w-5 text-success" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{payment.description || payment.projects?.name || 'Pagamento'}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.clients?.name || payment.freelancer_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn(statusColors[payment.status])}>
                          {statusLabels[payment.status]}
                        </Badge>
                        <span className={cn(
                          'font-medium',
                          payment.is_receivable ? 'text-success' : 'text-destructive'
                        )}>
                          {payment.is_receivable ? '+' : '-'}{formatCurrency(payment.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lista Completa Tab */}
        <TabsContent value="lista" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receivable">A Receber</SelectItem>
                <SelectItem value="payable">A Pagar</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payments Table */}
          <Card className="glass-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente/Fornecedor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum pagamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.description || payment.projects?.name || 'Pagamento'}
                      </TableCell>
                      <TableCell>
                        {payment.clients?.name || payment.freelancer_name || '-'}
                      </TableCell>
                      <TableCell>
                        {payment.due_date
                          ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(statusColors[payment.status])}>
                          {statusLabels[payment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(
                        'text-right font-medium',
                        payment.is_receivable ? 'text-success' : 'text-destructive'
                      )}>
                        {payment.is_receivable ? '+' : '-'}{formatCurrency(payment.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Faturas Tab */}
        <TabsContent value="faturas" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Selecionar Projetos para Faturação</CardTitle>
            </CardHeader>
            <CardContent>
              {invoiceableProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum projeto com valor definido para faturar
                </p>
              ) : (
                <div className="space-y-2">
                  {invoiceableProjects.map(project => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                        />
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.project_code || project.id.slice(0, 8)} • {project.clients?.name || 'Sem cliente'}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium">{formatCurrency(project.agreed_value || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Actions */}
          {selectedProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card border-primary/20">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{selectedProjects.length} projeto(s) selecionado(s)</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(selectedTotal)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Exportar Excel
                      </Button>
                      <Button className="gradient-primary">
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
