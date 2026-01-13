import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Calendar as CalendarIcon, Download, FileText, Camera, Film, Video, Eye, X, Users, Lock } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  const { projects } = useFilteredProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const { members: workspaceMembers } = useWorkspaceMembers();
  const { canViewAllFinancials } = useFinancialPermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [projectTeams, setProjectTeams] = useState<Record<string, { captacao: string[]; edicao: string[] }>>({});

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Fetch project teams for all completed projects
  useEffect(() => {
    const fetchProjectTeams = async () => {
      const deliveredProjectIds = projects.filter(p => p.is_delivered).map(p => p.id);
      if (deliveredProjectIds.length === 0) return;

      const { data } = await supabase
        .from('project_team')
        .select('project_id, user_id, phase')
        .in('project_id', deliveredProjectIds);

      if (data) {
        const teamsMap: Record<string, { captacao: string[]; edicao: string[] }> = {};
        data.forEach(item => {
          if (!teamsMap[item.project_id]) {
            teamsMap[item.project_id] = { captacao: [], edicao: [] };
          }
          teamsMap[item.project_id][item.phase].push(item.user_id);
        });
        setProjectTeams(teamsMap);
      }
    };

    fetchProjectTeams();
  }, [projects]);

  const getMemberInfo = (userId: string) => {
    const member = workspaceMembers.find(m => m.user_id === userId);
    return member || null;
  };

  const renderTeamAvatars = (userIds: string[]) => {
    if (userIds.length === 0) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    return (
      <div className="flex -space-x-2">
        {userIds.slice(0, 3).map(userId => {
          const member = getMemberInfo(userId);
          if (!member) return null;
          return (
            <Tooltip key={userId}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                    {(member.full_name || member.email || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                {member.full_name || member.email}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {userIds.length > 3 && (
          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground">+{userIds.length - 3}</span>
          </div>
        )}
      </div>
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterClient('all');
    setFilterType('all');
    setFilterResponsavel('all');
    setFilterPhase('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = searchQuery || filterClient !== 'all' || filterType !== 'all' || filterResponsavel !== 'all' || filterPhase !== 'all' || startDate || endDate;

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

        // Type filter
        if (filterType !== 'all' && project.type !== filterType) return false;

        // Responsável filter
        if (filterResponsavel !== 'all') {
          const team = projectTeams[project.id];
          if (!team) return false;
          
          if (filterPhase === 'captacao') {
            if (!team.captacao.includes(filterResponsavel)) return false;
          } else if (filterPhase === 'edicao') {
            if (!team.edicao.includes(filterResponsavel)) return false;
          } else {
            // Any phase
            if (!team.captacao.includes(filterResponsavel) && !team.edicao.includes(filterResponsavel)) return false;
          }
        }

        // Date range filter
        if ((startDate || endDate) && project.delivered_at) {
          const deliveredDate = parseISO(project.delivered_at);
          
          if (startDate && endDate) {
            if (!isWithinInterval(deliveredDate, { start: startDate, end: endDate })) return false;
          } else if (startDate && deliveredDate < startDate) {
            return false;
          } else if (endDate && deliveredDate > endDate) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.delivered_at ? new Date(a.delivered_at).getTime() : 0;
        const dateB = b.delivered_at ? new Date(b.delivered_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [projects, searchQuery, filterClient, filterType, filterResponsavel, filterPhase, projectTeams, startDate, endDate]);

  // Get unique team members who have worked on finished projects
  const teamMembersInProjects = useMemo(() => {
    const memberIds = new Set<string>();
    Object.values(projectTeams).forEach(team => {
      team.captacao.forEach(id => memberIds.add(id));
      team.edicao.forEach(id => memberIds.add(id));
    });
    return Array.from(memberIds)
      .map(id => getMemberInfo(id))
      .filter(Boolean)
      .sort((a, b) => (a?.full_name || a?.email || '').localeCompare(b?.full_name || b?.email || ''));
  }, [projectTeams, workspaceMembers]);

  const totalRevenue = completedProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

  const getTeamNames = (userIds: string[]) => {
    return userIds
      .map(id => {
        const member = getMemberInfo(id);
        return member?.full_name || member?.email || '';
      })
      .filter(Boolean)
      .join(', ') || '-';
  };

  const exportToCSV = () => {
    if (completedProjects.length === 0) return;
    
    const headers = ['Projeto', 'Código', 'Cliente', 'Tipo', 'Data de Entrega', 'Captação', 'Edição'];
    const rows = completedProjects.map(project => {
      const team = projectTeams[project.id] || { captacao: [], edicao: [] };
      return [
        project.name,
        project.project_code || '',
        project.clients?.name || 'Sem cliente',
        typeLabels[project.type],
        project.delivered_at ? format(new Date(project.delivered_at), 'dd/MM/yyyy') : 'N/A',
        getTeamNames(team.captacao),
        getTeamNames(team.edicao),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projetos-finalizados-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (completedProjects.length === 0) return;
    
    // Create printable HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Projetos Finalizados</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          .summary { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #8224e3; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Projetos Finalizados</h1>
        <div class="summary">
          <strong>Total de Projetos:</strong> ${completedProjects.length}
        </div>
        <table>
          <thead>
            <tr>
              <th>Projeto</th>
              <th>Código</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Data de Entrega</th>
              <th>Captação</th>
              <th>Edição</th>
            </tr>
          </thead>
          <tbody>
            ${completedProjects.map(project => {
              const team = projectTeams[project.id] || { captacao: [], edicao: [] };
              return `
              <tr>
                <td>${project.name}</td>
                <td>${project.project_code || '-'}</td>
                <td>${project.clients?.name || 'Sem cliente'}</td>
                <td>${typeLabels[project.type]}</td>
                <td>${project.delivered_at ? format(new Date(project.delivered_at), 'dd/MM/yyyy') : 'N/A'}</td>
                <td>${getTeamNames(team.captacao)}</td>
                <td>${getTeamNames(team.edicao)}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Projetos Finalizados</h1>
          <p className="text-muted-foreground">Histórico completo de projetos concluídos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={exportToCSV}
            disabled={completedProjects.length === 0}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={exportToPDF}
            disabled={completedProjects.length === 0}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filtros
          </div>
          
          {/* First row: Search, Client, Type, Clear */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou cliente..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes" />
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

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="fotografia">Fotografia</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="foto_video">Foto + Vídeo</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>

          {/* Second row: Responsável filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {teamMembersInProjects.map(member => member && (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {(member.full_name || member.email || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {member.full_name || member.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filterPhase} 
              onValueChange={setFilterPhase}
              disabled={filterResponsavel === 'all'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Qualquer fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer fase</SelectItem>
                <SelectItem value="captacao">Captação</SelectItem>
                <SelectItem value="edicao">Edição</SelectItem>
              </SelectContent>
            </Select>

            <div /> {/* Spacer */}
          </div>

          {/* Third row: Date range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Data inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "dd/mm/aaaa"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Data final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "dd/mm/aaaa"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Mostrando <span className="text-primary font-medium">{completedProjects.length}</span> de <span className="text-primary font-medium">{projects.filter(p => p.is_delivered).length}</span> projetos
      </div>

      {/* Projects Table */}
      {completedProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum projeto finalizado</h3>
          <p className="text-muted-foreground max-w-sm">
            Os projetos entregues aparecerão aqui.
          </p>
        </motion.div>
      ) : (
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data de Entrega</TableHead>
                <TableHead>Captação</TableHead>
                <TableHead>Edição</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedProjects.map((project, index) => {
                const TypeIcon = typeIcons[project.type] || Camera;
                const team = projectTeams[project.id] || { captacao: [], edicao: [] };
                return (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10">
                          <TypeIcon className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          {project.project_code && (
                            <p className="text-xs text-muted-foreground">{project.project_code}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.clients?.name || 'Sem cliente'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {typeLabels[project.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.delivered_at 
                        ? format(new Date(project.delivered_at), 'dd/MM/yyyy', { locale: pt })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {renderTeamAvatars(team.captacao)}
                    </TableCell>
                    <TableCell>
                      {renderTeamAvatars(team.edicao)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectId(project.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Summary Cards - Valores financeiros apenas para admin */}
      <div className={cn("grid gap-4", canViewAllFinancials ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Projetos Entregues</p>
            <p className="text-2xl font-bold">{completedProjects.length}</p>
          </CardContent>
        </Card>
        {canViewAllFinancials && (
          <>
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
          </>
        )}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          open={!!selectedProjectId}
          onOpenChange={(open) => !open && setSelectedProjectId(null)}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
}
