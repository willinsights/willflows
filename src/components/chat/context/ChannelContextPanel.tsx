import { useState, useEffect, useMemo } from 'react';
import { useConversations, useConversation } from '@/hooks/useConversations';
import { usePresence } from '@/hooks/usePresence';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  X,
  Users,
  Hash,
  Lock,
  Pencil,
  Trash2,
  UserPlus,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAppToast } from '@/hooks/useAppToast';
import { useQueryClient } from '@tanstack/react-query';

interface ChannelContextPanelProps {
  conversationId: string;
  onClose?: () => void;
}

/**
 * Context panel for channels and DMs (non-project conversations).
 * Extracted from ChatContextPanel — behavior preserved 1:1.
 */
export function ChannelContextPanel({ conversationId, onClose }: ChannelContextPanelProps) {
  const navigate = useNavigate();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const { conversations, addChannelMember, removeChannelMember } = useConversations();
  const { members } = useConversation(conversationId);
  const { isAdmin } = useWorkspace();
  const { isOnline } = usePresence();
  const { members: workspaceMembers } = useWorkspaceMembers();
  const { canViewTeamContacts } = useFinancialPermissions();

  const [showEditChannel, setShowEditChannel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<string>('');
  const [membersOpen, setMembersOpen] = useState(false);

  const conversation = conversations.find((c) => c.id === conversationId);
  const isChannel = conversation?.type === 'channel';

  const availableMembersToAdd = useMemo(() => {
    const currentMemberIds = members.map((m: any) => m.user_id);
    return workspaceMembers.filter((wm) => !currentMemberIds.includes(wm.user_id));
  }, [workspaceMembers, members]);

  useEffect(() => {
    if (conversation?.name) setChannelName(conversation.name);
  }, [conversation?.name]);

  const handleAddMember = async () => {
    if (!memberToAdd || !conversationId) return;
    await addChannelMember.mutateAsync({ conversationId, userId: memberToAdd });
    setMemberToAdd('');
  };

  const handleRemoveMember = async (userId: string) => {
    if (!conversationId) return;
    await removeChannelMember.mutateAsync({ conversationId, userId });
  };

  const handleUpdateChannel = async () => {
    if (!channelName.trim() || !conversationId) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ name: channelName.trim() })
        .eq('id', conversationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Canal actualizado');
      setShowEditChannel(false);
    } catch (error: any) {
      toast.error('Erro ao actualizar canal', { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!conversationId) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Canal eliminado');
      navigate('/app/chat');
    } catch (error: any) {
      toast.error('Erro ao eliminar canal', { description: error.message });
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!conversation) return null;

  return (
    <div className="flex flex-col h-full min-w-0 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/40 backdrop-blur-sm">
        <h3 className="font-semibold">Detalhes</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 min-w-0 overflow-x-hidden">
          {/* Header Card */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              {conversation.type === 'dm' ? (
                <Avatar className="h-12 w-12">
                  <AvatarImage src={conversation.dmParticipant?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {(conversation.displayName || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  {conversation.is_private ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Hash className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-semibold">
                  {conversation.displayName || conversation.name || 'Sem nome'}
                </h4>
                <Badge variant="secondary" className="mt-1">
                  {conversation.type === 'channel' ? 'Canal' : 'Mensagem Direta'}
                </Badge>
              </div>
            </div>

            {conversation.is_private && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span>Canal privado</span>
              </div>
            )}
          </div>

          {/* Channel Management Buttons */}
          {isChannel && isAdmin && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowEditChannel(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          )}

          {/* Members - Collapsible */}
          {members.length > 0 && (
            <Collapsible open={membersOpen} onOpenChange={setMembersOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full group">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membros ({members.length})
                </h4>
                {membersOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="space-y-2">
                  {members.map((member: any) => {
                    const memberIsOnline = isOnline(member.user_id);
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profile?.avatar_url} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {(member.profile?.full_name || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ${
                              memberIsOnline ? 'bg-success' : 'bg-muted-foreground/40'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.profile?.full_name || 'Membro'}
                          </p>
                          {canViewTeamContacts && member.profile?.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.profile?.email}
                            </p>
                          )}
                        </div>
                        {member.role === 'admin' && (
                          <Badge variant="outline" className="text-[10px]">Admin</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      {/* Edit Channel Dialog */}
      <Dialog open={showEditChannel} onOpenChange={setShowEditChannel}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Canal</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Nome do Canal</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Nome do canal"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membros do Canal ({members.length})
              </Label>
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-1">
                  {members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.profile?.avatar_url} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(member.profile?.full_name || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.full_name || member.profile?.email?.split('@')[0] || 'Membro'}
                        </p>
                      </div>
                      {member.role === 'admin' ? (
                        <Badge variant="outline" className="text-[10px]">Admin</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removeChannelMember.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {availableMembersToAdd.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Adicionar Membro
                </Label>
                <div className="flex gap-2">
                  <Select value={memberToAdd} onValueChange={setMemberToAdd}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar membro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembersToAdd.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {(member.full_name || 'U').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.full_name || member.email?.split('@')[0]}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    onClick={handleAddMember}
                    disabled={!memberToAdd || addChannelMember.isPending}
                  >
                    {addChannelMember.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditChannel(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateChannel} disabled={isUpdating || !channelName.trim()}>
              {isUpdating ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Canal</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres eliminar o canal "{conversation.name}"? Esta acção não pode ser revertida e todas as mensagens serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteChannel}
              disabled={isUpdating}
            >
              {isUpdating ? 'A eliminar...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
