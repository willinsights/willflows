import { useState } from 'react';
import { MoreHorizontal, Shield, Edit, Trash2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { TableCell, TableRow } from '@/components/ui/table';
import type { WorkspaceMember } from '@/hooks/useWorkspaceMembers';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useRoleLabels } from '@/hooks/useRoleLabels';

type AppRole = Database['public']['Enums']['app_role'];

const roleColors: Record<AppRole, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  editor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  captacao: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  freelancer: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  visualizador: 'bg-muted text-muted-foreground border-border',
};

interface TeamMemberRowProps {
  member: WorkspaceMember;
  isCurrentUser: boolean;
  canManage: boolean;
  onRoleChange: (memberId: string, newRole: AppRole) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

export function TeamMemberRow({
  member,
  isCurrentUser,
  canManage,
  onRoleChange,
  onRemove,
}: TeamMemberRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [loading, setLoading] = useState(false);
  const { canViewTeamContacts } = useFinancialPermissions();
  const { getRoleLabel } = useRoleLabels();

  const roleColor = roleColors[member.role as AppRole] || roleColors.visualizador;

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const censorEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    return `${local.slice(0, 2)}***@${domain.slice(0, 2)}***`;
  };

  const handleRoleChange = async (newRole: string) => {
    setLoading(true);
    try {
      await onRoleChange(member.id, newRole as AppRole);
    } finally {
      setLoading(false);
      setEditing(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      await onRemove(member.id);
    } finally {
      setLoading(false);
      setConfirmRemove(false);
    }
  };

  return (
    <>
      <TableRow className={cn(isCurrentUser && 'bg-primary/5')}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-[30px] w-[30px]">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(member.full_name, member.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {member.full_name || member.email.split('@')[0]}
                </p>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    Você
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {canViewTeamContacts || isCurrentUser ? member.email : censorEmail(member.email)}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {editing ? (
            <Select
              defaultValue={member.role}
              onValueChange={handleRoleChange}
              disabled={loading}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(roleColors).map((value) => (
                  <SelectItem key={value} value={value}>
                    {getRoleLabel(value as AppRole)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className={cn('font-normal', roleColor)}>
              {getRoleLabel(member.role as AppRole)}
            </Badge>
          )}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {member.specialization?.length ? (
            <div className="flex flex-wrap gap-1">
              {member.specialization.slice(0, 2).map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
              {member.specialization.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{member.specialization.length - 2}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {canManage && !isCurrentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Alterar role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setConfirmRemove(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover membro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              {member.full_name || member.email} será removido do workspace e perderá acesso a
              todos os projetos e dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'A remover...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
