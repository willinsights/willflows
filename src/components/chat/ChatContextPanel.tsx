import { useConversations } from '@/hooks/useConversations';
import { useProjects } from '@/hooks/useProjects';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  X,
  FolderKanban,
  Calendar,
  User,
  CheckSquare,
  ExternalLink,
  Euro,
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
  const { projects, loading: projectsLoading } = useProjects();
  const { isAdmin } = useWorkspace();

  const conversation = conversations.find((c) => c.id === conversationId);
  const isProjectChat = conversation?.type === 'project';
  const project = isProjectChat
    ? projects.find((p) => p.id === conversation?.project_id)
    : null;

  if (conversationsLoading || projectsLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Conversa não encontrada
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
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Nome</h4>
              <p className="text-sm text-muted-foreground">
                {conversation.name || 'Sem nome'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Tipo</h4>
              <Badge variant="secondary">
                {conversation.type === 'channel' ? 'Canal' : 'Mensagem Direta'}
              </Badge>
            </div>

            {conversation.is_private && (
              <div>
                <Badge variant="outline">Privado</Badge>
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Project Info */}
          {project && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">{project.name}</h4>
                </div>

                <div className="space-y-2 text-sm">
                  {/* Client */}
                  {project.clients && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{project.clients.name}</span>
                    </div>
                  )}

                  {/* Dates */}
                  {project.shoot_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Captação:{' '}
                        {format(new Date(project.shoot_date), 'dd MMM yyyy', {
                          locale: pt,
                        })}
                      </span>
                    </div>
                  )}

                  {project.delivery_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Entrega:{' '}
                        {format(new Date(project.delivery_date), 'dd MMM yyyy', {
                          locale: pt,
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Phase Badge */}
                <div className="mt-3">
                  <Badge
                    variant={
                      project.current_phase === 'captacao'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {project.current_phase === 'captacao' ? 'Captação' : 'Edição'}
                  </Badge>
                </div>
              </div>

              {/* Financials (Admin only) */}
              {isAdmin && project.agreed_value && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Euro className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Financeiro</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      Valor:{' '}
                      <span className="text-foreground font-medium">
                        {project.agreed_value.toLocaleString('pt-PT')} €
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Open Tasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Tarefas Abertas</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Funcionalidade em desenvolvimento
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
