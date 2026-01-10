import { useState } from 'react';
import { Mail, MoreHorizontal, RefreshCw, Trash2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { WorkspaceInvitation } from '@/hooks/useWorkspaceInvitations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  captacao: 'Captação',
  freelancer: 'Freelancer',
  visualizador: 'Visualizador',
};

interface PendingInviteRowProps {
  invitation: WorkspaceInvitation;
  onResend: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}

export function PendingInviteRow({ invitation, onResend, onCancel }: PendingInviteRowProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState(false);

  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < new Date();
  const timeLeft = formatDistanceToNow(expiresAt, { addSuffix: true, locale: ptBR });

  const handleResend = async () => {
    setLoading(true);
    try {
      await onResend(invitation.id);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await onCancel(invitation.id);
    } finally {
      setLoading(false);
      setConfirmCancel(false);
    }
  };

  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{invitation.email}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className={cn(isExpired && 'text-destructive')}>
                  {isExpired ? 'Expirado' : `Expira ${timeLeft}`}
                </span>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-normal bg-amber-500/10 text-amber-600 border-amber-500/20">
            {roleLabels[invitation.role]} (pendente)
          </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <span className="text-muted-foreground text-sm">—</span>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleResend} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                Reenviar convite
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmCancel(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Cancelar convite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O convite para {invitation.email} será cancelado e o link deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'A cancelar...' : 'Cancelar convite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
