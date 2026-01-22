import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Users, 
  Building2, 
  Euro, 
  TrendingUp, 
  Calendar, 
  Filter, 
  ArrowUpDown, 
  MoreVertical,
  Eye,
  Trash2,
  Lock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { ClientDetailsModal } from '@/components/clients/ClientDetailsModal';
import { cn } from '@/lib/utils';

export default function Clientes() {
  const { clients, loading, deleteClient, updateClient, refresh } = useClients();
  const { projects } = useProjects();
  const { currentWorkspace } = useWorkspace();
  const { canViewAllFinancials } = useFinancialPermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('receita');

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Calculate client stats
  const clientStats = useMemo(() => {
    const stats: Record<string, { 
      activeProjects: number; 
      completedProjects: number;
      totalRevenue: number;
      totalCosts: number;
      recentProjects: typeof projects;
    }> = {};
    
    clients.forEach(client => {
      const clientProjects = projects.filter(p => p.client_id === client.id);
      const totalCosts = clientProjects.reduce((sum, p) => 
        sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
      
      stats[client.id] = {
        activeProjects: clientProjects.filter(p => !p.is_delivered).length,
        completedProjects: clientProjects.filter(p => p.is_delivered).length,
        totalRevenue: clientProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0),
        totalCosts,
        recentProjects: clientProjects.slice(0, 3),
      };
    });
    
    return stats;
  }, [clients, projects]);

  // Global stats with real month-over-month calculations
  const globalStats = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const totalRevenue = Object.values(clientStats).reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalActiveProjects = Object.values(clientStats).reduce((sum, s) => sum + s.activeProjects, 0);
    const avgProjectValue = projects.length > 0 ? totalRevenue / projects.length : 0;
    const clientsWithProjects = clients.filter(c => clientStats[c.id]?.activeProjects > 0).length;
    
    // Calculate new clients this month (based on created_at)
    const newClientsThisMonth = clients.filter(c => 
      new Date(c.created_at) >= currentMonthStart
    ).length;
    
    // Calculate current month revenue
    const currentMonthRevenue = projects
      .filter(p => new Date(p.created_at) >= currentMonthStart)
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    
    // Calculate previous month revenue
    const previousMonthRevenue = projects
      .filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
      })
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    
    // Calculate revenue change percentage
    const revenueChange = previousMonthRevenue > 0 
      ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
      : null; // null means no data to compare
    
    // Calculate current month average project value
    const currentMonthProjects = projects.filter(p => new Date(p.created_at) >= currentMonthStart);
    const currentMonthAvg = currentMonthProjects.length > 0 
      ? currentMonthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0) / currentMonthProjects.length 
      : 0;
    
    // Calculate previous month average project value
    const previousMonthProjects = projects.filter(p => {
      const createdAt = new Date(p.created_at);
      return createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
    });
    const previousMonthAvg = previousMonthProjects.length > 0 
      ? previousMonthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0) / previousMonthProjects.length 
      : 0;
    
    // Calculate average value change percentage
    const avgValueChange = previousMonthAvg > 0 
      ? Math.round(((currentMonthAvg - previousMonthAvg) / previousMonthAvg) * 100)
      : null; // null means no data to compare
    
    return {
      totalRevenue,
      totalActiveProjects,
      avgProjectValue,
      clientsWithProjects,
      newClientsThisMonth,
      revenueChange,
      avgValueChange,
      hasPreviousMonthData: previousMonthRevenue > 0 || previousMonthProjects.length > 0,
    };
  }, [clientStats, clients, projects]);

  const filteredClients = useMemo(() => {
    let filtered = clients;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.company?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(c => clientStats[c.id]?.activeProjects > 0);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(c => clientStats[c.id]?.activeProjects === 0);
    }
    
    // Sort
    if (sortBy === 'receita') {
      filtered = [...filtered].sort((a, b) => 
        (clientStats[b.id]?.totalRevenue || 0) - (clientStats[a.id]?.totalRevenue || 0)
      );
    } else if (sortBy === 'projetos') {
      filtered = [...filtered].sort((a, b) => 
        ((clientStats[b.id]?.activeProjects || 0) + (clientStats[b.id]?.completedProjects || 0)) -
        ((clientStats[a.id]?.activeProjects || 0) + (clientStats[a.id]?.completedProjects || 0))
      );
    } else if (sortBy === 'nome') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return filtered;
  }, [clients, searchQuery, filterStatus, sortBy, clientStats]);

  const selectedClientData = selectedClient ? clients.find(c => c.id === selectedClient) : null;
  const selectedClientProjects = selectedClient ? projects.filter(p => p.client_id === selectedClient) : [];

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
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestão de clientes e análise de receitas</p>
        </div>
        <Button className="gradient-primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar cliente..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[130px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Receita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="projetos">Projetos</SelectItem>
            <SelectItem value="nome">Nome</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Clientes</p>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{clients.length}</p>
            {globalStats.newClientsThisMonth > 0 && (
              <p className="text-xs text-success mt-1">+{globalStats.newClientsThisMonth} novos este mês</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              {canViewAllFinancials ? (
                <Euro className="h-5 w-5 text-success" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            {canViewAllFinancials ? (
              <>
                <p className="text-2xl font-bold text-success">{formatCurrency(globalStats.totalRevenue)}</p>
                {globalStats.revenueChange !== null ? (
                  <p className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    globalStats.revenueChange >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {globalStats.revenueChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {globalStats.revenueChange >= 0 ? '+' : ''}{globalStats.revenueChange}% vs mês anterior
                  </p>
                ) : globalStats.totalRevenue > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">Sem dados do mês anterior</p>
                ) : null}
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">---</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Valor Médio/Projeto</p>
              {canViewAllFinancials ? (
                <TrendingUp className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            {canViewAllFinancials ? (
              <>
                <p className="text-2xl font-bold">{formatCurrency(globalStats.avgProjectValue)}</p>
                {globalStats.avgValueChange !== null ? (
                  <p className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    globalStats.avgValueChange >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {globalStats.avgValueChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {globalStats.avgValueChange >= 0 ? '+' : ''}{globalStats.avgValueChange}% vs mês anterior
                  </p>
                ) : globalStats.avgProjectValue > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">Sem dados do mês anterior</p>
                ) : null}
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">---</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Projetos Ativos</p>
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{globalStats.totalActiveProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Em {globalStats.clientsWithProjects} clientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredClients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground max-w-sm mb-4">
                {searchQuery ? 'Tente ajustar sua pesquisa.' : 'Comece adicionando seu primeiro cliente.'}
              </p>
              {!searchQuery && (
                <Button className="gradient-primary" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client, index) => {
                const stats = clientStats[client.id] || { activeProjects: 0, completedProjects: 0, totalRevenue: 0, recentProjects: [] };
                const totalProjects = stats.activeProjects + stats.completedProjects;
                const progressPercent = totalProjects > 0 ? (stats.completedProjects / totalProjects) * 100 : 0;
                
                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ scale: 1.005 }}
                    onClick={() => setSelectedClient(client.id)}
                    className="p-4 rounded-xl border bg-card/50 hover:bg-card hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-primary">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold group-hover:text-primary transition-colors">
                                {client.name}
                              </h3>
                              {/* Badge "Novo" para clientes criados há menos de 15 dias */}
                              {(new Date().getTime() - new Date(client.created_at).getTime()) < (15 * 24 * 60 * 60 * 1000) && (
                                <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-1.5 py-0">
                                  Novo
                                </Badge>
                              )}
                            </div>
                            {client.company && (
                              <p className="text-sm text-muted-foreground">{client.company}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Revenue - only visible to admin */}
                            {canViewAllFinancials && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Receita</p>
                                <p className="font-semibold text-success">{formatCurrency(stats.totalRevenue)}</p>
                              </div>
                            )}
                            
                            {/* Projects Count */}
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Projetos</p>
                              <div className="flex items-center gap-1">
                                <Badge variant="default" className="h-5 px-1.5 text-xs bg-primary">
                                  {stats.activeProjects}
                                </Badge>
                                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                  {stats.completedProjects}
                                </Badge>
                              </div>
                            </div>

                            {/* Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedClient(client.id); }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => { e.stopPropagation(); deleteClient(client.id); }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Progress & Recent Projects */}
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Progresso de Projetos</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Concluídos</span>
                              <Progress value={progressPercent} className="flex-1 h-1.5" />
                              <span className="text-xs text-muted-foreground">
                                {stats.completedProjects}/{totalProjects}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Projetos Recentes</p>
                            <div className="flex flex-wrap gap-1">
                              {stats.recentProjects.length > 0 ? (
                                stats.recentProjects.map(p => (
                                  <Badge 
                                    key={p.id} 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      p.is_delivered 
                                        ? "bg-success/10 text-success border-success/20" 
                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    )}
                                  >
                                    {p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">Nenhum projeto</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Client Modal */}
      <CreateClientModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => setShowCreateModal(false)}
      />

      {/* Client Details Modal */}
      <ClientDetailsModal
        open={!!selectedClient}
        onOpenChange={() => setSelectedClient(null)}
        client={selectedClientData}
        projects={selectedClientProjects}
        onClientUpdate={async (clientId, updates) => {
          const result = await updateClient(clientId, updates);
          if (result) {
            refresh();
          }
          return result;
        }}
      />
    </div>
  );
}
