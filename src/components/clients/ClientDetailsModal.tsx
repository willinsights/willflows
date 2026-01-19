import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  User,
  Building2,
  Mail,
  Phone,
  Video,
  MessageSquare,
  FileText,
  Calendar,
  Euro,
  Plus,
  Trash2,
  Users
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useClientCommunications } from '@/hooks/useClientCommunications';
import { useClientNotes } from '@/hooks/useClientNotes';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { CreateCommunicationModal } from './CreateCommunicationModal';
import { CreateNoteModal } from './CreateNoteModal';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  nif?: string | null;
  notes?: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  project_code?: string | null;
  current_phase: string;
  is_delivered: boolean;
  agreed_value?: number | null;
  custo_captacao?: number | null;
  custo_edicao?: number | null;
  custos_extras?: number | null;
  created_at: string;
  delivery_date?: string | null;
  category: string;
  workspace_id: string;
}

interface ClientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  projects: Project[];
}

const phaseLabels: Record<string, string> = {
  captacao: 'Em Captação',
  edicao: 'Em Edição',
};

const categoryColors: Record<string, string> = {
  hotel: 'bg-blue-500',
  experiencia: 'bg-purple-500',
  evento: 'bg-amber-500',
  outro: 'bg-gray-500',
};

const communicationTypeLabels: Record<string, { label: string; icon: typeof Phone }> = {
  call: { label: 'Chamada', icon: Phone },
  email: { label: 'Email', icon: Mail },
  meeting: { label: 'Reunião', icon: Users },
  other: { label: 'Outro', icon: MessageSquare },
};

export function ClientDetailsModal({ open, onOpenChange, client, projects }: ClientDetailsModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { canViewAllFinancials, canViewClientContacts } = useFinancialPermissions();
  const { projectChats, createProjectChat } = useConversations();
  const { user } = useAuth();
  
  const { 
    communications, 
    loading: communicationsLoading, 
    createCommunication,
    deleteCommunication 
  } = useClientCommunications(client?.id || null);
  
  const { 
    notes, 
    loading: notesLoading, 
    createNote,
    deleteNote 
  } = useClientNotes(client?.id || null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency: currentWorkspace?.currency || 'EUR',
    }).format(value);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = projects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const totalCosts = projects.reduce((sum, p) => 
      sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
    const margin = totalRevenue - totalCosts;
    const marginPercent = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;
    const activeProjects = projects.filter(p => !p.is_delivered).length;
    const completedProjects = projects.filter(p => p.is_delivered).length;
    const avgProjectValue = projects.length > 0 ? totalRevenue / projects.length : 0;

    return {
      totalRevenue,
      totalCosts,
      margin,
      marginPercent,
      activeProjects,
      completedProjects,
      avgProjectValue,
      totalProjects: projects.length
    };
  }, [projects]);

  // Monthly evolution data
  const monthlyData = useMemo(() => {
    const months: Record<string, { projects: number; revenue: number }> = {};
    
    projects.forEach(p => {
      const monthKey = format(new Date(p.created_at), 'MM/yyyy');
      if (!months[monthKey]) {
        months[monthKey] = { projects: 0, revenue: 0 };
      }
      months[monthKey].projects++;
      months[monthKey].revenue += p.agreed_value || 0;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
  }, [projects]);

  const handleCreateCommunication = async (data: {
    type: string;
    subject: string;
    description?: string;
    contact_date: string;
  }) => {
    if (!client) return false;
    const result = await createCommunication({
      client_id: client.id,
      ...data,
    });
    return !!result;
  };

  const handleCreateNote = async (content: string) => {
    if (!client) return false;
    const result = await createNote({
      client_id: client.id,
      content,
    });
    return !!result;
  };

  const handleOpenChat = async () => {
    if (!user || projects.length === 0) return;
    setOpeningChat(true);
    
    const attemptId = crypto.randomUUID().slice(0, 8);
    
    try {
      // Get the most recent project for this client
      const recentProject = [...projects].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      
      console.warn(`[ChatDebug ${attemptId}] handleOpenChat START (ClientDetailsModal)`, {
        projectId: recentProject.id,
        projectName: recentProject.name,
        projectWorkspaceId: recentProject.workspace_id,
      });
      
      // Check if conversation exists for this project
      let conversationId = projectChats.find(c => c.project_id === recentProject.id)?.id;
      
      console.warn(`[ChatDebug ${attemptId}] Existing conversation check:`, {
        found: !!conversationId,
        conversationId,
      });
      
      if (!conversationId) {
        // Create new conversation for the project using the project's workspace_id
        const newConversation = await createProjectChat.mutateAsync({
          projectId: recentProject.id,
          projectName: recentProject.name,
          workspaceId: recentProject.workspace_id,
          attemptId,
        });
        conversationId = newConversation.id;
      }
      
      console.warn(`[ChatDebug ${attemptId}] Navigating to:`, `/app/chat/${conversationId}`);
      onOpenChange(false);
      navigate(`/app/chat/${conversationId}`);
    } catch (error) {
      console.error(`[ChatDebug ${attemptId}] ERROR:`, error);
    } finally {
      setOpeningChat(false);
    }
  };

  if (!client) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary">{client.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {client.company && (
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {client.company}
                    </Badge>
                  )}
                  {canViewAllFinancials && (
                    <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
                      <Euro className="h-3 w-3" />
                      {formatCurrency(stats.totalRevenue)} receita
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
                    <Video className="h-3 w-3" />
                    {stats.totalProjects} projetos
                  </Badge>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6">
              <TabsList className="w-full justify-start bg-muted/50">
                <TabsTrigger value="info" className="gap-2">
                  <User className="h-4 w-4" />
                  Informações
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-2">
                  <Video className="h-4 w-4" />
                  Projetos
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {stats.totalProjects}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[60vh]">
                {/* Info Tab */}
                <TabsContent value="info" className="p-6 pt-4 space-y-6 mt-0">
                {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    {canViewClientContacts && client.email && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${client.email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </a>
                      </Button>
                    )}
                    {canViewClientContacts && client.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${client.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Ligar
                        </a>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCommunicationModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Comunicação
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNoteModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nota
                    </Button>
                    {/* Chat button - always visible if there are projects */}
                    {projects.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleOpenChat}
                        disabled={openingChat}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {openingChat ? 'Abrindo...' : 'Chat'}
                      </Button>
                    )}
                  </div>

                  {/* Contact & Company Cards */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Contato</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            {canViewClientContacts ? (
                              client.email ? (
                                <a href={`mailto:${client.email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                              )
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Acesso restrito</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Telefone</p>
                            {canViewClientContacts ? (
                              client.phone ? (
                                <a href={`tel:${client.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {client.phone}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                              )
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Acesso restrito</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Empresa</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Nome da Empresa</p>
                            <p className="text-sm font-medium">{client.company || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cliente desde</p>
                            <p className="text-sm font-medium">
                              {format(new Date(client.created_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Communications History */}
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Comunicações</span>
                          <Badge variant="secondary" className="h-5 px-1.5">
                            {communications.length}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowCommunicationModal(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {communicationsLoading ? (
                        <div className="py-4 text-center text-muted-foreground text-sm">
                          Carregando...
                        </div>
                      ) : communications.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {communications.map((comm) => {
                            const typeInfo = communicationTypeLabels[comm.type] || communicationTypeLabels.other;
                            const TypeIcon = typeInfo.icon;
                            return (
                              <div 
                                key={comm.id} 
                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 group"
                              >
                                <div className="p-1.5 rounded-md bg-primary/10">
                                  <TypeIcon className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{comm.subject}</p>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {typeInfo.label}
                                    </Badge>
                                  </div>
                                  {comm.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                      {comm.description}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {format(new Date(comm.contact_date), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => deleteCommunication(comm.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 text-center">
                          <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhuma comunicação registrada</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Notas</span>
                          <Badge variant="secondary" className="h-5 px-1.5">
                            {notes.length}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowNoteModal(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {notesLoading ? (
                        <div className="py-4 text-center text-muted-foreground text-sm">
                          Carregando...
                        </div>
                      ) : notes.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {notes.map((note) => (
                            <div 
                              key={note.id} 
                              className="p-2 rounded-lg hover:bg-muted/50 group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {format(new Date(note.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={() => deleteNote(note.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center">
                          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhuma nota registrada</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects" className="p-6 pt-4 space-y-6 mt-0">
                  {/* Summary Stats - Compact */}
                  <div className={cn("grid gap-3", canViewAllFinancials ? "grid-cols-4" : "grid-cols-2")}>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold">{stats.totalProjects}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-xl font-bold text-primary">{stats.activeProjects}</p>
                      <p className="text-xs text-muted-foreground">Ativos</p>
                    </div>
                    {canViewAllFinancials && (
                      <>
                        <div className="text-center p-3 rounded-lg bg-success/10">
                          <p className="text-xl font-bold text-success">{formatCurrency(stats.totalRevenue)}</p>
                          <p className="text-xs text-muted-foreground">Receita</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xl font-bold">{stats.marginPercent.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">Margem</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Projects Table */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold">Histórico de Projetos</h4>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium">Data</th>
                            <th className="text-left p-3 font-medium">Projeto</th>
                            <th className="text-left p-3 font-medium">Fase</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            {canViewAllFinancials && (
                              <>
                                <th className="text-right p-3 font-medium">Valor</th>
                                <th className="text-right p-3 font-medium">Margem</th>
                              </>
                            )}
                            <th className="text-center p-3 font-medium">Pagamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.map((project, index) => {
                            const costs = (project.custo_captacao || 0) + (project.custo_edicao || 0) + (project.custos_extras || 0);
                            const margin = (project.agreed_value || 0) - costs;
                            return (
                              <motion.tr 
                                key={project.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="border-t hover:bg-muted/30 transition-colors"
                              >
                                <td className="p-3 text-muted-foreground">
                                  {format(new Date(project.created_at), 'dd/MM/yyyy')}
                                </td>
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{project.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <span className={cn("w-2 h-2 rounded-full", categoryColors[project.category] || 'bg-gray-500')} />
                                      {project.category.charAt(0).toUpperCase() + project.category.slice(1)}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-xs">
                                    {project.current_phase === 'captacao' ? 'Captação' : 'Edição'}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <Badge 
                                    variant={project.is_delivered ? 'secondary' : 'default'}
                                    className={cn(
                                      "text-xs",
                                      project.is_delivered ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-500'
                                    )}
                                  >
                                    {project.is_delivered ? 'Entregue' : phaseLabels[project.current_phase] || 'Em progresso'}
                                  </Badge>
                                </td>
                                {canViewAllFinancials && (
                                  <>
                                    <td className="p-3 text-right font-medium text-success">
                                      {formatCurrency(project.agreed_value || 0)}
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                      {formatCurrency(margin)}
                                    </td>
                                  </>
                                )}
                                <td className="p-3 text-center">
                                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                                    Pendente
                                  </Badge>
                                </td>
                              </motion.tr>
                            );
                          })}
                          {projects.length === 0 && (
                            <tr>
                              <td colSpan={canViewAllFinancials ? 7 : 5} className="p-8 text-center text-muted-foreground">
                                Nenhum projeto encontrado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Monthly Evolution - only for admin */}
                  {canViewAllFinancials && monthlyData.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Evolução Mensal</h4>
                      <div className="space-y-2">
                        {monthlyData.map(([month, data]) => (
                          <div key={month} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-16">{month}</span>
                            <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((data.revenue / stats.totalRevenue) * 100, 100)}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-20 text-right">{data.projects} projetos</span>
                            <span className="text-sm font-medium text-success w-24 text-right">{formatCurrency(data.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateCommunicationModal
        open={showCommunicationModal}
        onOpenChange={setShowCommunicationModal}
        onSubmit={handleCreateCommunication}
      />

      <CreateNoteModal
        open={showNoteModal}
        onOpenChange={setShowNoteModal}
        onSubmit={handleCreateNote}
      />
    </>
  );
}
