/**
 * WorkspacesSection - Workspaces management with filtering and actions
 * Moved from WorkspacesTab.tsx for the unified Users Management tab
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Search,
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  MoreHorizontal,
  Ban,
  Shield,
  Activity,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminWorkspaces, AdminWorkspace, WorkspaceFilters } from '@/hooks/useAdminWorkspaces';
import { getDisplayPlanName } from '@/lib/plans';

export function WorkspacesSection() {
  const [filters, setFilters] = useState<WorkspaceFilters>({
    search: '',
    status: 'all',
    plan: 'all',
  });
  const [selectedWorkspace, setSelectedWorkspace] = useState<AdminWorkspace | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'block' | 'unblock';
    workspace: AdminWorkspace;
  } | null>(null);

  const { workspaces, isLoading, blockWorkspace, isBlocking } = useAdminWorkspaces(filters);

  const getStatusBadge = (status: string | null) => {
    const statuses: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      active: { label: 'Ativo', variant: 'default' },
      trialing: { label: 'Trial', variant: 'secondary' },
      past_due: { label: 'Past Due', variant: 'outline' },
      canceled: { label: 'Cancelado', variant: 'destructive' },
    };
    const s = statuses[status || ''] || { label: status || '—', variant: 'outline' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getPlanBadge = (plan: string | null) => {
    if (!plan) return <span className="text-muted-foreground">—</span>;
    const colors: Record<string, string> = {
      essencial: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      starter: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      pro: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      studio: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    };
    return (
      <Badge variant="outline" className={colors[plan] || ''}>
        {getDisplayPlanName(plan)}
      </Badge>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return format(new Date(date), 'dd MMM yyyy', { locale: pt });
  };

  const formatRelativeDate = (date: string | null) => {
    if (!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias`;
    return format(d, 'dd/MM/yy');
  };

  const UsageBar = ({ current, max, label }: { current: number; max: number; label: string }) => {
    const percent = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const isOver = current > max;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-20">
              <Progress 
                value={percent} 
                className={`h-2 ${isOver ? '[&>div]:bg-red-500' : ''}`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{current}/{max} {label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou slug..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(v) => setFilters({ ...filters, status: v as WorkspaceFilters['status'] })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="trialing">Em Trial</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.plan}
          onValueChange={(v) => setFilters({ ...filters, plan: v as WorkspaceFilters['plan'] })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="essencial">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="studio">Studio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{workspaces.length} workspaces</span>
        <span>•</span>
        <span>{workspaces.filter(w => w.subscription_status === 'active').length} ativos</span>
        <span>•</span>
        <span>{workspaces.filter(w => w.subscription_status === 'trialing').length} em trial</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Último Evento</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map((ws) => (
                <TableRow
                  key={ws.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedWorkspace(ws)}
                >
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
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(ws.subscription_status)}</TableCell>
                  <TableCell>{getPlanBadge(ws.subscription_plan)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-8">{ws.members_count}</span>
                      <UsageBar
                        current={ws.limits.members.current}
                        max={ws.limits.members.max}
                        label="membros"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-8">{ws.projects_count}</span>
                      <UsageBar
                        current={ws.limits.projects.current}
                        max={ws.limits.projects.max}
                        label="projetos"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeDate(ws.last_activity_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkspace(ws);
                        }}>
                          <Building2 className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({
                              type: ws.subscription_status === 'canceled' ? 'unblock' : 'block',
                              workspace: ws,
                            });
                          }}
                          className={ws.subscription_status === 'canceled' ? 'text-emerald-500' : 'text-destructive'}
                        >
                          {ws.subscription_status === 'canceled' ? (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Reativar
                            </>
                          ) : (
                            <>
                              <Ban className="mr-2 h-4 w-4" />
                              Bloquear
                            </>
                          )}
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

      {/* Workspace Details Drawer */}
      <Sheet open={!!selectedWorkspace} onOpenChange={() => setSelectedWorkspace(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedWorkspace && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle>{selectedWorkspace.name}</SheetTitle>
                    <SheetDescription>/{selectedWorkspace.slug}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedWorkspace.subscription_status)}
                  {getPlanBadge(selectedWorkspace.subscription_plan)}
                </div>

                <Separator />

                {/* Owner */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Owner
                  </h4>
                  {selectedWorkspace.owner ? (
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="font-medium">{selectedWorkspace.owner.full_name || '—'}</p>
                      <p className="text-sm text-muted-foreground">{selectedWorkspace.owner.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem owner definido</p>
                  )}
                </div>

                <Separator />

                {/* Usage vs Limits */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Uso vs Limites
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Membros</span>
                        <span className="text-muted-foreground">
                          {selectedWorkspace.limits.members.current} / {selectedWorkspace.limits.members.max}
                        </span>
                      </div>
                      <Progress
                        value={(selectedWorkspace.limits.members.current / selectedWorkspace.limits.members.max) * 100}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Projetos</span>
                        <span className="text-muted-foreground">
                          {selectedWorkspace.limits.projects.current} / {selectedWorkspace.limits.projects.max}
                        </span>
                      </div>
                      <Progress
                        value={(selectedWorkspace.limits.projects.current / selectedWorkspace.limits.projects.max) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Estatísticas</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-md bg-muted/50 text-center">
                      <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xl font-bold">{selectedWorkspace.members_count}</p>
                      <p className="text-xs text-muted-foreground">Membros</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50 text-center">
                      <FolderKanban className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xl font-bold">{selectedWorkspace.projects_count}</p>
                      <p className="text-xs text-muted-foreground">Projetos</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50 text-center">
                      <CheckSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xl font-bold">{selectedWorkspace.tasks_count}</p>
                      <p className="text-xs text-muted-foreground">Tarefas</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Dates */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Datas</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Criado em</p>
                      <p className="font-medium">{formatDate(selectedWorkspace.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Trial termina</p>
                      <p className="font-medium">{formatDate(selectedWorkspace.trial_ends_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Última atividade</p>
                      <p className="font-medium">{formatDate(selectedWorkspace.last_activity_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'block' ? 'Bloquear workspace?' : 'Reativar workspace?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'block'
                ? `O workspace "${confirmAction.workspace.name}" será bloqueado e os utilizadores não poderão aceder.`
                : `O workspace "${confirmAction?.workspace.name}" será reativado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return;
                blockWorkspace({
                  workspaceId: confirmAction.workspace.id,
                  blocked: confirmAction.type === 'block',
                });
                setConfirmAction(null);
              }}
              disabled={isBlocking}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
