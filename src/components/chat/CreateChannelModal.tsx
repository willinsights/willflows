import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Hash, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '@/hooks/useAppToast';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChannelModal({
  open,
  onOpenChange,
}: CreateChannelModalProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { members: workspaceMembers, loading: membersLoading } = useWorkspaceMembers();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Filter out current user from the selection list
  const availableMembers = workspaceMembers.filter(m => m.user_id !== user?.id);

  const handleToggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === availableMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(availableMembers.map(m => m.user_id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user?.id || !workspace?.id) return;

    setIsCreating(true);
    try {
      // Create the conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          workspace_id: workspace.id,
          type: 'channel' as const,
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          is_private: isPrivate,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add creator as admin + selected members
      const membersToInsert = [
        { conversation_id: conversation.id, user_id: user.id, role: 'admin' },
        ...selectedMembers.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId,
          role: 'member',
        })),
      ];

      const { error: membersError } = await supabase
        .from('conversation_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      queryClient.invalidateQueries({ queryKey: ['conversations', workspace.id] });
      toast.success('Canal criado');
      handleClose();
    } catch (error: any) {
      toast.error('Erro ao criar canal', { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setIsPrivate(false);
    setSelectedMembers([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Criar Canal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Nome do Canal</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                #
              </span>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="geral"
                className="pl-7"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O nome será convertido para minúsculas sem espaços
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="private-channel">Canal Privado</Label>
              <p className="text-xs text-muted-foreground">
                Apenas membros convidados podem ver este canal
              </p>
            </div>
            <Switch
              id="private-channel"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membros ({selectedMembers.length})
              </Label>
              {availableMembers.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  {selectedMembers.length === availableMembers.length ? 'Desselecionar Todos' : 'Selecionar Todos'}
                </Button>
              )}
            </div>
            
            {membersLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Não há outros membros no workspace
              </p>
            ) : (
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-1">
                  {availableMembers.map((member) => (
                    <label
                      key={member.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member.user_id)}
                        onCheckedChange={() => handleToggleMember(member.user_id)}
                      />
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(member.full_name || member.email || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.full_name || member.email?.split('@')[0] || 'Membro'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isCreating}
            >
              {isCreating && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Canal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
