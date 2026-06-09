import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Calendar as CalendarIcon, FileSpreadsheet, FileText, Camera, Film, Video, Eye, EyeOff, X, Users, Lock } from 'lucide-react';
import { format, isWithinInterval, parseISO, subMonths, addMonths, startOfMonth } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/ui/list-pagination';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useHideValues } from '@/hooks/useHideValues';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { UpgradeAlert } from '@/components/subscription/UpgradeAlert';
import { ProjectDetailsSheet } from '@/components/projects/ProjectDetailsSheet';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
const typeIcons: Record<string, any> = {
  fotografia: Camera,
  video: Film,
  foto_video: Video
};
const typeLabels: Record<string, string> = {
  fotografia: 'Fotografia',
  video: 'Vídeo',
  foto_video: 'Foto + Vídeo'
};
import { CompetenceMonthSelect } from '@/components/financeiro/CompetenceMonthSelect';

export default function Finalizados() {
  const {
    projects
  } = useFilteredProjects();
  const {
    clients
  } = useClients();
  const {
    currentWorkspace
  } = useWorkspace();
  const {
    members: workspaceMembers
  } = useWorkspaceMembers();
  const {
    canViewAllFinancials
  } = useFinancialPermissions();
  const {
    checkFeature,
    upgradeAlert,
    closeUpgradeAlert,
    hasFeatureAccess
  } = usePlanFeatures();
  const { hideValues, toggleHideValues } = useHideValues();
  const canExportPdf = hasFeatureAccess('exportPdf');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [projectTeams, setProjectTeams] = useState<Record<string, {
    captacao: string[];
    edicao: string[];
  }>>({});
  const { formatCurrency } = useFormatCurrency();

  // Fetch project teams for all completed projects
  useEffect(() => {
    const fetchProjectTeams = async () => {
      const deliveredProjectIds = projects.filter(p => p.is_delivered).map(p => p.id);
      if (deliveredProjectIds.length === 0) return;
      const {
        data
      } = await supabase.from('project_team').select('project_id, user_id, phase').in('project_id', deliveredProjectIds);
      if (data) {
        const teamsMap: Record<string, {
          captacao: string[];
          edicao: string[];
        }> = {};
        data.forEach(item => {
          if (!teamsMap[item.project_id]) {
            teamsMap[item.project_id] = {
              captacao: [],
              edicao: []
            };
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
    return <div className="flex -space-x-2">
        {userIds.slice(0, 3).map(userId => {
        const member = getMemberInfo(userId);
        if (!member) return null;
        return <Tooltip key={userId}>
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
            </Tooltip>;
      })}
        {userIds.length > 3 && <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground">+{userIds.length - 3}</span>
          </div>}
      </div>;
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
    return projects.filter(project => project.is_delivered).filter(project => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!project.name.toLowerCase().includes(query) && !project.project_code?.toLowerCase().includes(query) && !project.clients?.name?.toLowerCase().includes(query)) {
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
        if (startDate && deliveredDate < startDate) {
          return false;
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (deliveredDate > endOfDay) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Ordenar por data de entrega (mais recente primeiro)
      const dateA = a.delivered_at ? new Date(a.delivered_at).getTime() : 0;
      const dateB = b.delivered_at ? new Date(b.delivered_at).getTime() : 0;
      return dateB - dateA; // Mais recentes primeiro
    });
  }, [projects, searchQuery, filterClient, filterType, filterResponsavel, filterPhase, projectTeams, startDate, endDate]);

  // Pagination
  const pagination = usePagination({
    items: completedProjects,
    itemsPerPage: 50,
  });

  // Get unique team members who have worked on finished projects
  const teamMembersInProjects = useMemo(() => {
    const memberIds = new Set<string>();
    Object.values(projectTeams).forEach(team => {
      team.captacao.forEach(id => memberIds.add(id));
      team.edicao.forEach(id => memberIds.add(id));
    });
    return Array.from(memberIds).map(id => getMemberInfo(id)).filter(Boolean).sort((a, b) => (a?.full_name || a?.email || '').localeCompare(b?.full_name || b?.email || ''));
  }, [projectTeams, workspaceMembers]);
  const totalRevenue = completedProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
  const getTeamNames = (userIds: string[]) => {
    return userIds.map(id => {
      const member = getMemberInfo(id);
      return member?.full_name || member?.email || '';
    }).filter(Boolean).join(', ') || '-';
  };
  const exportToExcel = async () => {
    if (completedProjects.length === 0) return;

    const { exportToExcel: doExport } = await import('@/lib/excel-export');
    
    // Build headers based on permissions
    const headers = canViewAllFinancials 
      ? ['Código', 'Projeto', 'Cliente', 'Tipo', 'Data de Entrega', 'Competência', 'Captação', 'Edição', 'Preço Cliente', 'Custos', 'Lucro']
      : ['Código', 'Projeto', 'Cliente', 'Tipo', 'Data de Entrega', 'Competência', 'Captação', 'Edição'];
    
    const data = completedProjects.map(project => {
      const team = projectTeams[project.id] || { captacao: [], edicao: [] };
      const custo = (project.custo_captacao || 0) + (project.custo_edicao || 0) + (project.custos_extras || 0);
      const lucro = (project.agreed_value || 0) - custo;
      
      const competence = project.competence_month
        ? format(parseISO(project.competence_month + '-01'), 'MMM yyyy', { locale: pt })
        : project.delivered_at ? format(new Date(project.delivered_at), 'MMM yyyy', { locale: pt }) : 'N/A';
      
      const row: (string | number)[] = [
        project.project_code || project.id.slice(0, 8).toUpperCase(),
        project.name,
        project.clients?.name || 'Sem cliente',
        typeLabels[project.type],
        project.delivered_at ? format(new Date(project.delivered_at), 'dd/MM/yyyy') : 'N/A',
        competence,
        getTeamNames(team.captacao),
        getTeamNames(team.edicao),
      ];
      
      if (canViewAllFinancials) {
        row.push(formatCurrency(project.agreed_value || 0));
        row.push(formatCurrency(custo));
        row.push(formatCurrency(lucro));
      }
      
      return row;
    });

    await doExport({
      title: 'Projetos Finalizados',
      subtitle: currentWorkspace?.name || 'WillFlow',
      headers,
      data,
      filename: `projetos-finalizados-${format(new Date(), 'yyyy-MM-dd')}`,
    });
  };

  const exportToPDF = () => {
    if (completedProjects.length === 0) return;
    if (!checkFeature('exportPdf')) return;

    const esc = (v: unknown): string =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Calculate totals
    let totalRevenueVal = 0;
    let totalCostsVal = 0;
    completedProjects.forEach(project => {
      totalRevenueVal += (project.agreed_value || 0);
      totalCostsVal += (project.custo_captacao || 0) + (project.custo_edicao || 0) + (project.custos_extras || 0);
    });
    const totalProfit = totalRevenueVal - totalCostsVal;

    // Create printable HTML with premium design
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Projetos Finalizados - ${esc(currentWorkspace?.name || 'WillFlow')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
          .header { border-left: 4px solid #8224e3; padding-left: 20px; margin-bottom: 30px; }
          .header h1 { color: #8224e3; font-size: 28px; margin-bottom: 8px; }
          .header .workspace-name { color: #666; font-size: 16px; margin-bottom: 4px; }
          .header .date { color: #999; font-size: 12px; }
          .stats-bar { display: flex; gap: 20px; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f8f4ff 0%, #f0e8ff 100%); border-radius: 12px; flex-wrap: wrap; }
          .stat-item { flex: 1; min-width: 120px; }
          .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; }
          .stat-value.success { color: #16a34a; }
          .stat-value.primary { color: #8224e3; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #e5e5e5; padding: 10px 8px; text-align: left; }
          th { background: #8224e3; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
          th.right, td.right { text-align: right; }
          tr:nth-child(even) { background-color: #fafafa; }
          tr:hover { background-color: #f5f0ff; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center; }
          .footer-brand { color: #8224e3; font-weight: 600; font-size: 14px; }
          .footer-date { color: #999; font-size: 11px; }
          .positive { color: #16a34a; }
          .negative { color: #dc2626; }
          @media print { 
            body { padding: 20px; } 
            .stats-bar { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Projetos Finalizados</h1>
          <p class="workspace-name">${currentWorkspace?.name || 'WillFlow'}</p>
          <p class="date">${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: pt })}</p>
        </div>
        
        <div class="stats-bar">
          <div class="stat-item">
            <div class="stat-label">Total Projetos</div>
            <div class="stat-value primary">${completedProjects.length}</div>
          </div>
          ${canViewAllFinancials ? `
          <div class="stat-item">
            <div class="stat-label">Receita Total</div>
            <div class="stat-value success">${formatCurrency(totalRevenueVal)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Custos Total</div>
            <div class="stat-value negative">${formatCurrency(totalCostsVal)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Lucro Total</div>
            <div class="stat-value">${formatCurrency(totalProfit)}</div>
          </div>
          ` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Projeto</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Data Entrega</th>
              <th>Competência</th>
              <th>Captação</th>
              <th>Edição</th>
              ${canViewAllFinancials ? '<th class="right">Preço</th><th class="right">Custos</th><th class="right">Lucro</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${completedProjects.map(project => {
              const team = projectTeams[project.id] || { captacao: [], edicao: [] };
              const custo = (project.custo_captacao || 0) + (project.custo_edicao || 0) + (project.custos_extras || 0);
              const lucro = (project.agreed_value || 0) - custo;
              return `
              <tr>
                <td>${project.project_code || project.id.slice(0, 8).toUpperCase()}</td>
                <td>${project.name}</td>
                <td>${project.clients?.name || 'Sem cliente'}</td>
                <td>${typeLabels[project.type]}</td>
                <td>${project.delivered_at ? format(new Date(project.delivered_at), 'dd/MM/yyyy') : 'N/A'}</td>
                <td>${project.competence_month ? format(parseISO(project.competence_month + '-01'), 'MMM yyyy', { locale: pt }) : (project.delivered_at ? format(new Date(project.delivered_at), 'MMM yyyy', { locale: pt }) : 'N/A')}</td>
                <td>${getTeamNames(team.captacao)}</td>
                <td>${getTeamNames(team.edicao)}</td>
                ${canViewAllFinancials ? `
                <td class="right positive">${formatCurrency(project.agreed_value || 0)}</td>
                <td class="right negative">${formatCurrency(custo)}</td>
                <td class="right">${formatCurrency(lucro)}</td>
                ` : ''}
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <span class="footer-brand">WillFlow</span>
          <span class="footer-date">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
        </div>
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
  return <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-primary">Projetos Finalizados</h1>
          <p className="text-muted-foreground">Histórico completo de projetos concluídos</p>
        </div>
        <div className="flex items-center gap-2">
          {canViewAllFinancials && (
            <Button variant="ghost" size="icon" onClick={toggleHideValues} className="h-9 w-9">
              {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={exportToExcel} disabled={completedProjects.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          {canExportPdf ? <Button variant="outline" size="sm" className="gap-2" onClick={exportToPDF} disabled={completedProjects.length === 0}>
              <FileText className="h-4 w-4" />
              PDF
            </Button> : <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 opacity-60" onClick={() => checkFeature('exportPdf')}>
                  <Lock className="h-4 w-4" />
                  PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Disponível nos planos Pro e Studio
              </TooltipContent>
            </Tooltip>}
        </div>
      </motion.div>

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
              <Input placeholder="Buscar por título ou cliente..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map(client => <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>)}
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

            <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters} className="w-full">
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
                {teamMembersInProjects.map(member => member && <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {(member.full_name || member.email || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {member.full_name || member.email}
                    </div>
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterPhase} onValueChange={setFilterPhase} disabled={filterResponsavel === 'all'}>
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "dd/mm/aaaa"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Data final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "dd/mm/aaaa"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
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
      {pagination.totalItems === 0 ? <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum projeto finalizado</h3>
          <p className="text-muted-foreground max-w-sm">
            Os projetos entregues aparecerão aqui.
          </p>
        </motion.div> : <Card className="glass-card overflow-hidden">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data de Entrega</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Captação</TableHead>
                <TableHead>Edição</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map((project, index) => {
            const TypeIcon = typeIcons[project.type] || Camera;
            const team = projectTeams[project.id] || {
              captacao: [],
              edicao: []
            };
            return <motion.tr key={project.id} initial={{
              opacity: 0,
              x: -20
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              delay: index * 0.03
            }} className="group hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedProjectId(project.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                          <TypeIcon className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          {project.project_code && <p className="text-xs text-muted-foreground">{project.project_code}</p>}
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
                      {project.delivered_at ? format(new Date(project.delivered_at), 'dd/MM/yyyy', {
                  locale: pt
                }) : 'N/A'}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <CompetenceMonthSelect
                        projectId={project.id}
                        currentValue={project.competence_month || null}
                        deliveredAt={project.delivered_at}
                      />
                    </TableCell>
                    <TableCell>
                      {renderTeamAvatars(team.captacao)}
                    </TableCell>
                    <TableCell>
                      {renderTeamAvatars(team.edicao)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                  e.stopPropagation();
                  setSelectedProjectId(project.id);
                }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>;
          })}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          <div className="p-4 border-t">
            <ListPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
              onPageChange={pagination.goToPage}
              onNextPage={pagination.goToNextPage}
              onPreviousPage={pagination.goToPreviousPage}
              onFirstPage={pagination.goToFirstPage}
              onLastPage={pagination.goToLastPage}
            />
          </div>
        </Card>}

      {/* Summary Cards - Valores financeiros apenas para admin */}
      <div className={cn("grid gap-4", canViewAllFinancials ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Projetos Entregues</p>
            <p className="text-2xl font-bold">{completedProjects.length}</p>
          </CardContent>
        </Card>
        {canViewAllFinancials && <>
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className={cn("text-2xl font-bold text-success", hideValues && "blur-md select-none")}>{formatCurrency(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card hidden md:block">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Média por Projeto</p>
                <p className={cn("text-2xl font-bold", hideValues && "blur-md select-none")}>
                  {formatCurrency(completedProjects.length > 0 ? totalRevenue / completedProjects.length : 0)}
                </p>
              </CardContent>
            </Card>
          </>}
      </div>

      {/* Project Details Sheet */}
      {selectedProject && <ProjectDetailsSheet project={selectedProject} open={!!selectedProjectId} onOpenChange={open => !open && setSelectedProjectId(null)} onUpdate={() => {}} />}

      {/* Upgrade Alert */}
      <UpgradeAlert isOpen={upgradeAlert.isOpen} onClose={closeUpgradeAlert} feature={upgradeAlert.feature} requiredPlan={upgradeAlert.requiredPlan} />
    </div>;
}