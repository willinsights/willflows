import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Users, Mail, Phone, MapPin, MoreHorizontal, Building2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { CreateClientModal } from '@/components/clients/CreateClientModal';

export default function Clientes() {
  const { clients, loading, deleteClient } = useClients();
  const { projects } = useProjects();
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Calculate client stats
  const clientStats = useMemo(() => {
    const stats: Record<string, { activeProjects: number; totalRevenue: number }> = {};
    
    clients.forEach(client => {
      const clientProjects = projects.filter(p => p.client_id === client.id);
      stats[client.id] = {
        activeProjects: clientProjects.filter(p => !p.is_delivered).length,
        totalRevenue: clientProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0),
      };
    });
    
    return stats;
  }, [clients, projects]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

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
          <p className="text-muted-foreground">Gestão de clientes e CRM</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar clientes..."
              className="pl-9 w-full sm:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="gradient-primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{clients.length}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total Clientes</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Building2 className="h-5 w-5 text-info" />
              <span className="text-2xl font-bold">{clients.filter(c => c.company).length}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Empresas</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-success">Receita Total</span>
            </div>
            <p className="text-2xl font-bold text-success mt-1">
              {formatCurrency(Object.values(clientStats).reduce((sum, s) => sum + s.totalRevenue, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">Projetos Ativos</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {Object.values(clientStats).reduce((sum, s) => sum + s.activeProjects, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client, index) => {
            const stats = clientStats[client.id] || { activeProjects: 0, totalRevenue: 0 };
            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{client.name}</h3>
                          {client.company && (
                            <p className="text-sm text-muted-foreground">{client.company}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedClient(client.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteClient(client.id)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 text-sm">
                      {client.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.city && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{client.city}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                      <Badge variant="secondary">
                        {stats.activeProjects} projeto{stats.activeProjects !== 1 ? 's' : ''} ativo{stats.activeProjects !== 1 ? 's' : ''}
                      </Badge>
                      <span className="font-medium text-success">
                        {formatCurrency(stats.totalRevenue)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => setShowCreateModal(false)}
      />

      {/* Client Details Modal */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {selectedClientData?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <span>{selectedClientData?.name}</span>
                {selectedClientData?.company && (
                  <p className="text-sm font-normal text-muted-foreground">{selectedClientData.company}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedClientData?.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedClientData.email}</p>
                  </div>
                )}
                {selectedClientData?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedClientData.phone}</p>
                  </div>
                )}
                {selectedClientData?.city && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cidade</p>
                    <p className="font-medium">{selectedClientData.city}</p>
                  </div>
                )}
                {selectedClientData?.nif && (
                  <div>
                    <p className="text-sm text-muted-foreground">NIF</p>
                    <p className="font-medium">{selectedClientData.nif}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              {selectedClient && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {clientStats[selectedClient]?.activeProjects || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Projetos Ativos</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(clientStats[selectedClient]?.totalRevenue || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Receita Total</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Projects */}
              <div>
                <h4 className="font-semibold mb-3">Projetos ({selectedClientProjects.length})</h4>
                <div className="space-y-2">
                  {selectedClientProjects.map(project => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.project_code || project.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={project.is_delivered ? 'secondary' : 'default'}>
                          {project.is_delivered ? 'Entregue' : project.current_phase}
                        </Badge>
                        {project.agreed_value && (
                          <p className="text-sm font-medium mt-1">
                            {formatCurrency(project.agreed_value)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedClientProjects.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum projeto encontrado
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedClientData?.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notas</h4>
                  <p className="text-sm text-muted-foreground">{selectedClientData.notes}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
