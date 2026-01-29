import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Edit, Trash2, CheckCircle, Calendar, MapPin, User, Clock, 
  Link as LinkIcon, AlertTriangle, CheckSquare, Save, X,
  ExternalLink, Video, Camera, Film, DollarSign, Users, Check, FileText, Folder, MessageSquare, Play, Copy, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useCategories } from '@/hooks/useCategories';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/hooks/useKanban';
import type { Tables } from '@/integrations/supabase/types';
import { ProjectChecklistTab } from './ProjectChecklistTab';
import { ProjectMediaTab } from './ProjectMediaTab';
import { ProjectFinancialTab } from './ProjectFinancialTab';
import { ProjectTimelineTab } from './ProjectTimelineTab';
import { ChecklistPendingAlert } from './ChecklistPendingAlert';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { VideoProductionTab } from '@/components/video-production/VideoProductionTab';

type Task = Tables<'tasks'>;
type TaskChecklist = Tables<'task_checklists'>;
type MediaLink = Tables<'project_media_links'>;
type ProjectTeam = Tables<'project_team'>;

interface ProjectDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithClient | null;
  onUpdate: () => void;
  onSilentUpdate?: () => void;
}

const priorityOptions = [
  { value: 'baixa', label: 'Baixa', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
  { value: 'media', label: 'Média', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-500/20 text-red-500 border-red-500/30' },
];

const typeOptions = [
  { value: 'fotografia', label: 'Fotografia', icon: Camera },
  { value: 'video', label: 'Vídeo', icon: Film },
  { value: 'foto_video', label: 'Foto + Vídeo', icon: Camera },
];

const categoryOptions = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'experiencia', label: 'Experiência' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' },
];

const itemTypeLabels: Record<string, string> = {
  projeto_captacao: 'Projeto de Captação',
  projeto_edicao: 'Projeto de Edição',
  projeto_completo: 'Captação + Edição',
  reuniao: 'Reunião/Compromisso',
};

const itemTypeOptions = [
  { value: 'projeto_captacao', label: 'Projeto de Captação' },
  { value: 'projeto_edicao', label: 'Projeto de Edição' },
  { value: 'projeto_completo', label: 'Captação + Edição' },
  { value: 'reuniao', label: 'Reunião/Compromisso' },
];

export function ProjectDetailsModal({ open, onOpenChange, project, onUpdate, onSilentUpdate }: ProjectDetailsModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { duplicateProject } = useProjects();
  const { clients } = useClients();
  const { categories } = useCategories();
  const { members: workspaceMembers } = useWorkspaceMembers();
  const { isAdmin } = useWorkspace();
  const { canViewOwnFinancials } = useFinancialPermissions();
  const { hasFeatureAccess, loading: planLoading } = usePlanFeatures();
  const { projectChats, createProjectChat } = useConversations();
  const { user } = useAuth();
  const [openingChat, setOpeningChat] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);
  const [projectTeam, setProjectTeam] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingChecklistItems, setPendingChecklistItems] = useState<TaskChecklist[]>([]);
  const [responsaveisCaptacao, setResponsaveisCaptacao] = useState<string[]>([]);
  const [responsaveisEdicao, setResponsaveisEdicao] = useState<string[]>([]);
  
  // Full edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    item_type: 'projeto_completo' as 'projeto_captacao' | 'projeto_edicao' | 'projeto_completo' | 'reuniao',
    project_code: '',
    client_id: '',
    type: 'fotografia' as 'fotografia' | 'video' | 'foto_video',
    category: 'outro' as 'hotel' | 'experiencia' | 'evento' | 'outro',
    custom_category_id: '',
    priority: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    shoot_date: null as Date | null,
    delivery_date: null as Date | null,
    shoot_start_time: '',
    shoot_end_time: '',
    city: '',
    address: '',
    agreed_value: 0,
    custo_captacao: 0,
    custo_edicao: 0,
    custos_extras: 0,
    notes: '',
    internal_notes: '',
    drive_folder_url: '',
    dropbox_folder_url: '',
    google_meet_url: '',
  });

  // Initialize form when project changes
  useEffect(() => {
    if (project && open) {
      fetchRelatedData();
      setEditForm({
        name: project.name,
        item_type: (project.item_type as 'projeto_captacao' | 'projeto_edicao' | 'projeto_completo' | 'reuniao') || 'projeto_completo',
        project_code: project.project_code || '',
        client_id: project.client_id || '',
        type: project.type,
        category: project.category,
        custom_category_id: project.custom_category_id || '',
        priority: project.priority,
        shoot_date: project.shoot_date ? new Date(project.shoot_date) : null,
        delivery_date: project.delivery_date ? new Date(project.delivery_date) : null,
        shoot_start_time: project.shoot_start_time || '',
        shoot_end_time: project.shoot_end_time || '',
        city: project.city || '',
        address: project.address || '',
        agreed_value: project.agreed_value || 0,
        custo_captacao: project.custo_captacao || 0,
        custo_edicao: project.custo_edicao || 0,
        custos_extras: (project as any).custos_extras || 0,
        notes: project.notes || '',
        internal_notes: project.internal_notes || '',
        drive_folder_url: project.drive_folder_url || '',
        dropbox_folder_url: project.dropbox_folder_url || '',
        google_meet_url: project.google_meet_url || '',
      });
      setIsEditing(false);
    }
  }, [project, open]);


  const fetchRelatedData = async () => {
    if (!project) return;
    
    try {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('position');
      
      setTasks(tasksData || []);
      
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: checklistData } = await supabase
          .from('task_checklists')
          .select('*')
          .in('task_id', taskIds)
          .order('position');
        
        setChecklists(checklistData || []);
      } else {
        setChecklists([]);
      }

      const { data: linksData } = await supabase
        .from('project_media_links')
        .select('*')
        .eq('project_id', project.id);
      
      setMediaLinks(linksData || []);

      // Fetch project team members
      const { data: teamData } = await supabase
        .from('project_team')
        .select('*')
        .eq('project_id', project.id);
      
      setProjectTeam(teamData || []);
      
      // Set responsáveis based on phase
      const captacaoMembers = (teamData || []).filter(t => t.phase === 'captacao').map(t => t.user_id);
      const edicaoMembers = (teamData || []).filter(t => t.phase === 'edicao').map(t => t.user_id);
      setResponsaveisCaptacao(captacaoMembers);
      setResponsaveisEdicao(edicaoMembers);
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  // Get the first task ID for the project (for checklist creation)
  const firstTaskId = tasks.length > 0 ? tasks[0].id : null;

  const handleSaveEdit = async () => {
    if (!project) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editForm.name,
          item_type: editForm.item_type,
          project_code: editForm.project_code || null,
          client_id: editForm.client_id || null,
          type: editForm.type,
          category: editForm.category,
          custom_category_id: editForm.custom_category_id || null,
          priority: editForm.priority,
          shoot_date: editForm.shoot_date ? format(editForm.shoot_date, 'yyyy-MM-dd') : null,
          delivery_date: editForm.delivery_date ? format(editForm.delivery_date, 'yyyy-MM-dd') : null,
          shoot_start_time: editForm.shoot_start_time || null,
          shoot_end_time: editForm.shoot_end_time || null,
          city: editForm.city || null,
          address: editForm.address || null,
          agreed_value: editForm.agreed_value,
          custo_captacao: editForm.custo_captacao,
          custo_edicao: editForm.custo_edicao,
          custos_extras: editForm.custos_extras,
          notes: editForm.notes || null,
          internal_notes: editForm.internal_notes || null,
          drive_folder_url: editForm.drive_folder_url || null,
          dropbox_folder_url: editForm.dropbox_folder_url || null,
          google_meet_url: editForm.google_meet_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);
      
      if (error) throw error;

      // Fetch existing team payments before deleting (to preserve manual edits)
      const { data: existingTeam } = await supabase
        .from('project_team')
        .select('user_id, phase, payment_amount, payment_status')
        .eq('project_id', project.id);

      // Calculate auto values
      const custoCaptacaoTotal = editForm.custo_captacao || 0;
      const custoEdicaoTotal = editForm.custo_edicao || 0;
      const valorPorCaptador = responsaveisCaptacao.length > 0 
        ? custoCaptacaoTotal / responsaveisCaptacao.length 
        : 0;
      const valorPorEditor = responsaveisEdicao.length > 0 
        ? custoEdicaoTotal / responsaveisEdicao.length 
        : 0;

      // Helper to get existing payment or calculate new
      const getPaymentData = (userId: string, phase: string, autoValue: number) => {
        const existing = existingTeam?.find(t => t.user_id === userId && t.phase === phase);
        // If member already existed AND had a manual value set, preserve it
        if (existing && existing.payment_amount !== null) {
          return { 
            payment_amount: existing.payment_amount, 
            payment_status: existing.payment_status || 'pendente' 
          };
        }
        return { payment_amount: autoValue, payment_status: 'pendente' };
      };

      // Delete existing team
      await supabase
        .from('project_team')
        .delete()
        .eq('project_id', project.id);

      const teamMembers = [
        ...responsaveisCaptacao.map(userId => {
          const paymentData = getPaymentData(userId, 'captacao', valorPorCaptador);
          return {
            project_id: project.id,
            user_id: userId,
            phase: 'captacao' as const,
            payment_amount: paymentData.payment_amount,
            payment_status: paymentData.payment_status as 'pendente' | 'pago' | 'vencido' | 'cancelado',
          };
        }),
        ...responsaveisEdicao.map(userId => {
          const paymentData = getPaymentData(userId, 'edicao', valorPorEditor);
          return {
            project_id: project.id,
            user_id: userId,
            phase: 'edicao' as const,
            payment_amount: paymentData.payment_amount,
            payment_status: paymentData.payment_status as 'pendente' | 'pago' | 'vencido' | 'cancelado',
          };
        }),
      ];

      if (teamMembers.length > 0) {
        await supabase.from('project_team').insert(teamMembers);
      }
      
      toast({ title: 'Projeto atualizado com sucesso' });
      setIsEditing(false);
      // Use silent update for in-place refresh without loading flash
      if (onSilentUpdate) {
        onSilentUpdate();
      } else {
        onUpdate();
      }
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);
      
      if (error) throw error;
      
      toast({ title: 'Projeto removido com sucesso' });
      setShowDeleteDialog(false);
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!project) return;
    setLoading(true);
    
    try {
      // Buscar coluna final da fase atual
      const { data: finalColumn } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', project.workspace_id)
        .eq('phase', project.current_phase)
        .eq('is_final', true)
        .single();
      
      if (!finalColumn) {
        toast({
          title: 'Erro',
          description: 'Coluna final não encontrada.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Chamar RPC deliver_project (backend validation)
      const { data, error } = await supabase.rpc('deliver_project', {
        p_project_id: project.id,
        p_phase: project.current_phase,
        p_target_column_id: finalColumn.id
      });
      
      if (error) {
        const errorMessage = error.message.includes('CHECKLIST_INCOMPLETE')
          ? error.message.replace('CHECKLIST_INCOMPLETE: ', '')
          : error.message;
        
        toast({
          title: 'Não é possível concluir',
          description: errorMessage,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      const result = data as { can_deliver: boolean; reason: string | null; pending_tasks: number; pending_checklists: number } | null;
      if (result && !result.can_deliver) {
        // Para projeto_completo em edição (entrega final), mostrar TODOS os pendentes
        // Para outros casos, mostrar apenas da fase atual
        const itemType = project.item_type || 'projeto_completo';
        const isFullProjectFinalDelivery = itemType === 'projeto_completo' && project.current_phase === 'edicao';
        
        let pending: TaskChecklist[];
        if (isFullProjectFinalDelivery) {
          // Todos os checklists pendentes do projeto
          pending = checklists.filter(c => !c.is_completed);
        } else {
          // Apenas checklists da fase atual
          const tasksInPhase = tasks.filter(t => t.phase === project.current_phase);
          const taskIdsInPhase = new Set(tasksInPhase.map(t => t.id));
          pending = checklists.filter(c => taskIdsInPhase.has(c.task_id) && !c.is_completed);
        }
        
        setPendingChecklistItems(pending);
        setShowCompleteDialog(true);
        setLoading(false);
        return;
      }
      
      toast({ title: 'Projeto concluído com sucesso!' });
      setShowCompleteDialog(false);
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao concluir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReopenProject = async () => {
    if (!project) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('reopen_project', {
        p_project_id: project.id
      });
      
      const result = data as { success: boolean; reason?: string; new_column_id?: string; phase?: string } | null;
      
      if (error) throw error;
      
      if (result && !result.success) {
        toast({
          title: 'Erro ao reabrir',
          description: result.reason || 'Não foi possível reabrir o projeto.',
          variant: 'destructive',
        });
        return;
      }
      
      toast({ 
        title: 'Projeto reaberto com sucesso',
        description: 'O projeto foi movido para "Em Revisão".'
      });
      setShowReopenDialog(false);
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Erro ao reabrir', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!project) return;
    setDuplicating(true);
    
    const result = await duplicateProject(project.id, duplicateName || undefined);
    
    if (result) {
      setShowDuplicateDialog(false);
      setDuplicateName('');
      onOpenChange(false);
      onUpdate();
    }
    
    setDuplicating(false);
  };

  const handleOpenChat = async () => {
    if (!project || !user) {
      return;
    }
    setOpeningChat(true);
    
    try {
      // Check if conversation exists
      let conversationId = projectChats.find(c => c.project_id === project.id)?.id;
      
      if (!conversationId) {
        // Create new conversation using the project's workspace_id
        const newConversation = await createProjectChat.mutateAsync({
          projectId: project.id,
          projectName: project.name,
          workspaceId: project.workspace_id,
          attemptId: crypto.randomUUID().slice(0, 8),
        });
        conversationId = newConversation.id;
      }
      
      // Ativar o chat para este utilizador (torna visível na página Chat)
      const { error: memberError } = await supabase.from('conversation_members').upsert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'member',
        is_active: true,
      }, { onConflict: 'conversation_id,user_id' });
      
      if (memberError) {
        console.error('[Chat] Error activating membership:', memberError);
      }
      
      onOpenChange(false);
      navigate(`/app/chat/${conversationId}`);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setOpeningChat(false);
    }
  };

  const openDuplicateDialog = () => {
    if (project) {
      setDuplicateName(`${project.name} (cópia)`);
      setShowDuplicateDialog(true);
    }
  };

  if (!project) return null;

  const completedChecklists = checklists.filter(c => c.is_completed).length;
  const totalChecklists = checklists.length;
  const currentPriority = priorityOptions.find(p => p.value === (isEditing ? editForm.priority : project.priority));
  const profit = (editForm.agreed_value || 0) - (editForm.custo_captacao || 0) - (editForm.custo_edicao || 0);
  const canUseVideoProductionTab = !planLoading && hasFeatureAccess('videoApproval');
  const showVideoProductionTab = planLoading || canUseVideoProductionTab;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              {isEditing ? (
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="text-lg font-semibold max-w-md"
                  placeholder="Nome do projeto"
                />
              ) : (
                <span className="truncate max-w-md">{project.name}</span>
              )}
              <Badge className={currentPriority?.color}>
                {currentPriority?.label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList
              className={cn(
                "grid w-full mb-4",
                showVideoProductionTab
                  ? (canViewOwnFinancials ? "grid-cols-6" : "grid-cols-5")
                  : (canViewOwnFinancials ? "grid-cols-5" : "grid-cols-4")
              )}
            >
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="media">Links</TabsTrigger>
              {canViewOwnFinancials && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
              {showVideoProductionTab && <TabsTrigger value="video">Produção</TabsTrigger>}
            </TabsList>

            <ScrollArea className="h-[calc(90vh-280px)]">
              <TabsContent value="details" className="space-y-4 pr-4">
                {isEditing ? (
                  <>
                    {/* Tipo de Item e ID do Projeto */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Item</Label>
                        <Select 
                          value={editForm.item_type} 
                          onValueChange={(value: 'projeto_captacao' | 'projeto_edicao' | 'projeto_completo' | 'reuniao') => setEditForm(prev => ({ ...prev, item_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {itemTypeOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>ID do Projeto</Label>
                        <Input 
                          value={editForm.project_code}
                          onChange={(e) => setEditForm(prev => ({ ...prev, project_code: e.target.value }))}
                          placeholder="Ex: PRJ-2024-001"
                        />
                      </div>
                    </div>

                    {/* Client Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Select 
                          value={editForm.client_id || "__none__"} 
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, client_id: value === "__none__" ? "" : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum</SelectItem>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Mídia</Label>
                        <Select 
                          value={editForm.type} 
                          onValueChange={(value: 'fotografia' | 'video' | 'foto_video') => setEditForm(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {typeOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <opt.icon className="h-4 w-4" />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Category & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select 
                          value={editForm.category} 
                          onValueChange={(value: 'hotel' | 'experiencia' | 'evento' | 'outro') => setEditForm(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Prioridade</Label>
                        <Select 
                          value={editForm.priority} 
                          onValueChange={(value: 'baixa' | 'media' | 'alta' | 'urgente') => setEditForm(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorityOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Custom Category */}
                    {categories.length > 0 && (
                      <div className="space-y-2">
                        <Label>Categoria Personalizada</Label>
                        <Select 
                          value={editForm.custom_category_id || "__none__"} 
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, custom_category_id: value === "__none__" ? "" : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhuma</SelectItem>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Separator />

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data de Captação</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editForm.shoot_date && "text-muted-foreground")}>
                              <Calendar className="mr-2 h-4 w-4" />
                              {editForm.shoot_date ? format(editForm.shoot_date, 'dd/MM/yyyy') : 'Selecionar'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={editForm.shoot_date || undefined}
                              onSelect={(date) => setEditForm(prev => ({ ...prev, shoot_date: date || null }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Data de Entrega</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editForm.delivery_date && "text-muted-foreground")}>
                              <Clock className="mr-2 h-4 w-4" />
                              {editForm.delivery_date ? format(editForm.delivery_date, 'dd/MM/yyyy') : 'Selecionar'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={editForm.delivery_date || undefined}
                              onSelect={(date) => setEditForm(prev => ({ ...prev, delivery_date: date || null }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hora Início</Label>
                        <Input 
                          type="time"
                          value={editForm.shoot_start_time}
                          onChange={(e) => setEditForm(prev => ({ ...prev, shoot_start_time: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hora Fim</Label>
                        <Input 
                          type="time"
                          value={editForm.shoot_end_time}
                          onChange={(e) => setEditForm(prev => ({ ...prev, shoot_end_time: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input 
                          value={editForm.city}
                          onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Lisboa, Porto..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Morada</Label>
                        <Input 
                          value={editForm.address}
                          onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Endereço completo"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Responsáveis */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Responsáveis</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Responsáveis Captação
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal min-h-[40px] h-auto"
                              >
                                {responsaveisCaptacao.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {responsaveisCaptacao.map(userId => {
                                      const member = workspaceMembers.find(m => m.user_id === userId);
                                      return member ? (
                                        <Badge key={userId} variant="secondary" className="text-xs">
                                          {member.full_name || member.email}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Selecionar responsáveis...</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-2" align="start">
                              <div className="space-y-1">
                                {workspaceMembers.length === 0 ? (
                                  <p className="text-sm text-muted-foreground p-2">Nenhum membro encontrado</p>
                                ) : (
                                  workspaceMembers.map(member => (
                                    <div
                                      key={member.user_id}
                                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                                      onClick={() => {
                                        setResponsaveisCaptacao(prev =>
                                          prev.includes(member.user_id)
                                            ? prev.filter(id => id !== member.user_id)
                                            : [...prev, member.user_id]
                                        );
                                      }}
                                    >
                                      <Checkbox
                                        checked={responsaveisCaptacao.includes(member.user_id)}
                                        onCheckedChange={() => {}}
                                        className="pointer-events-none"
                                      />
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                          {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-medium truncate">
                                          {member.full_name || member.email}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {member.role}
                                        </span>
                                      </div>
                                      {responsaveisCaptacao.includes(member.user_id) && (
                                        <Check className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Responsáveis Edição
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal min-h-[40px] h-auto"
                              >
                                {responsaveisEdicao.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {responsaveisEdicao.map(userId => {
                                      const member = workspaceMembers.find(m => m.user_id === userId);
                                      return member ? (
                                        <Badge key={userId} variant="secondary" className="text-xs">
                                          {member.full_name || member.email}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Selecionar responsáveis...</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-2" align="start">
                              <div className="space-y-1">
                                {workspaceMembers.length === 0 ? (
                                  <p className="text-sm text-muted-foreground p-2">Nenhum membro encontrado</p>
                                ) : (
                                  workspaceMembers.map(member => (
                                    <div
                                      key={member.user_id}
                                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                                      onClick={() => {
                                        setResponsaveisEdicao(prev =>
                                          prev.includes(member.user_id)
                                            ? prev.filter(id => id !== member.user_id)
                                            : [...prev, member.user_id]
                                        );
                                      }}
                                    >
                                      <Checkbox
                                        checked={responsaveisEdicao.includes(member.user_id)}
                                        onCheckedChange={() => {}}
                                        className="pointer-events-none"
                                      />
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                          {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-medium truncate">
                                          {member.full_name || member.email}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {member.role}
                                        </span>
                                      </div>
                                      {responsaveisEdicao.includes(member.user_id) && (
                                        <Check className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Descrição projeto</Label>
                      <Textarea 
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        placeholder="Detalhes sobre o projeto..."
                      />
                    </div>
                  </>
                ) : (
                  /* View Mode - Estilo Asana */
                  <>
                    {/* TÍTULO EM DESTAQUE */}
                    <div className="space-y-1">
                      <h1 className="text-2xl font-semibold tracking-tight">
                        {project.name}
                      </h1>
                      <Badge variant="outline" className="text-xs">
                        {itemTypeLabels[project.item_type || 'projeto_completo']}
                      </Badge>
                    </div>

                    {/* INFORMAÇÕES EM GRID 2 COLUNAS */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {/* Linha 1: Cliente | Tipo */}
                      <div className="flex items-center py-1.5">
                        <span className="w-28 text-sm font-medium shrink-0">Cliente</span>
                        <span className="text-sm text-muted-foreground truncate">{project.clients?.name || '—'}</span>
                      </div>
                      <div className="flex items-center py-1.5">
                        <span className="w-28 text-sm font-medium shrink-0">Tipo</span>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          {project.type === 'fotografia' && <Camera className="h-4 w-4" />}
                          {project.type === 'video' && <Film className="h-4 w-4" />}
                          {project.type === 'foto_video' && <><Camera className="h-4 w-4" /><Film className="h-4 w-4" /></>}
                          <span>{typeOptions.find(t => t.value === project.type)?.label}</span>
                        </div>
                      </div>

                      {/* Linha 2: Categoria | Cidade */}
                      <div className="flex items-center py-1.5">
                        <span className="w-28 text-sm font-medium shrink-0">Categoria</span>
                        <span className="text-sm text-muted-foreground truncate">
                          {categories.find(c => c.id === project.custom_category_id)?.name || 
                           categoryOptions.find(c => c.value === project.category)?.label || 'Outro'}
                        </span>
                      </div>
                      <div className="flex items-center py-1.5">
                        <span className="w-28 text-sm font-medium shrink-0">Cidade</span>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{project.city || '—'}</span>
                        </div>
                      </div>

                      {/* Linha 3: Data Captação | Data Entrega */}
                      <div className="flex items-center py-1.5">
                        <span className="w-28 text-sm font-medium shrink-0">Captação</span>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {project.shoot_date 
                              ? format(new Date(project.shoot_date), "d MMM yyyy", { locale: pt })
                              : '—'}
                          </span>
                          {(project.shoot_start_time || project.shoot_end_time) && (
                            <span className="text-xs">
                              {project.shoot_start_time?.slice(0,5) || '—'} – {project.shoot_end_time?.slice(0,5) || '—'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center py-1.5">
                        <span className="w-28 text-sm font-medium shrink-0">Entrega</span>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {project.delivery_date 
                              ? format(new Date(project.delivery_date), "d MMM yyyy", { locale: pt })
                              : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Linha 4: Resp. Captação | Resp. Edição */}
                      <div className="flex items-center py-1.5">
                        <span className="w-28 text-sm font-medium shrink-0">Resp. Captação</span>
                        <div className="flex items-center gap-1">
                          {responsaveisCaptacao.length > 0 ? (
                            <>
                              <div className="flex -space-x-1">
                                {responsaveisCaptacao.slice(0, 3).map(userId => {
                                  const member = workspaceMembers.find(m => m.user_id === userId);
                                  return member ? (
                                    <Avatar key={userId} className="h-5 w-5 border border-background">
                                      <AvatarImage src={member.avatar_url || undefined} />
                                      <AvatarFallback className="text-[8px]">
                                        {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : null;
                                })}
                              </div>
                              {responsaveisCaptacao.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{responsaveisCaptacao.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center py-1.5">
                        <span className="w-28 text-sm font-medium shrink-0">Resp. Edição</span>
                        <div className="flex items-center gap-1">
                          {responsaveisEdicao.length > 0 ? (
                            <>
                              <div className="flex -space-x-1">
                                {responsaveisEdicao.slice(0, 3).map(userId => {
                                  const member = workspaceMembers.find(m => m.user_id === userId);
                                  return member ? (
                                    <Avatar key={userId} className="h-5 w-5 border border-background">
                                      <AvatarImage src={member.avatar_url || undefined} />
                                      <AvatarFallback className="text-[8px]">
                                        {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : null;
                                })}
                              </div>
                              {responsaveisEdicao.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{responsaveisEdicao.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>

                      {/* Linha 5: ID (ocupa 2 colunas) */}
                      <div className="flex items-center py-1.5 col-span-2">
                        <span className="w-28 text-sm font-medium shrink-0">ID</span>
                        <span className="text-sm font-mono text-primary">{project.project_code || '—'}</span>
                      </div>
                    </div>

                    {/* DESCRIÇÃO - ÁREA SEPARADA */}
                    <Separator className="my-2" />
                    
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Descrição</span>
                      <div className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap min-h-[80px] p-3 rounded-md bg-muted/30",
                        !project.notes && "text-muted-foreground italic"
                      )}>
                        {project.notes || 'Adicione uma descrição com diretrizes para o projeto...'}
                      </div>
                    </div>

                    {/* NOTAS INTERNAS - Apenas admin */}
                    {isAdmin && project.internal_notes && (
                      <div className="mt-2 p-3 bg-muted/20 rounded-md border border-border/30">
                        <span className="text-xs font-medium text-muted-foreground">Notas Internas</span>
                        <p className="mt-1 text-xs text-muted-foreground/80 whitespace-pre-wrap">
                          {project.internal_notes}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Checklist Tab */}
              <TabsContent value="checklist" className="space-y-4 pr-4">
                <ProjectChecklistTab
                  checklists={checklists}
                  setChecklists={setChecklists}
                  tasks={tasks}
                  setTasks={setTasks}
                  projectId={project.id}
                  workspaceId={project.workspace_id}
                  currentPhase={project.current_phase}
                  itemType={(project.item_type as 'projeto_captacao' | 'projeto_edicao' | 'projeto_completo' | 'reuniao') || 'projeto_completo'}
                />
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4 pr-4">
                <ProjectTimelineTab
                  projectId={project.id}
                  workspaceId={project.workspace_id}
                />
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-4 pr-4">
                <ProjectMediaTab
                  mediaLinks={mediaLinks}
                  setMediaLinks={setMediaLinks}
                  projectId={project.id}
                  driveUrl={project.drive_folder_url}
                  dropboxUrl={project.dropbox_folder_url}
                />
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4 pr-4">
                <ProjectFinancialTab
                  projectId={project.id}
                  project={{
                    agreed_value: project.agreed_value,
                    custo_captacao: project.custo_captacao,
                    custo_edicao: project.custo_edicao,
                    custos_extras: (project as any).custos_extras,
                    custos_extras_payment_status: (project as any).custos_extras_payment_status,
                    client_id: project.client_id,
                  }}
                  projectTeam={projectTeam}
                  workspaceMembers={workspaceMembers}
                  isEditing={isEditing}
                  editForm={{
                    agreed_value: editForm.agreed_value,
                    custo_captacao: editForm.custo_captacao,
                    custo_edicao: editForm.custo_edicao,
                    custos_extras: editForm.custos_extras,
                  }}
                  setEditForm={setEditForm}
                  onTeamPaymentUpdate={fetchRelatedData}
                />
              </TabsContent>

              {showVideoProductionTab && (
                <TabsContent value="video" className="space-y-4 pr-4">
                  {planLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : !canUseVideoProductionTab ? (
                    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
                      <p className="text-sm text-muted-foreground">
                        A funcionalidade de Produção/Aprovação de vídeo não está disponível no seu plano atual.
                      </p>
                    </div>
                  ) : (
                    <VideoProductionTab
                      projectId={project.id}
                      workspaceId={project.workspace_id}
                    />
                  )}
                </TabsContent>
              )}
            </ScrollArea>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={openDuplicateDialog}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
              {/* Chat button - always visible, creates conversation if needed */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOpenChat}
                disabled={openingChat}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {openingChat ? 'Abrindo...' : 'Chat'}
              </Button>
            </div>
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  {project.is_delivered ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-warning text-warning hover:bg-warning/10"
                      onClick={() => setShowReopenDialog(true)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reabrir
                    </Button>
                  ) : (
                    <Button size="sm" className="gradient-primary" onClick={handleDeliver}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluir
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto "{project.name}" será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Apagar Projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete with Pending Checklist Dialog */}
      <ChecklistPendingAlert
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        pendingItems={pendingChecklistItems.map(item => ({ id: item.id, title: item.title }))}
        pendingChecklistsCount={pendingChecklistItems.length}
      />

      {/* Duplicate Project Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicar Projeto
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Será criada uma cópia do projeto incluindo tarefas, checklist, equipa e links de media.</p>
                <div className="space-y-2">
                  <Label htmlFor="duplicate-name">Nome do novo projeto</Label>
                  <Input
                    id="duplicate-name"
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    placeholder="Nome do projeto"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate} disabled={duplicating || !duplicateName.trim()}>
              {duplicating ? 'A duplicar...' : 'Duplicar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Project Dialog */}
      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <RotateCcw className="h-5 w-5" />
              Reabrir Projeto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será movido para a coluna "Em Revisão" e poderá ser editado novamente.
              Será removido da lista de Finalizados até ser concluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopenProject} disabled={loading}>
              {loading ? 'A reabrir...' : 'Reabrir Projeto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
