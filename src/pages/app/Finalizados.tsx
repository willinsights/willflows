import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Calendar, Download, MoreHorizontal, Camera, Film, Video, Eye } from 'lucide-react';
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal';

const typeIcons: Record<string, any> = {
  fotografia: Camera,
  video: Film,
  foto_video: Video,
};

const typeLabels: Record<string, string> = {
  fotografia: 'Fotografia',
  video: 'Vídeo',
  foto_video: 'Foto + Vídeo',
};

export default function Finalizados() {
  const { projects } = useProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const completedProjects = useMemo(() => {
    return projects
      .filter(project => project.is_delivered)
      .filter(project => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (
            !project.name.toLowerCase().includes(query) &&
            !project.project_code?.toLowerCase().includes(query) &&
            !project.clients?.name?.toLowerCase().includes(query)
          ) {
            return false;
          }
        }

        // Client filter
        if (filterClient !== 'all' && project.client_id !== filterClient) return false;

        // Period filter
        if (filterPeriod !== 'all' && project.delivered_at) {
          const deliveredDate = new Date(project.delivered_at);
          const now = new Date();
          
          switch (filterPeriod) {
            case 'this_month':
              if (!isWithinInterval(deliveredDate, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
              break;
            case 'last_month':
              const lastMonth = subMonths(now, 1);
              if (!isWithinInterval(deliveredDate, { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) })) return false;
              break;
            case 'last_3_months':
              if (deliveredDate < subMonths(now, 3)) return false;
              break;
            case 'last_6_months':
              if (deliveredDate < subMonths(now, 6)) return false;
              break;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.delivered_at ? new Date(a.delivered_at).getTime() : 0;
        const dateB = b.delivered_at ? new Date(b.delivered_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [projects, searchQuery, filterClient, filterPeriod]);

  const totalRevenue = completedProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finalizados</h1>
          <p className="text-muted-foreground">Arquivo de projetos entregues</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar projetos..."
              className="pl-9 w-full sm:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
            <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
            <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>

        {(filterClient !== 'all' || filterPeriod !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterClient('all');
              setFilterPeriod('all');
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Projetos Entregues</p>
            <p className="text-2xl font-bold">{completedProjects.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card hidden md:block">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Média por Projeto</p>
            <p className="text-2xl font-bold">
              {formatCurrency(completedProjects.length > 0 ? totalRevenue / completedProjects.length : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      {completedProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum projeto finalizado</h3>
          <p className="text-muted-foreground max-w-sm">
            Os projetos entregues aparecerão aqui.
          </p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedProjects.map((project, index) => {
            const TypeIcon = typeIcons[project.type] || Camera;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                          <TypeIcon className="h-5 w-5 text-success" />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {typeLabels[project.type]}
                        </Badge>
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
                          <DropdownMenuItem onClick={() => setSelectedProjectId(project.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-semibold mb-1">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{project.clients?.name || 'Sem cliente'}</p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Entregue: {project.delivered_at 
                          ? format(new Date(project.delivered_at), 'dd/MM/yyyy', { locale: pt })
                          : 'N/A'}
                      </span>
                      <span className="font-medium text-success">
                        {formatCurrency(project.agreed_value || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          open={!!selectedProjectId}
          onOpenChange={(open) => !open && setSelectedProjectId(null)}
        />
      )}
    </div>
  );
}
