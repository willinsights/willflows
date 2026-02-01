import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Clock,
  Search,
  MoreHorizontal,
  Mail,
  CalendarPlus,
  CheckCircle,
  AlertTriangle,
  Timer,
  Users,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminTrials, TrialWorkspace } from '@/hooks/useAdminTrials';
import { getDisplayPlanName } from '@/lib/plans';

type FilterType = 'all' | '7days' | '14days' | 'expired' | 'today';

export function TrialsManagementTab() {
  const {
    trialWorkspaces,
    stats,
    isLoading,
    extendTrial,
    isExtending,
    convertToActive,
    isConverting,
  } = useAdminTrials();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Extend trial modal state
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendDays, setExtendDays] = useState('7');
  const [extendReason, setExtendReason] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<TrialWorkspace | null>(null);

  // Convert modal state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertReason, setConvertReason] = useState('');

  // Filtered workspaces
  const filteredWorkspaces = useMemo(() => {
    return trialWorkspaces.filter((ws) => {
      // Search filter
      const matchesSearch =
        search === '' ||
        ws.name.toLowerCase().includes(search.toLowerCase()) ||
        ws.slug.toLowerCase().includes(search.toLowerCase()) ||
        ws.owner?.email.toLowerCase().includes(search.toLowerCase()) ||
        ws.owner?.full_name?.toLowerCase().includes(search.toLowerCase());

      // Time filter
      let matchesFilter = true;
      switch (filter) {
        case '7days':
          matchesFilter = ws.days_remaining > 0 && ws.days_remaining <= 7;
          break;
        case '14days':
          matchesFilter = ws.days_remaining > 0 && ws.days_remaining <= 14;
          break;
        case 'expired':
          matchesFilter = ws.days_remaining < 0;
          break;
        case 'today':
          matchesFilter = ws.days_remaining === 0;
          break;
      }

      return matchesSearch && matchesFilter;
    });
  }, [trialWorkspaces, search, filter]);

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return format(new Date(date), 'dd MMM yyyy', { locale: pt });
  };

  const getUrgencyBadge = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Expirado há {Math.abs(daysRemaining)}d
        </Badge>
      );
    }
    if (daysRemaining === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expira Hoje
        </Badge>
      );
    }
    if (daysRemaining <= 3) {
      return (
        <Badge variant="outline" className="text-destructive border-destructive/50 gap-1">
          <Timer className="h-3 w-3" />
          {daysRemaining}d
        </Badge>
      );
    }
    if (daysRemaining <= 7) {
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500/50 gap-1">
          <Clock className="h-3 w-3" />
          {daysRemaining}d
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {daysRemaining}d
      </Badge>
    );
  };

  const handleOpenExtendDialog = (workspace: TrialWorkspace) => {
    setSelectedWorkspace(workspace);
    setExtendDays('7');
    setExtendReason('');
    setExtendDialogOpen(true);
  };

  const handleOpenConvertDialog = (workspace: TrialWorkspace) => {
    setSelectedWorkspace(workspace);
    setConvertReason('');
    setConvertDialogOpen(true);
  };

  const handleExtend = async () => {
    if (!selectedWorkspace || !extendReason.trim()) return;
    
    await extendTrial({
      workspaceId: selectedWorkspace.id,
      days: parseInt(extendDays),
      reason: extendReason.trim(),
    });
    
    setExtendDialogOpen(false);
  };

  const handleConvert = async () => {
    if (!selectedWorkspace || !convertReason.trim()) return;
    
    await convertToActive({
      workspaceId: selectedWorkspace.id,
      reason: convertReason.trim(),
    });
    
    setConvertDialogOpen(false);
  };

  const handleSendEmail = (workspace: TrialWorkspace) => {
    if (!workspace.owner?.email) return;
    
    const subject = encodeURIComponent(`WillFlow - Período de Trial`);
    const body = encodeURIComponent(
      `Olá${workspace.owner.full_name ? ` ${workspace.owner.full_name}` : ''},\n\nRelativamente ao workspace "${workspace.name}"...\n\n`
    );
    window.open(`mailto:${workspace.owner.email}?subject=${subject}&body=${body}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.totalTrialing}</p>
            </div>
            <p className="text-xs text-muted-foreground">Total em Trial</p>
          </CardContent>
        </Card>
        
        <Card className="border-amber-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-2xl font-bold text-amber-500">{stats.expiringIn7Days}</p>
            </div>
            <p className="text-xs text-muted-foreground">Expiram em 7 dias</p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <p className="text-2xl font-bold text-orange-500">{stats.expiringToday}</p>
            </div>
            <p className="text-xs text-muted-foreground">Expiram Hoje</p>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
            </div>
            <p className="text-xs text-muted-foreground">Expirados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, slug ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Expira Hoje</SelectItem>
            <SelectItem value="7days">Próximos 7 dias</SelectItem>
            <SelectItem value="14days">Próximos 14 dias</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredWorkspaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
            <h3 className="font-medium">Sem workspaces em trial</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter !== 'all' 
                ? 'Nenhum workspace corresponde ao filtro seleccionado.'
                : 'Não existem workspaces em período de trial.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Dias Restantes</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkspaces.map((ws) => (
                  <TableRow key={ws.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">/{ws.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ws.owner ? (
                        <div>
                          <p className="text-sm">{ws.owner.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{ws.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {getDisplayPlanName(ws.subscription_plan as any)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getUrgencyBadge(ws.days_remaining)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(ws.trial_ends_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenExtendDialog(ws)}>
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            Extender Trial
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenConvertDialog(ws)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Converter para Activo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleSendEmail(ws)}
                            disabled={!ws.owner?.email}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Extend Trial Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender Trial</DialogTitle>
            <DialogDescription>
              Extender o período de trial para <strong>{selectedWorkspace?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dias a adicionar</label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">+7 dias</SelectItem>
                  <SelectItem value="14">+14 dias</SelectItem>
                  <SelectItem value="30">+30 dias</SelectItem>
                  <SelectItem value="60">+60 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Motivo <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Descreva o motivo da extensão..."
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExtend} 
              disabled={!extendReason.trim() || isExtending}
            >
              {isExtending ? 'A extender...' : 'Extender Trial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Active Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter para Activo</DialogTitle>
            <DialogDescription>
              Converter <strong>{selectedWorkspace?.name}</strong> de trial para subscrição activa.
              Esta acção é usada para conversões manuais (ex: acordo especial).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Motivo <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Descreva o motivo da conversão manual..."
                value={convertReason}
                onChange={(e) => setConvertReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConvert} 
              disabled={!convertReason.trim() || isConverting}
            >
              {isConverting ? 'A converter...' : 'Converter para Activo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
