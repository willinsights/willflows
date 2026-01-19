import { useConversations, useConversation } from '@/hooks/useConversations';
import { useProjects } from '@/hooks/useProjects';
import { usePresence } from '@/hooks/usePresence';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  X,
  FolderKanban,
  Calendar,
  User,
  Users,
  CheckSquare,
  ExternalLink,
  Euro,
  Hash,
  Lock,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ChatContextPanelProps {
  conversationId: string;
  onClose?: () => void;
}

export function ChatContextPanel({
  conversationId,
  onClose,
}: ChatContextPanelProps) {
  const navigate = useNavigate();
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { members } = useConversation(conversationId);
  const { projects, loading: projectsLoading } = useProjects();
  const { isAdmin } = useWorkspace();
  const { isOnline } = usePresence();

  const conversation = conversations.find((c) => c.id === conversationId);
  const isProjectChat = conversation?.type === 'project';
  const project = isProjectChat
    ? projects.find((p) => p.id === conversation?.project_id)
    : null;

  if (conversationsLoading || projectsLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <Hash className="h-12 w-12 mb-3 opacity-30" />
        <p className="font-medium">Conversa não encontrada</p>
      </div>
    );
  }

  // Channel or DM context
  if (!isProjectChat) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Detalhes</h3>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
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
                <div>
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

            {/* Members */}
            {members.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membros ({members.length})
                </h4>
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
                              {member.profile?.full_name || 'Utilizador'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.profile?.email}
                            </p>
                          </div>
                          {member.role === 'admin' && (
                            <Badge variant="outline" className="text-[10px]">Admin</Badge>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Project Chat context
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold">Projeto</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Project Header Card */}
          {project && (
            <>
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{project.name}</h4>
                    <Badge
                      className="mt-1.5"
                      variant={project.current_phase === 'captacao' ? 'default' : 'secondary'}
                    >
                      {project.current_phase === 'captacao' ? 'Captação' : 'Edição'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-3">
                {project.clients && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium">{project.clients.name}</span>
                  </div>
                )}

                {project.shoot_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Captação:</span>
                    <span className="font-medium">
                      {format(new Date(project.shoot_date), "d MMM yyyy", { locale: pt })}
                    </span>
                  </div>
                )}

                {project.delivery_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Entrega:</span>
                    <span className="font-medium">
                      {format(new Date(project.delivery_date), "d MMM yyyy", { locale: pt })}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Financials (Admin only) */}
              {isAdmin && project.agreed_value && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Euro className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">Financeiro</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {project.agreed_value.toLocaleString('pt-PT')} €
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Valor acordado</p>
                </div>
              )}

              {/* Members */}
              {members.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Equipa ({members.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {members.slice(0, 6).map((member: any) => (
                      <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={member.profile?.avatar_url} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {(member.profile?.full_name || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {members.length > 6 && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        +{members.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Open Tasks Placeholder */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Tarefas Abertas
                </h4>
                <div className="p-3 rounded-lg border border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Funcionalidade em desenvolvimento
                  </p>
                </div>
              </div>

              {/* Shared Links Placeholder */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Links Partilhados
                </h4>
                <div className="p-3 rounded-lg border border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum link partilhado
                  </p>
                </div>
              </div>

              {/* Shared Files Placeholder */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Ficheiros Partilhados
                </h4>
                <div className="p-3 rounded-lg border border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum ficheiro partilhado
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/app/${project.current_phase === 'captacao' ? 'captacao' : 'edicao'}`
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no Kanban
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
