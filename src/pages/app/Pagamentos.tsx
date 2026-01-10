import { useState, useMemo, useEffect } from 'react';
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
  Users,
  Package,
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
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { supabase } from '@/integrations/supabase/client';
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

interface ProjectTeamPayment {
  id: string;
  project_id: string;
  user_id: string;
  phase: 'captacao' | 'edicao';
  payment_amount: number | null;
  payment_status: string;
}

interface ProjectCustoExtra {
  id: string;
  name: string;
  custos_extras: number | null;
  custos_extras_payment_status: string | null;
}

export default function Pagamentos() {
  const { payments, loading, summaries } = usePayments();
  const { projects } = useProjects();
  const { currentWorkspace } = useWorkspace();
  const { members } = useWorkspaceMembers();
  const [activeTab, setActiveTab] = useState('previsao');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  
  // Data for collaborator and extra costs
  const [teamPayments, setTeamPayments] = useState<ProjectTeamPayment[]>([]);
  const [projectCosts, setProjectCosts] = useState<ProjectCustoExtra[]>([]);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Fetch collaborator payments and project extra costs
  useEffect(() => {
    const fetchAdditionalData = async () => {
      if (!currentWorkspace?.id) return;
      
      // Fetch team payments that are not paid
      const { data: teamData } = await supabase
        .from('project_team')
        .select('id, project_id, user_id, phase, payment_amount, payment_status')
        .in('payment_status', ['pendente', 'vencido']);
      
      if (teamData) {
        // Filter to only workspace projects
        const projectIds = projects.map(p => p.id);
        const filteredTeamData = teamData.filter(t => projectIds.includes(t.project_id));
        setTeamPayments(filteredTeamData as ProjectTeamPayment[]);
      }
      
      // Fetch projects with pending extra costs
      const { data: costsData } = await supabase
        .from('projects')
        .select('id, name, custos_extras, custos_extras_payment_status')
        .eq('workspace_id', currentWorkspace.id)
        .gt('custos_extras', 0)
        .in('custos_extras_payment_status', ['pendente', 'vencido', null]);
      
      if (costsData) {
        setProjectCosts(costsData as ProjectCustoExtra[]);
      }
    };
    
    fetchAdditionalData();
  }, [currentWorkspace?.id, projects]);

  // Get member name
  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.full_name || 'Colaborador';
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

  // Calculate monthly forecasts including collaborators and extra costs
  const monthlyForecast = useMemo(() => {
    const receivable = monthPayments.filter(p => p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0);
    const payable = monthPayments.filter(p => !p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0);
    
    // Team payments by phase
    const teamCaptacao = teamPayments
      .filter(tp => tp.phase === 'captacao' && tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    
    const teamEdicao = teamPayments
      .filter(tp => tp.phase === 'edicao' && tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    
    const teamTotal = teamCaptacao + teamEdicao;
    
    // Extra costs
    const custosExtras = projectCosts
      .filter(p => p.custos_extras_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.custos_extras || 0), 0);
    
    const totalPayable = payable + teamTotal + custosExtras;
    
    return { 
      receivable, 
      payable, 
      teamTotal,
      teamCaptacao,
      teamEdicao,
      custosExtras,
      totalPayable,
      net: receivable - totalPayable 
    };
  }, [monthPayments, teamPayments, projectCosts]);

  // Calculate total payable including team and extra costs for summary
  const totalPayableWithExtras = useMemo(() => {
    const basePayable = summaries.totalPayable;
    
    const teamTotal = teamPayments
      .filter(tp => tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    
    const custosExtras = projectCosts
      .filter(p => p.custos_extras_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.custos_extras || 0), 0);
    
    return basePayable + teamTotal + custosExtras;
  }, [summaries.totalPayable, teamPayments, projectCosts]);

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
            <p className="text-xs text-muted-foreground/70">Total pendente</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{formatCurrency(totalPayableWithExtras)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">A Pagar</p>
            <p className="text-xs text-muted-foreground/70">Colaboradores + Custos</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{formatCurrency(summaries.totalReceived)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Recebido</p>
            <p className="text-xs text-muted-foreground/70">Total recebido</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{summaries.overdue}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Vencidos</p>
            <p className="text-xs text-muted-foreground/70">Pagamentos atrasados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="previsao">Previsão</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
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
                <p className="text-xs text-muted-foreground/70 mt-1">Pagamentos de clientes</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-destructive/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Previsão de Saída</p>
                <p className="text-3xl font-bold text-destructive">{formatCurrency(monthlyForecast.totalPayable)}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Colaboradores + Custos</p>
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

          {/* Breakdown of Payable */}
          {(monthlyForecast.teamTotal > 0 || monthlyForecast.custosExtras > 0) && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Detalhes de Saídas Previstas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Collaborator Payments */}
                {monthlyForecast.teamTotal > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">A Pagar Colaboradores</span>
                      </div>
                      <span className="font-bold text-destructive">{formatCurrency(monthlyForecast.teamTotal)}</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Captação</span>
                        <span>{formatCurrency(monthlyForecast.teamCaptacao)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Edição</span>
                        <span>{formatCurrency(monthlyForecast.teamEdicao)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Extra Costs */}
                {monthlyForecast.custosExtras > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Custos Extras</span>
                    </div>
                    <span className="font-bold text-destructive">{formatCurrency(monthlyForecast.custosExtras)}</span>
                  </div>
                )}
                
                {/* Other payments */}
                {monthlyForecast.payable > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Outros Pagamentos</span>
                    </div>
                    <span className="font-bold text-destructive">{formatCurrency(monthlyForecast.payable)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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

        {/* Pagamentos Tab */}
        <TabsContent value="pagamentos" className="space-y-6">
          {/* Controle de Pagamentos - Clientes */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Controle de Pagamentos - Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.filter(p => p.is_receivable).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum pagamento de cliente registado
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
                    {payments.filter(p => p.is_receivable).map(payment => (
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
                            onValueChange={async (newStatus) => {
                              await supabase
                                .from('payments')
                                .update({ 
                                  status: newStatus as 'pendente' | 'pago' | 'vencido' | 'cancelado',
                                  paid_at: newStatus === 'pago' ? new Date().toISOString() : null
                                })
                                .eq('id', payment.id);
                              window.location.reload();
                            }}
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

          {/* Controle de Pagamentos - Freelancers */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-destructive" />
                Controle de Pagamentos - Freelancers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum pagamento a freelancer pendente
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Freelancer</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamPayments.map(tp => {
                      const project = projects.find(p => p.id === tp.project_id);
                      return (
                        <TableRow key={tp.id}>
                          <TableCell className="font-medium">
                            {project?.name || 'Projeto'}
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
                            onValueChange={async (newStatus) => {
                                await supabase
                                  .from('project_team')
                                  .update({ payment_status: newStatus as 'pendente' | 'pago' | 'vencido' | 'cancelado' })
                                  .eq('id', tp.id);
                                window.location.reload();
                              }}
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
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
