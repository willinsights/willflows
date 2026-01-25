import { useState, useEffect, useMemo } from 'react';
import { useConversations, useConversation } from '@/hooks/useConversations';
import { useProjects } from '@/hooks/useProjects';
import { usePresence } from '@/hooks/usePresence';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Pencil,
  Trash2,
  Download,
  Image,
  FileIcon,
  Video,
  Music,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAppToast } from '@/hooks/useAppToast';
import { useQueryClient } from '@tanstack/react-query';

interface ChatContextPanelProps {
  conversationId: string;
  onClose?: () => void;
}

interface ProjectTeamMember {
  id: string;
  user_id: string;
  phase: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
}

interface OpenTask {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
}

interface SharedLink {
  url: string;
  userName: string;
  createdAt: string;
}

interface SharedFile {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  userName: string;
  createdAt: string;
}

export function ChatContextPanel({
  conversationId,
  onClose,
}: ChatContextPanelProps) {
  const navigate = useNavigate();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { conversations, isLoading: conversationsLoading, addChannelMember, removeChannelMember } = useConversations();
  const { members } = useConversation(conversationId);
  const { projects, loading: projectsLoading } = useProjects();
  const { isAdmin, currentWorkspace } = useWorkspace();
  const { isOnline } = usePresence();
  const { members: workspaceMembers } = useWorkspaceMembers();
  const { canViewTeamContacts } = useFinancialPermissions();

  // State for project-specific data
  const [projectTeam, setProjectTeam] = useState<ProjectTeamMember[]>([]);
  const [openTasks, setOpenTasks] = useState<OpenTask[]>([]);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // State for channel management
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<string>('');

  const conversation = conversations.find((c) => c.id === conversationId);
  const isProjectChat = conversation?.type === 'project';
  const isChannel = conversation?.type === 'channel';
  const project = isProjectChat
    ? projects.find((p) => p.id === conversation?.project_id)
    : null;

  // Get members not yet in the channel for adding
  const availableMembersToAdd = useMemo(() => {
    const currentMemberIds = members.map((m: any) => m.user_id);
    return workspaceMembers.filter(wm => !currentMemberIds.includes(wm.user_id));
  }, [workspaceMembers, members]);

  const handleAddMember = async () => {
    if (!memberToAdd || !conversationId) return;
    await addChannelMember.mutateAsync({ conversationId, userId: memberToAdd });
    setMemberToAdd('');
  };

  const handleRemoveMember = async (userId: string) => {
    if (!conversationId) return;
    await removeChannelMember.mutateAsync({ conversationId, userId });
  };

  // Fetch project-specific data
  useEffect(() => {
    if (!isProjectChat || !project) return;

    const fetchProjectData = async () => {
      setLoadingExtras(true);
      try {
        // Fetch project team
        const { data: teamData } = await supabase
          .from('project_team')
          .select('id, user_id, phase')
          .eq('project_id', project.id);

        if (teamData && teamData.length > 0) {
          const userIds = teamData.map(t => t.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .in('id', userIds);

          const profilesMap: Record<string, any> = {};
          (profiles || []).forEach(p => { profilesMap[p.id] = p; });

          setProjectTeam(teamData.map(t => ({
            ...t,
            profile: profilesMap[t.user_id] || null
          })));
        } else {
          setProjectTeam([]);
        }

        // Fetch open tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, priority, due_date')
          .eq('project_id', project.id)
          .eq('is_completed', false)
          .order('priority', { ascending: false })
          .limit(5);

        setOpenTasks(tasksData || []);

        // Fetch messages to extract links and files
        const { data: messagesData } = await supabase
          .from('messages')
          .select('id, body, user_id, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(100);

        // Get user profiles for messages
        const msgUserIds = [...new Set((messagesData || []).map(m => m.user_id))];
        let msgProfilesMap: Record<string, string> = {};
        if (msgUserIds.length > 0) {
          const { data: msgProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', msgUserIds);
          (msgProfiles || []).forEach(p => { 
            msgProfilesMap[p.id] = p.full_name || 'Utilizador'; 
          });
        }

        // Extract URLs from messages
        const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
        const links: SharedLink[] = [];
        (messagesData || []).forEach(msg => {
          const urls = msg.body.match(urlRegex) || [];
          urls.forEach(url => {
            if (!links.some(l => l.url === url)) {
              links.push({
                url,
                userName: msgProfilesMap[msg.user_id] || 'Utilizador',
                createdAt: msg.created_at
              });
            }
          });
        });
        setSharedLinks(links.slice(0, 10));

        // Fetch attachments
        const { data: attachmentsData } = await supabase
          .from('message_attachments')
          .select('id, file_name, file_path, mime_type, file_size, message_id, created_at')
          .in('message_id', (messagesData || []).map(m => m.id))
          .order('created_at', { ascending: false })
          .limit(10);

        const msgMap: Record<string, any> = {};
        (messagesData || []).forEach(m => { msgMap[m.id] = m; });

        setSharedFiles((attachmentsData || []).map(a => ({
          ...a,
          userName: msgProfilesMap[msgMap[a.message_id]?.user_id] || 'Utilizador',
          createdAt: a.created_at || ''
        })));
      } catch (error) {
        console.error('Error fetching project data:', error);
      } finally {
        setLoadingExtras(false);
      }
    };

    fetchProjectData();
  }, [isProjectChat, project?.id, conversationId]);

  // Set initial channel name
  useEffect(() => {
    if (conversation?.name) {
      setChannelName(conversation.name);
    }
  }, [conversation?.name]);

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
      case 'alta': return 'text-destructive';
      case 'media': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

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
      <div className="flex flex-col h-full bg-card/60 backdrop-blur-sm border-l border-border/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/40 backdrop-blur-sm">
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
              </div>
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
              {/* Channel Name */}
              <div className="space-y-2">
                <Label>Nome do Canal</Label>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Nome do canal"
                />
              </div>

              {/* Current Members */}
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

              {/* Add New Members */}
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

  // Project Chat context
  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-sm border-l border-border/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/40 backdrop-blur-sm">
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

              {/* Project Team */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Equipa do Projeto ({projectTeam.length})
                </h4>
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
              </div>

              {/* Open Tasks */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Tarefas Abertas ({openTasks.length})
                </h4>
                {loadingExtras ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : openTasks.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-border text-center">
                    <p className="text-sm text-muted-foreground">
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
                              {format(new Date(task.due_date), "d MMM", { locale: pt })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared Links */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Links Partilhados ({sharedLinks.length})
                </h4>
                {loadingExtras ? (
                  <Skeleton className="h-16 w-full" />
                ) : sharedLinks.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-border text-center">
                    <p className="text-sm text-muted-foreground">
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
                        className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                      >
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary">
                            {new URL(link.url).hostname}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {link.userName} • {format(new Date(link.createdAt), "d MMM", { locale: pt })}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared Files */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Ficheiros Partilhados ({sharedFiles.length})
                </h4>
                {loadingExtras ? (
                  <Skeleton className="h-16 w-full" />
                ) : sharedFiles.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-border text-center">
                    <p className="text-sm text-muted-foreground">
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
                        className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
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
              </div>

              {/* Actions */}
              <div className="pt-4 pb-2">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() =>
                    navigate(
                      `/app/${project.current_phase === 'captacao' ? 'captacao' : 'edicao'}`
                    )
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
