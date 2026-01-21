import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Search,
  Filter,
  User,
  Mail,
  Shield,
  Ban,
  Key,
  ExternalLink,
  MoreHorizontal,
  Building2,
  FolderKanban,
  CheckSquare,
  Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useAdminUsers, AdminUser, UserFilters } from '@/hooks/useAdminUsers';

export function UsersTab() {
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    status: 'all',
    plan: 'all',
    source: 'all',
  });
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'block' | 'unblock' | 'reset';
    user: AdminUser;
  } | null>(null);

  const { users, isLoading, blockUser, sendResetLink, isBlocking, isSendingReset } = useAdminUsers(filters);

  const getStatusBadge = (user: AdminUser) => {
    if (user.is_blocked) {
      return <Badge variant="destructive">Bloqueado</Badge>;
    }
    if (user.subscription?.subscription_status === 'active') {
      return <Badge variant="default">Ativo</Badge>;
    }
    if (user.subscription?.subscription_status === 'trialing') {
      return <Badge variant="secondary">Trial</Badge>;
    }
    if (user.subscription?.subscription_status === 'past_due') {
      return <Badge variant="outline" className="border-orange-500 text-orange-500">Past Due</Badge>;
    }
    return <Badge variant="outline">Sem plano</Badge>;
  };

  const getPlanBadge = (plan?: string) => {
    if (!plan) return <span className="text-muted-foreground">—</span>;
    const colors: Record<string, string> = {
      starter: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      pro: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      studio: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    };
    return (
      <Badge variant="outline" className={colors[plan] || ''}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
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
            placeholder="Pesquisar por email ou nome..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(v) => setFilters({ ...filters, status: v as UserFilters['status'] })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="trialing">Em Trial</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.plan}
          onValueChange={(v) => setFilters({ ...filters, plan: v as UserFilters['plan'] })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="studio">Studio</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.source}
          onValueChange={(v) => setFilters({ ...filters, source: v as UserFilters['source'] })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="public">Público</SelectItem>
            <SelectItem value="invite">Convite</SelectItem>
            <SelectItem value="waitlist">Waitlist</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{users.length} utilizadores</span>
        <span>•</span>
        <span>{users.filter(u => u.subscription?.subscription_status === 'active').length} ativos</span>
        <span>•</span>
        <span>{users.filter(u => u.subscription?.subscription_status === 'trialing').length} em trial</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Registo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedUser(user)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback>
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>{getPlanBadge(user.subscription?.subscription_plan)}</TableCell>
                  <TableCell>
                    <span className="text-sm">{user.workspaces.length}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{user.stats.projects}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeDate(user.last_login_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
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
                          setSelectedUser(user);
                        }}>
                          <User className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({ type: 'reset', user });
                        }}>
                          <Key className="mr-2 h-4 w-4" />
                          Enviar reset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({
                              type: user.is_blocked ? 'unblock' : 'block',
                              user,
                            });
                          }}
                          className={user.is_blocked ? 'text-emerald-500' : 'text-destructive'}
                        >
                          {user.is_blocked ? (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Desbloquear
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

      {/* User Details Drawer */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedUser.avatar_url || ''} />
                    <AvatarFallback>
                      {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{selectedUser.full_name || 'Sem nome'}</SheetTitle>
                    <SheetDescription>{selectedUser.email}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Info */}
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedUser)}
                  {getPlanBadge(selectedUser.subscription?.subscription_plan)}
                  {selectedUser.is_internal_test && (
                    <Badge variant="outline">Conta Teste</Badge>
                  )}
                </div>

                <Separator />

                {/* User Details */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Utilizador
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telefone</p>
                      <p className="font-medium">{selectedUser.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Registo</p>
                      <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Último Acesso</p>
                      <p className="font-medium">{formatDate(selectedUser.last_login_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Origem</p>
                      <p className="font-medium capitalize">{selectedUser.source || 'Público'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Workspaces */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Workspaces ({selectedUser.workspaces.length})
                  </h4>
                  {selectedUser.workspaces.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.workspaces.map((ws) => (
                        <div
                          key={ws.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <span className="text-sm">{ws.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {ws.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem workspaces</p>
                  )}
                </div>

                <Separator />

                {/* Billing */}
                {selectedUser.subscription && (
                  <>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Billing
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Plano</p>
                          <p className="font-medium capitalize">
                            {selectedUser.subscription.subscription_plan}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium capitalize">
                            {selectedUser.subscription.subscription_status}
                          </p>
                        </div>
                        {selectedUser.subscription.stripe_customer_id && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Stripe Customer</p>
                            <p className="font-mono text-xs">
                              {selectedUser.subscription.stripe_customer_id}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Usage Stats */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Uso
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md bg-muted/50 text-center">
                      <FolderKanban className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xl font-bold">{selectedUser.stats.projects}</p>
                      <p className="text-xs text-muted-foreground">Projetos</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50 text-center">
                      <CheckSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xl font-bold">{selectedUser.stats.tasks}</p>
                      <p className="text-xs text-muted-foreground">Tarefas</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Ações Admin</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmAction({ type: 'reset', user: selectedUser })}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Enviar Reset
                    </Button>
                    <Button
                      variant={selectedUser.is_blocked ? 'default' : 'destructive'}
                      size="sm"
                      onClick={() =>
                        setConfirmAction({
                          type: selectedUser.is_blocked ? 'unblock' : 'block',
                          user: selectedUser,
                        })
                      }
                    >
                      {selectedUser.is_blocked ? (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Desbloquear
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Bloquear
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'block' && 'Bloquear Utilizador'}
              {confirmAction?.type === 'unblock' && 'Desbloquear Utilizador'}
              {confirmAction?.type === 'reset' && 'Enviar Link de Reset'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'block' &&
                `Tem a certeza que quer bloquear ${confirmAction.user.email}? O utilizador não conseguirá aceder à plataforma.`}
              {confirmAction?.type === 'unblock' &&
                `Tem a certeza que quer desbloquear ${confirmAction.user.email}?`}
              {confirmAction?.type === 'reset' &&
                `Será enviado um email de reset de password para ${confirmAction.user.email}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'block') {
                  blockUser({ userId: confirmAction.user.id, blocked: true });
                } else if (confirmAction.type === 'unblock') {
                  blockUser({ userId: confirmAction.user.id, blocked: false });
                } else if (confirmAction.type === 'reset') {
                  sendResetLink(confirmAction.user.id);
                }
                setConfirmAction(null);
                setSelectedUser(null);
              }}
              disabled={isBlocking || isSendingReset}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Import at top level
import { CreditCard, Activity } from 'lucide-react';
