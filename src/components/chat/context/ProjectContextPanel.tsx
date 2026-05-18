import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useChatContextData } from '@/hooks/chat/useChatContextData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  X,
  FolderKanban,
  Calendar,
  User,
  Users,
  CheckSquare,
  ExternalLink,
  Euro,
  FileText,
  Link as LinkIcon,
  Download,
  Image,
  FileIcon,
  Video,
  Music,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface ProjectContextPanelProps {
  conversationId: string;
  onClose?: () => void;
}

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return <FileIcon className="h-4 w-4" />;
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'alta':
      return 'text-destructive';
    case 'media':
      return 'text-warning';
    default:
      return 'text-muted-foreground';
  }
};

/**
 * Context panel for project chats.
 * Extracted from ChatContextPanel — behavior preserved 1:1.
 */
export function ProjectContextPanel({ conversationId, onClose }: ProjectContextPanelProps) {
  const navigate = useNavigate();
  const { conversations } = useConversations();
  const { projects } = useProjects();
  const { isAdmin } = useWorkspace();

  const conversation = conversations.find((c) => c.id === conversationId);
  const project = projects.find((p) => p.id === conversation?.project_id);

  const { projectTeam, openTasks, sharedLinks, sharedFiles, loadingExtras } = useChatContextData({
    enabled: !!project,
    projectId: project?.id,
    conversationId,
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    team: false,
    tasks: true,
    links: false,
    files: false,
  });
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="flex flex-col h-full min-w-0 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/40 backdrop-blur-sm">
        <h3 className="font-semibold">Projeto</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 min-w-0 overflow-x-hidden">
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
                      {format(new Date(project.shoot_date), 'd MMM yyyy', { locale: pt })}
                    </span>
                  </div>
                )}

                {project.delivery_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Entrega:</span>
                    <span className="font-medium">
                      {format(new Date(project.delivery_date), 'd MMM yyyy', { locale: pt })}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

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

              {/* Project Team */}
              <Collapsible open={expandedSections.team} onOpenChange={() => toggleSection('team')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full group">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Equipa do Projeto ({projectTeam.length})
                  </h4>
                  {expandedSections.team ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  {loadingExtras ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : projectTeam.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum membro na equipa</p>
                  ) : (
                    <div className="space-y-2">
                      {projectTeam.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {(member.profile?.full_name || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.profile?.full_name || 'Utilizador'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.phase === 'captacao' ? 'Captação' : 'Edição'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Open Tasks */}
              <Collapsible open={expandedSections.tasks} onOpenChange={() => toggleSection('tasks')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full group min-w-0">
                  <h4 className="text-sm font-medium flex items-center gap-2 min-w-0 flex-1">
                    <CheckSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">Tarefas Abertas ({openTasks.length})</span>
                  </h4>
                  {expandedSections.tasks ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  {loadingExtras ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : openTasks.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed border-border text-center">
                      <p className="text-sm text-muted-foreground break-words">
                        Nenhuma tarefa pendente 🎉
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {openTasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/app/${project.current_phase}`, { state: { openTaskId: task.id } })}
                        >
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[10px] ${getPriorityColor(task.priority)}`}>
                              {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
                            </Badge>
                            {task.due_date && (
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(task.due_date), 'd MMM', { locale: pt })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Shared Links */}
              <Collapsible open={expandedSections.links} onOpenChange={() => toggleSection('links')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full group min-w-0">
                  <h4 className="text-sm font-medium flex items-center gap-2 min-w-0 flex-1">
                    <LinkIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">Links Partilhados ({sharedLinks.length})</span>
                  </h4>
                  {expandedSections.links ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  {loadingExtras ? (
                    <Skeleton className="h-16 w-full" />
                  ) : sharedLinks.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed border-border text-center">
                      <p className="text-sm text-muted-foreground break-words">
                        Nenhum link partilhado
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sharedLinks.map((link, index) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group min-w-0"
                        >
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ExternalLink className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary">
                              {new URL(link.url).hostname}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {link.userName} • {format(new Date(link.createdAt), 'd MMM', { locale: pt })}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Shared Files */}
              <Collapsible open={expandedSections.files} onOpenChange={() => toggleSection('files')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full group min-w-0">
                  <h4 className="text-sm font-medium flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">Ficheiros Partilhados ({sharedFiles.length})</span>
                  </h4>
                  {expandedSections.files ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  {loadingExtras ? (
                    <Skeleton className="h-16 w-full" />
                  ) : sharedFiles.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed border-border text-center">
                      <p className="text-sm text-muted-foreground break-words">
                        Nenhum ficheiro partilhado
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sharedFiles.map((file) => (
                        <a
                          key={file.id}
                          href={file.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group min-w-0"
                        >
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            {getFileIcon(file.mime_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary">
                              {file.file_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {formatFileSize(file.file_size)} • {file.userName}
                            </p>
                          </div>
                          <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Actions */}
              <div className="pt-4 pb-2">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() =>
                    navigate(`/app/${project.current_phase === 'captacao' ? 'captacao' : 'edicao'}`)
                  }
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="truncate">Ver no Kanban</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
