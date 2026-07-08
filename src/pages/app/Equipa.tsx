import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Crown, Shield, Search, MoreHorizontal, Edit, Trash2, Mail, RefreshCw, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InviteMemberForm } from '@/components/team/InviteMemberForm';
import { TeamMemberRow } from '@/components/team/TeamMemberRow';
import { PendingInviteRow } from '@/components/team/PendingInviteRow';
import { AccessDenied } from '@/components/ui/access-denied';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';
import { useRoleLabels, DEFAULT_ROLE_LABELS } from '@/hooks/useRoleLabels';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

type AppRole = Database['public']['Enums']['app_role'];

const ALL_ROLES: AppRole[] = ['admin', 'edicao', 'captacao', 'gestao', 'visualizacao'];

export default function Equipa() {
  // All hooks must be called first, before any conditional returns
  const { canViewTeam } = useFinancialPermissions();
  const { user } = useAuth();
  const { isAdmin } = useWorkspace();
  const { members, loading: membersLoading, refresh: refreshMembers } = useWorkspaceMembers();
  const {
    invitations,
    loading: invitationsLoading,
    refresh: refreshInvitations,
    resendInvitation,
    cancelInvitation,
  } = useWorkspaceInvitations();
  const { toast } = useToast();
  const { getRoleLabel } = useRoleLabels();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Block access for collaborators - after all hooks are called
  if (!canViewTeam) {
    return <AccessDenied description="Apenas administradores e editores podem aceder à gestão de Equipa." />;
  }

  // Stats
  const totalMembers = members.length;
  const adminCount = members.filter((m) => m.role === 'admin').length;
  const pendingCount = invitations.length;

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Role atualizado',
        description: 'O role do membro foi atualizado com sucesso.',
      });

      refreshMembers();
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar role',
        description: err.message || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: 'O membro foi removido do workspace.',
      });

      refreshMembers();
    } catch (err: any) {
      toast({
        title: 'Erro ao remover membro',
        description: err.message || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleResendInvite = async (id: string) => {
    const result = await resendInvitation(id);
    
    if (result.success) {
      toast({
        title: 'Convite reenviado',
        description: result.error || 'O convite foi reenviado com sucesso.',
      });
    } else {
      toast({
        title: 'Erro ao reenviar convite',
        description: result.error || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    }
    
    refreshInvitations();
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await cancelInvitation(id);
      toast({
        title: 'Convite cancelado',
        description: 'O convite foi cancelado com sucesso.',
      });
      refreshInvitations();
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar convite',
        description: err.message || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipa</h1>
          <p className="text-sm text-muted-foreground">Gerir membros e permissões do workspace</p>
        </div>
        {isAdmin && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary w-full sm:w-auto sm:self-start">
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Convidar novo membro</DialogTitle>
                <DialogDescription>
                  Envie um convite por email para adicionar um novo membro ao workspace.
                </DialogDescription>
              </DialogHeader>
              <InviteMemberForm
                onSuccess={() => {
                  setInviteDialogOpen(false);
                  refreshInvitations();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {[
          { label: 'Total de Membros', value: totalMembers, sub: 'membros ativos', icon: Users, iconClass: 'text-muted-foreground' },
          { label: 'Administradores', value: adminCount, sub: 'com acesso total', icon: Crown, iconClass: 'text-primary' },
          { label: 'Convites Pendentes', value: pendingCount, sub: 'a aguardar resposta', icon: Shield, iconClass: 'text-amber-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className={cn("h-4 w-4", stat.iconClass)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg">Membros</CardTitle>
              <CardDescription className="text-sm">
                {filteredMembers.length} membro{filteredMembers.length !== 1 && 's'}
                {invitations.length > 0 && ` • ${invitations.length} pendente${invitations.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar membro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[200px]"
                  aria-label="Pesquisar membro por nome ou email"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Todos os roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os roles</SelectItem>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {/* Mobile card list (<md) */}
          <div className="md:hidden space-y-2 p-3">
            {membersLoading || invitationsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`m-skel-${i}`} className="flex items-center gap-3 rounded-lg border bg-card/60 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))
            ) : filteredMembers.length === 0 && invitations.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Sem membros na equipa"
                description="Convida o primeiro membro para começar a colaborar neste workspace."
                compact
              />
            ) : (
              <>
                {filteredMembers.map((member) => {
                  const isMe = member.user_id === user?.id;
                  const initials = (member.full_name || member.email)
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={`m-card-${member.id}`}
                      className={cn(
                        'rounded-lg border bg-card/60 p-3 flex items-center gap-3',
                        isMe && 'bg-primary/5 border-primary/20'
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate text-sm">
                            {member.full_name || member.email.split('@')[0]}
                          </p>
                          {isMe && (
                            <Badge variant="outline" className="text-[10px] h-5">Você</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {getRoleLabel(member.role as AppRole)}
                          </Badge>
                        </div>
                      </div>
                      {isAdmin && !isMe && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Ações do membro">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {ALL_ROLES.filter((r) => r !== member.role).map((r) => (
                              <DropdownMenuItem
                                key={r}
                                onClick={() => handleRoleChange(member.id, r)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Definir como {getRoleLabel(r)}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover membro
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
                {isAdmin &&
                  invitations.map((invitation) => (
                    <div
                      key={`inv-card-${invitation.id}`}
                      className="rounded-lg border border-dashed bg-muted/30 p-3 flex items-center gap-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{invitation.email}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {getRoleLabel(invitation.role as AppRole)}
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Convite pendente
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Reenviar convite"
                          onClick={() => handleResendInvite(invitation.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Cancelar convite"
                          onClick={() => handleCancelInvite(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>

          {/* Desktop table (≥md) */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Membro</TableHead>
                  <TableHead className="min-w-[100px]">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Especialização</TableHead>
                  <TableHead className="text-right w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading || invitationsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <>
                    {/* Active members */}
                    {filteredMembers.map((member) => (
                      <TeamMemberRow
                        key={member.id}
                        member={member}
                        isCurrentUser={member.user_id === user?.id}
                        canManage={isAdmin}
                        onRoleChange={handleRoleChange}
                        onRemove={handleRemoveMember}
                      />
                    ))}
                    {/* Pending invitations */}
                    {isAdmin &&
                      invitations.map((invitation) => (
                        <PendingInviteRow
                          key={invitation.id}
                          invitation={invitation}
                          onResend={handleResendInvite}
                          onCancel={handleCancelInvite}
                        />
                      ))}
                    {/* Empty state */}
                    {filteredMembers.length === 0 && invitations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <EmptyState
                            icon={Users}
                            title="Sem membros na equipa"
                            description="Convida o primeiro membro para começar a colaborar neste workspace."
                            compact
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
