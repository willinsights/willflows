import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, X, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';
import { useRoleLabels, INVITE_ROLES, DEFAULT_ROLE_LABELS } from '@/hooks/useRoleLabels';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function AccountTeamTab() {
  const { user } = useAuth();
  const { isAdmin } = useWorkspace();
  const { toast } = useToast();
  const { members, loading: membersLoading, refresh: refreshMembers } = useWorkspaceMembers();
  const { 
    invitations, 
    loading: invitationsLoading, 
    createInvitation, 
    cancelInvitation, 
    resendInvitation,
  } = useWorkspaceInvitations();
  const { getRoleLabel } = useRoleLabels();
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('editor');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    const result = await createInvitation(inviteEmail.trim(), inviteRole);
    setInviting(false);

    if (result.success) {
      toast({
        title: 'Convite enviado',
        description: `Convite enviado para ${inviteEmail}`,
      });
      setInviteEmail('');
      setInviteRole('editor');
    } else {
      toast({
        title: 'Erro ao enviar convite',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId);
    if (result.success) {
      toast({ title: 'Convite cancelado' });
    } else {
      toast({
        title: 'Erro ao cancelar convite',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    const result = await resendInvitation(invitationId);
    if (result.success) {
      toast({ title: 'Convite reenviado' });
    } else {
      toast({
        title: 'Erro ao reenviar convite',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Invite Form */}
      {isAdmin && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Convidar Membro</p>
          <div className="flex gap-2">
            <Input 
              placeholder="email@exemplo.com" 
              className="flex-1" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviting}
            />
            <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as AppRole)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITE_ROLES.map(role => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="gradient-primary"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Convidar'}
            </Button>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {isAdmin && invitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Convites Pendentes
          </p>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                    {invitation.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expira {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true, locale: pt })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">{getRoleLabel(invitation.role)}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleResendInvitation(invitation.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Current Members */}
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Membros ({members.length})
        </p>
        {membersLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.full_name || member.email || 'Utilizador'}
                      {member.user_id === user?.id && (
                        <span className="text-muted-foreground ml-1">(você)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getRoleLabel(member.role as AppRole)}
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
