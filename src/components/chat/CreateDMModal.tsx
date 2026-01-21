import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, MessageSquare, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { toast } from 'sonner';

interface CreateDMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDMModal({ open, onOpenChange }: CreateDMModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members, loading: loadingMembers } = useWorkspaceMembers();
  const { createDM } = useConversations();
  const { canViewTeamContacts } = useFinancialPermissions();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  // Filter out current user and apply search
  const filteredMembers = members
    .filter((m) => m.user_id !== user?.id)
    .filter((m) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        m.full_name?.toLowerCase().includes(searchLower) ||
        m.email?.toLowerCase().includes(searchLower)
      );
    });

  const handleSelectMember = async (memberId: string) => {
    if (!createDM) return;
    
    setCreating(memberId);
    try {
      const conversation = await createDM.mutateAsync(memberId);
      onOpenChange(false);
      
      // Show feedback if conversation already existed
      if (conversation.isExisting) {
        toast.info('Conversa existente', { 
          description: 'Já tens uma conversa com este utilizador' 
        });
      }
      
      navigate(`/app/chat/${conversation.id}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Nova Mensagem Direta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar membro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[300px]">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {search ? 'Nenhum membro encontrado' : 'Nenhum membro disponível'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 pr-4">
                {filteredMembers.map((member) => (
                  <Button
                    key={member.user_id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-3"
                    disabled={creating !== null}
                    onClick={() => handleSelectMember(member.user_id)}
                  >
                    <Avatar className="h-9 w-9 mr-3">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(member.full_name || member.email || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">
                        {member.full_name || 'Membro'}
                      </p>
                      {canViewTeamContacts && member.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      )}
                    </div>
                    {creating === member.user_id && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
