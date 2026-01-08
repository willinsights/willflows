import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, LayoutGrid, List, Camera, Film, Video, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal';
import { cn } from '@/lib/utils';

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-info/10 text-info border-info/20',
  alta: 'bg-warning/10 text-warning border-warning/20',
  urgente: 'bg-destructive/10 text-destructive border-destructive/20',
};

const typeIcons: Record<string, any> = {
  fotografia: Camera,
  video: Film,
  foto_video: Video,
};

const phaseLabels: Record<string, string> = {
  captacao: 'Captação',
  edicao: 'Edição',
};

export default function Projetos() {
  const { projects, loading } = useProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Exclude delivered projects
      if (project.is_delivered) return false;

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

      // Type filter
      if (filterType !== 'all' && project.type !== filterType) return false;

      // Phase filter
      if (filterPhase !== 'all' && project.current_phase !== filterPhase) return false;

      // Client filter
      if (filterClient !== 'all' && project.client_id !== filterClient) return false;

      return true;
    });
  }, [projects, searchQuery, filterType, filterPhase, filterClient]);

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

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
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-muted-foreground">Todos os projetos ativos do workspace</p>
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
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button className="gradient-primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="fotografia">Fotografia</SelectItem>
            <SelectItem value="video">Vídeo</SelectItem>
            <SelectItem value="foto_video">Foto + Vídeo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPhase} onValueChange={setFilterPhase}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fases</SelectItem>
            <SelectItem value="captacao">Captação</SelectItem>
            <SelectItem value="edicao">Edição</SelectItem>
          </SelectContent>
        </Select>

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

        {(filterType !== 'all' || filterPhase !== 'all' || filterClient !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterType('all');
              setFilterPhase('all');
              setFilterClient('all');
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''} encontrado{filteredProjects.length !== 1 ? 's' : ''}
      </p>

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
          <p className="text-muted-foreground max-w-sm mb-4">
            {searchQuery || filterType !== 'all' || filterPhase !== 'all' || filterClient !== 'all'
              ? 'Tente ajustar seus filtros.'
              : 'Comece criando seu primeiro projeto.'}
          </p>
          {!searchQuery && filterType === 'all' && filterPhase === 'all' && filterClient === 'all' && (
            <Button className="gradient-primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, index) => {
            const TypeIcon = typeIcons[project.type] || Camera;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <Card className="glass-card hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TypeIcon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="outline" className={cn(priorityColors[project.priority])}>
                          {priorityLabels[project.priority]}
                        </Badge>
                      </div>
                      <Badge variant="secondary">{phaseLabels[project.current_phase]}</Badge>
                    </div>

                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    {project.clients?.name && (
                      <p className="text-sm text-muted-foreground mb-2">{project.clients.name}</p>
                    )}

                    {project.project_code && (
                      <p className="text-xs text-muted-foreground mb-3">ID: {project.project_code}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {project.delivery_date
                          ? format(new Date(project.delivery_date), 'dd/MM', { locale: pt })
                          : 'Sem data'}
                      </div>
                      {project.agreed_value && (
                        <span className="font-medium text-success">
                          {formatCurrency(project.agreed_value)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map((project, index) => {
            const TypeIcon = typeIcons[project.type] || Camera;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <Card className="glass-card hover:shadow-lg transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          {project.project_code && (
                            <span className="text-xs text-muted-foreground">({project.project_code})</span>
                          )}
                        </div>
                        {project.clients?.name && (
                          <p className="text-sm text-muted-foreground truncate">{project.clients.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant="secondary">{phaseLabels[project.current_phase]}</Badge>
                        <Badge variant="outline" className={cn(priorityColors[project.priority])}>
                          {priorityLabels[project.priority]}
                        </Badge>
                        <div className="text-sm text-muted-foreground w-20 text-right">
                          {project.delivery_date
                            ? format(new Date(project.delivery_date), 'dd/MM/yy', { locale: pt })
                            : '-'}
                        </div>
                        {project.agreed_value && (
                          <span className="font-medium text-success w-24 text-right">
                            {formatCurrency(project.agreed_value)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => setShowCreateModal(false)}
      />

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
