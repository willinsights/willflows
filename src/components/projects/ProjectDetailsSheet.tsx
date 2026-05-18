import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Edit, Trash2, CheckCircle, Calendar, MapPin, Clock, 
  AlertTriangle, Save, X, Camera, Film, DollarSign, Users, Check, MessageSquare, Copy, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import { useWorkspaceMembers, type PendingInvitation } from '@/hooks/useWorkspaceMembers';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/hooks/useKanban';
import type { Tables } from '@/integrations/supabase/types';
// Lazy-loaded tab panels — only fetched when the user opens that tab.
// Reduces initial JS for ProjectDetailsSheet open and avoids paying for
// tabs the user never visits (Financeiro, Review Studio, Tempo, etc.).
const ProjectChecklistTab = lazy(() =>
  import('./ProjectChecklistTab').then((m) => ({ default: m.ProjectChecklistTab }))
);
const ProjectMediaTab = lazy(() =>
  import('./ProjectMediaTab').then((m) => ({ default: m.ProjectMediaTab }))
);
const ProjectFinancialTab = lazy(() =>
  import('./ProjectFinancialTab').then((m) => ({ default: m.ProjectFinancialTab }))
);
const ProjectTimelineTab = lazy(() =>
  import('./ProjectTimelineTab').then((m) => ({ default: m.ProjectTimelineTab }))
);
import { ChecklistPendingAlert } from './ChecklistPendingAlert';
import { DeliverConfirmDialog } from '@/components/kanban/DeliverConfirmDialog';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
const VideoProductionTab = lazy(() =>
  import('@/components/video-production/VideoProductionTab').then((m) => ({
    default: m.VideoProductionTab,
  }))
);
import { CreateEventModal } from '@/components/calendar/CreateEventModal';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
const ProjectTimeTab = lazy(() =>
  import('@/components/time-tracking/ProjectTimeTab').then((m) => ({
    default: m.ProjectTimeTab,
  }))
);

import { logger } from '@/lib/logger';
type Task = Tables<'tasks'>;
type TaskChecklist = Tables<'task_checklists'>;
type MediaLink = Tables<'project_media_links'>;
type ProjectTeam = Tables<'project_team'>;

export interface ProjectDetailsSheetProps {
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

export function ProjectDetailsSheet({ open, onOpenChange, project, onUpdate, onSilentUpdate }: ProjectDetailsSheetProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { duplicateProject } = useProjects();
  const { clients } = useClients();
  const { categories } = useCategories();
  const { members: workspaceMembers, pendingInvitations } = useWorkspaceMembers();
  const { isAdmin } = useWorkspace();
  const { canViewOwnFinancials } = useFinancialPermissions();
  const { hasFeatureAccess, loading: planLoading } = usePlanFeatures();
  const { projectChats, createProjectChat } = useConversations();
  const { user } = useAuth();
  const { createEvent } = useCalendarEvents();
  const [openingChat, setOpeningChat] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDeliverConfirmDialog, setShowDeliverConfirmDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedVideoTaskId, setSelectedVideoTaskId] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);
  const [projectTeam, setProjectTeam] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingChecklistItems, setPendingChecklistItems] = useState<TaskChecklist[]>([]);
  const [responsaveisCaptacao, setResponsaveisCaptacao] = useState<string[]>([]);
  const [responsaveisEdicao, setResponsaveisEdicao] = useState<string[]>([]);
  
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

  // Keep a stable default task selected for the video production tab
  useEffect(() => {
    if (!open) return;
   // Show all project videos by default (not filtered by task)
   setSelectedVideoTaskId(null);
  }, [open]);

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

      const { data: teamData } = await supabase
        .from('project_team')
        .select('*')
        .eq('project_id', project.id);
      
      setProjectTeam(teamData || []);
      
      // Map both user_id and invitation_id to selection IDs
      const captacaoMembers = (teamData || [])
        .filter(t => t.phase === 'captacao')
        .map(t => t.user_id ? t.user_id : t.invitation_id ? `inv_${t.invitation_id}` : null)
        .filter(Boolean) as string[];
      const edicaoMembers = (teamData || [])
        .filter(t => t.phase === 'edicao')
        .map(t => t.user_id ? t.user_id : t.invitation_id ? `inv_${t.invitation_id}` : null)
        .filter(Boolean) as string[];
      setResponsaveisCaptacao(captacaoMembers);
      setResponsaveisEdicao(edicaoMembers);
    } catch (error) {
      logger.error('Error fetching related data:', error);
    }
  };

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

      const { data: existingTeam } = await supabase
        .from('project_team')
        .select('user_id, invitation_id, phase, payment_amount, payment_status')
        .eq('project_id', project.id);

      // Count all members (users + invitations) for payment calculation
      const captacaoCount = responsaveisCaptacao.length;
      const edicaoCount = responsaveisEdicao.length;
      
      const custoCaptacaoTotal = editForm.custo_captacao || 0;
      const custoEdicaoTotal = editForm.custo_edicao || 0;
      const valorPorCaptador = captacaoCount > 0 
        ? custoCaptacaoTotal / captacaoCount 
        : 0;
      const valorPorEditor = edicaoCount > 0 
        ? custoEdicaoTotal / edicaoCount 
        : 0;

      const getPaymentData = (memberId: string, phase: string, autoValue: number) => {
        const isInvitation = memberId.startsWith('inv_');
        const existing = existingTeam?.find(t => {
          if (isInvitation) {
            return t.invitation_id === memberId.replace('inv_', '') && t.phase === phase;
          }
          return t.user_id === memberId && t.phase === phase;
        });
        if (existing && existing.payment_amount !== null) {
          return { 
            payment_amount: existing.payment_amount, 
            payment_status: existing.payment_status || 'pendente' 
          };
        }
        return { payment_amount: autoValue, payment_status: 'pendente' };
      };

      await supabase.from('project_team').delete().eq('project_id', project.id);

      const teamMembers = [
        ...responsaveisCaptacao.map(memberId => {
          const isInvitation = memberId.startsWith('inv_');
          const paymentData = getPaymentData(memberId, 'captacao', valorPorCaptador);
          return {
            project_id: project.id,
            user_id: isInvitation ? null : memberId,
            invitation_id: isInvitation ? memberId.replace('inv_', '') : null,
            phase: 'captacao' as const,
            payment_amount: paymentData.payment_amount,
            payment_status: paymentData.payment_status as 'pendente' | 'pago' | 'vencido' | 'cancelado',
          };
        }),
        ...responsaveisEdicao.map(memberId => {
          const isInvitation = memberId.startsWith('inv_');
          const paymentData = getPaymentData(memberId, 'edicao', valorPorEditor);
          return {
            project_id: project.id,
            user_id: isInvitation ? null : memberId,
            invitation_id: isInvitation ? memberId.replace('inv_', '') : null,
            phase: 'edicao' as const,
            payment_amount: paymentData.payment_amount,
            payment_status: paymentData.payment_status as 'pendente' | 'pago' | 'vencido' | 'cancelado',
          };
        }),
      ];

      if (teamMembers.length > 0) {
        await supabase.from('project_team').insert(teamMembers as any);
      }
      
      toast({ title: 'Projeto atualizado com sucesso' });
      setIsEditing(false);
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
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
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
      // First validate with can_deliver_project RPC
      const { data: validationResult, error: validationError } = await supabase.rpc('can_deliver_project', {
        p_project_id: project.id,
        p_phase: project.current_phase
      });
      
      if (validationError) {
        toast({ title: 'Erro ao validar', description: validationError.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
      
      const validation = validationResult as { can_deliver: boolean; reason: string | null; pending_tasks: number; pending_checklists: number } | null;
      if (validation && !validation.can_deliver) {
        const itemType = project.item_type || 'projeto_completo';
        const isFullProjectFinalDelivery = itemType === 'projeto_completo' && project.current_phase === 'edicao';
        
        let pending: TaskChecklist[];
        if (isFullProjectFinalDelivery) {
          pending = checklists.filter(c => !c.is_completed);
        } else {
          const tasksInPhase = tasks.filter(t => t.phase === project.current_phase);
          const taskIdsInPhase = new Set(tasksInPhase.map(t => t.id));
          pending = checklists.filter(c => taskIdsInPhase.has(c.task_id) && !c.is_completed);
        }
        
        setPendingChecklistItems(pending);
        setShowCompleteDialog(true);
        setLoading(false);
        return;
      }
      
      // Validation passed - open date picker dialog
      setShowDeliverConfirmDialog(true);
    } catch (error: any) {
      toast({ title: 'Erro ao validar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeliveryWithDate = async (deliveredAt: Date) => {
    if (!project) return;
    setLoading(true);
    
    try {
      const { data: finalColumn } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', project.workspace_id)
        .eq('phase', project.current_phase)
        .eq('is_final', true)
        .single();
      
      if (!finalColumn) {
        toast({ title: 'Erro', description: 'Coluna final não encontrada.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.rpc('deliver_project', {
        p_project_id: project.id,
        p_phase: project.current_phase,
        p_target_column_id: finalColumn.id,
        p_delivered_at: deliveredAt.toISOString(),
      });
      
      if (error) {
        toast({ title: 'Erro ao concluir', description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
      
      const result = data as { can_deliver: boolean; reason: string | null } | null;
      if (result && !result.can_deliver) {
        toast({ title: 'Não foi possível concluir', description: result.reason || 'Erro desconhecido', variant: 'destructive' });
        setLoading(false);
        return;
      }
      
      toast({ title: 'Projeto concluído com sucesso!' });
      setShowDeliverConfirmDialog(false);
      setShowCompleteDialog(false);
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Erro ao concluir', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReopenProject = async () => {
    if (!project) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('reopen_project', { p_project_id: project.id });
      const result = data as { success: boolean; reason?: string } | null;
      
      if (error) throw error;
      if (result && !result.success) {
        toast({ title: 'Erro ao reabrir', description: result.reason || 'Não foi possível reabrir o projeto.', variant: 'destructive' });
        return;
      }
      
      toast({ title: 'Projeto reaberto com sucesso', description: 'O projeto foi movido para "Em Revisão".' });
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
    if (!project || !user) return;
    setOpeningChat(true);
    
    try {
      let conversationId = projectChats.find(c => c.project_id === project.id)?.id;
      
      if (!conversationId) {
        const newConversation = await createProjectChat.mutateAsync({
          projectId: project.id,
          projectName: project.name,
          workspaceId: project.workspace_id,
          attemptId: crypto.randomUUID().slice(0, 8),
        });
        conversationId = newConversation.id;
      }
      
      const { error: memberError } = await supabase.from('conversation_members').upsert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'member',
        is_active: true,
      }, { onConflict: 'conversation_id,user_id' });
      
      if (memberError) {
        logger.error('[Chat] Error activating membership:', memberError);
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

  const currentPriority = priorityOptions.find(p => p.value === (isEditing ? editForm.priority : project.priority));
  const canUseVideoProductionTab = !planLoading && hasFeatureAccess('videoApproval');
  // Show the tab while loading (to avoid "it never appears" perception) and when the user can access it.
  const showVideoProductionTab = planLoading || canUseVideoProductionTab;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[66vw] p-0 flex flex-col">
          <SheetHeader className="px-6 py-5 border-b border-border/60 shrink-0 bg-card/80 backdrop-blur-sm">
            <SheetTitle className="flex items-center justify-between pr-8">
              {isEditing ? (
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="text-lg font-semibold max-w-md"
                  placeholder="Nome do projeto"
                />
              ) : (
                <span className="truncate max-w-md text-lg font-semibold">{project.name}</span>
              )}
              <Badge className={currentPriority?.color}>
                {currentPriority?.label}
              </Badge>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <TabsList
              className={cn(
                "grid w-full shrink-0 mx-6 mt-4",
                showVideoProductionTab
                  ? (canViewOwnFinancials ? "grid-cols-7" : "grid-cols-6")
                  : (canViewOwnFinancials ? "grid-cols-6" : "grid-cols-5")
              )}
              style={{ width: 'calc(100% - 48px)' }}
            >
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="media">Links</TabsTrigger>
              <TabsTrigger value="tempo">Tempo</TabsTrigger>
              {canViewOwnFinancials && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
              {showVideoProductionTab && <TabsTrigger value="video">Review Studio</TabsTrigger>}
            </TabsList>

            <ScrollArea className="flex-1 px-6">
              <TabsContent value="details" className="space-y-4 py-4">
                {isEditing ? (
                  <EditModeContent 
                    editForm={editForm}
                    setEditForm={setEditForm}
                    clients={clients}
                    categories={categories}
                    workspaceMembers={workspaceMembers}
                    pendingInvitations={pendingInvitations}
                    responsaveisCaptacao={responsaveisCaptacao}
                    setResponsaveisCaptacao={setResponsaveisCaptacao}
                    responsaveisEdicao={responsaveisEdicao}
                    setResponsaveisEdicao={setResponsaveisEdicao}
                  />
                ) : (
                  <ViewModeContent
                    project={project}
                    categories={categories}
                    workspaceMembers={workspaceMembers}
                    responsaveisCaptacao={responsaveisCaptacao}
                    responsaveisEdicao={responsaveisEdicao}
                    isAdmin={isAdmin}
                  />
                )}
              </TabsContent>

              <TabsContent value="checklist" className="space-y-4 py-4">
                <Suspense fallback={<TabLoadingFallback />}>
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
                </Suspense>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4 py-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <ProjectTimelineTab
                    projectId={project.id}
                    workspaceId={project.workspace_id}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="media" className="space-y-4 py-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <ProjectMediaTab
                    mediaLinks={mediaLinks}
                    setMediaLinks={setMediaLinks}
                    projectId={project.id}
                    driveUrl={project.drive_folder_url}
                    dropboxUrl={project.dropbox_folder_url}
                  />
                </Suspense>
              </TabsContent>

              {canViewOwnFinancials && (
                <TabsContent value="financial" className="space-y-4 py-4">
                  <Suspense fallback={<TabLoadingFallback />}>
                    <ProjectFinancialTab
                      projectId={project.id}
                      project={{
                        agreed_value: project.agreed_value,
                        custo_captacao: project.custo_captacao,
                        custo_edicao: project.custo_edicao,
                        custos_extras: (project as any).custos_extras,
                        custos_extras_payment_status: (project as any).custos_extras_payment_status,
                        client_id: project.client_id,
                        delivery_date: project.delivery_date,
                        is_delivered: project.is_delivered,
                        delivered_at: project.delivered_at,
                        client_payment_status: project.client_payment_status,
                        client_payment_due_date: project.client_payment_due_date,
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
                  </Suspense>
                </TabsContent>
              )}

              {showVideoProductionTab && (
                <TabsContent value="video" className="space-y-4 py-4">
                  {planLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : !canUseVideoProductionTab ? (
                    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
                      <p className="text-sm text-muted-foreground">
                        A funcionalidade de Review Studio não está disponível no seu plano atual.
                      </p>
                    </div>
                  ) : (
                    <Suspense fallback={<TabLoadingFallback />}>
                      <VideoProductionTab
                        taskId={selectedVideoTaskId}
                        projectId={project.id}
                        workspaceId={project.workspace_id}
                      />
                    </Suspense>
                  )}
                </TabsContent>
              )}

              <TabsContent value="tempo" className="space-y-4 py-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <ProjectTimeTab projectId={project.id} />
                </Suspense>
              </TabsContent>


            </ScrollArea>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-border/60 shrink-0 bg-card/80 backdrop-blur-sm">
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Apagar
              </Button>
              <Button variant="outline" size="sm" onClick={openDuplicateDialog}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicar
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenChat} disabled={openingChat}>
                <MessageSquare className="h-4 w-4 mr-1" />
                {openingChat ? 'Abrindo...' : 'Chat'}
              </Button>
            </div>
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={loading}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowCreateEvent(true)}>
                    <Calendar className="h-4 w-4 mr-1" />
                    Agendar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  {project.is_delivered ? (
                    <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10" onClick={() => setShowReopenDialog(true)}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reabrir
                    </Button>
                  ) : (
                    <Button size="sm" className="gradient-primary" onClick={handleDeliver}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Concluir
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
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

      <ChecklistPendingAlert
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        pendingItems={pendingChecklistItems.map(item => ({ id: item.id, title: item.title }))}
        pendingChecklistsCount={pendingChecklistItems.length}
      />

      <DeliverConfirmDialog
        open={showDeliverConfirmDialog}
        onOpenChange={setShowDeliverConfirmDialog}
        projectName={project.name}
        onConfirm={confirmDeliveryWithDate}
        loading={loading}
      />

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

      {/* Create Event Modal from Project */}
      {project && (
        <CreateEventModal
          open={showCreateEvent}
          onOpenChange={setShowCreateEvent}
          onSubmit={async (eventData, options) => {
            const result = await createEvent({
              ...eventData,
              project_id: project.id,
            }, options);
            return result;
          }}
          initialProjectId={project.id}
          initialProjectName={project.name}
        />
      )}
    </>
  );
}

// ==================== SUB-COMPONENTS ====================

interface EditModeContentProps {
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  clients: any[];
  categories: any[];
  workspaceMembers: any[];
  pendingInvitations: PendingInvitation[];
  responsaveisCaptacao: string[];
  setResponsaveisCaptacao: React.Dispatch<React.SetStateAction<string[]>>;
  responsaveisEdicao: string[];
  setResponsaveisEdicao: React.Dispatch<React.SetStateAction<string[]>>;
}

function EditModeContent({
  editForm,
  setEditForm,
  clients,
  categories,
  workspaceMembers,
  pendingInvitations,
  responsaveisCaptacao,
  setResponsaveisCaptacao,
  responsaveisEdicao,
  setResponsaveisEdicao,
}: EditModeContentProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Item</Label>
          <Select 
            value={editForm.item_type} 
            onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, item_type: value }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {itemTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ID do Projeto</Label>
          <Input value={editForm.project_code} onChange={(e) => setEditForm((prev: any) => ({ ...prev, project_code: e.target.value }))} placeholder="Ex: PRJ-2024-001" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={editForm.client_id || "__none__"} onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, client_id: value === "__none__" ? "" : value }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {clients.map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select value={editForm.priority} onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, priority: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {priorityOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={editForm.custom_category_id || "__none__"} onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, custom_category_id: value === "__none__" ? "" : value }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
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
              <CalendarComponent mode="single" selected={editForm.shoot_date || undefined} onSelect={(date) => setEditForm((prev: any) => ({ ...prev, shoot_date: date || null }))} initialFocus className="p-3 pointer-events-auto" />
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
              <CalendarComponent mode="single" selected={editForm.delivery_date || undefined} onSelect={(date) => setEditForm((prev: any) => ({ ...prev, delivery_date: date || null }))} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hora Início</Label>
          <Input type="time" value={editForm.shoot_start_time} onChange={(e) => setEditForm((prev: any) => ({ ...prev, shoot_start_time: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Hora Fim</Label>
          <Input type="time" value={editForm.shoot_end_time} onChange={(e) => setEditForm((prev: any) => ({ ...prev, shoot_end_time: e.target.value }))} />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input value={editForm.city} onChange={(e) => setEditForm((prev: any) => ({ ...prev, city: e.target.value }))} placeholder="Lisboa, Porto..." />
        </div>
        <div className="space-y-2">
          <Label>Morada</Label>
          <Input value={editForm.address} onChange={(e) => setEditForm((prev: any) => ({ ...prev, address: e.target.value }))} placeholder="Endereço completo" />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium text-sm">Responsáveis</h4>
        <div className="grid grid-cols-2 gap-4">
          <TeamMemberSelector
            label="Responsáveis Captação"
            selectedMembers={responsaveisCaptacao}
            setSelectedMembers={setResponsaveisCaptacao}
            workspaceMembers={workspaceMembers}
            pendingInvitations={pendingInvitations}
          />
          <TeamMemberSelector
            label="Responsáveis Edição"
            selectedMembers={responsaveisEdicao}
            setSelectedMembers={setResponsaveisEdicao}
            workspaceMembers={workspaceMembers}
            pendingInvitations={pendingInvitations}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Descrição projeto</Label>
        <Textarea value={editForm.notes} onChange={(e) => setEditForm((prev: any) => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Detalhes sobre o projeto..." />
      </div>
    </>
  );
}

interface TeamMemberSelectorProps {
  label: string;
  selectedMembers: string[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>;
  workspaceMembers: any[];
  pendingInvitations: PendingInvitation[];
}

function TeamMemberSelector({ label, selectedMembers, setSelectedMembers, workspaceMembers, pendingInvitations }: TeamMemberSelectorProps) {
  // Get display name for a member ID (could be user_id or inv_invitationId)
  const getMemberDisplay = (memberId: string) => {
    if (memberId.startsWith('inv_')) {
      const invitation = pendingInvitations.find(inv => inv.id === memberId);
      return invitation?.email_masked || 'Convite pendente';
    }
    const member = workspaceMembers.find((m: any) => m.user_id === memberId);
    return member?.full_name || member?.email || memberId;
  };

  const isInvitation = (memberId: string) => memberId.startsWith('inv_');

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-start text-left font-normal min-h-[40px] h-auto">
            {selectedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedMembers.map(memberId => (
                  <Badge 
                    key={memberId} 
                    variant={isInvitation(memberId) ? "outline" : "secondary"} 
                    className={cn("text-xs flex items-center gap-1", isInvitation(memberId) && "border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400")}
                  >
                    {getMemberDisplay(memberId)}
                    {isInvitation(memberId) && <span className="text-[10px]">⏳</span>}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMembers(prev => prev.filter(id => id !== memberId));
                      }}
                      className="ml-0.5 hover:text-destructive transition-colors"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Selecionar responsáveis...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-2 max-h-[350px] overflow-y-auto" align="start">
          <div className="space-y-1">
            {/* Active Members */}
            {workspaceMembers.length > 0 && (
              <>
                {workspaceMembers.map((member: any) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setSelectedMembers(prev =>
                        prev.includes(member.user_id)
                          ? prev.filter(id => id !== member.user_id)
                          : [...prev, member.user_id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedMembers.includes(member.user_id)} onCheckedChange={() => {}} className="pointer-events-none" />
                    <Avatar className="h-[30px] w-[30px]">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{(member.full_name || member.email).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{member.full_name || member.email}</span>
                      <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                    </div>
                    {selectedMembers.includes(member.user_id) && <Check className="h-4 w-4 text-primary" />}
                  </div>
                ))}
              </>
            )}
            
            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Convites Pendentes</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {pendingInvitations.length}
                  </Badge>
                </div>
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer border-l-2 border-amber-500/30"
                    onClick={() => {
                      setSelectedMembers(prev =>
                        prev.includes(invitation.id)
                          ? prev.filter(id => id !== invitation.id)
                          : [...prev, invitation.id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedMembers.includes(invitation.id)} onCheckedChange={() => {}} className="pointer-events-none" />
                    <Avatar className="h-[30px] w-[30px] bg-amber-500/10">
                      <AvatarFallback className="text-[10px] text-amber-600 dark:text-amber-400">✉</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{invitation.email_masked || 'Email oculto'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground capitalize">{invitation.role}</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">• Pendente</span>
                      </div>
                    </div>
                    {selectedMembers.includes(invitation.id) && <Check className="h-4 w-4 text-primary" />}
                  </div>
                ))}
              </>
            )}
            
            {workspaceMembers.length === 0 && pendingInvitations.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">Nenhum membro ou convite encontrado</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ViewModeContentProps {
  project: ProjectWithClient;
  categories: any[];
  workspaceMembers: any[];
  responsaveisCaptacao: string[];
  responsaveisEdicao: string[];
  isAdmin: boolean;
}

function ViewModeContent({
  project,
  categories,
  workspaceMembers,
  responsaveisCaptacao,
  responsaveisEdicao,
  isAdmin,
}: ViewModeContentProps) {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
        <Badge variant="outline" className="text-xs">{itemTypeLabels[project.item_type || 'projeto_completo']}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <InfoRow label="Cliente" value={project.clients?.name} />
        <InfoRow label="Tipo" value={
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {project.type === 'fotografia' && <Camera className="h-4 w-4" />}
            {project.type === 'video' && <Film className="h-4 w-4" />}
            {project.type === 'foto_video' && <><Camera className="h-4 w-4" /><Film className="h-4 w-4" /></>}
            <span>{typeOptions.find(t => t.value === project.type)?.label}</span>
          </div>
        } />
        <InfoRow label="Categoria" value={categories.find(c => c.id === project.custom_category_id)?.name || categoryOptions.find(c => c.value === project.category)?.label || 'Outro'} />
        <InfoRow label="Cidade" value={
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{project.city || '—'}</span>
          </div>
        } />
        <InfoRow label="Captação" value={
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{project.shoot_date ? format(new Date(project.shoot_date), "d MMM yyyy", { locale: pt }) : '—'}</span>
            {(project.shoot_start_time || project.shoot_end_time) && (
              <span className="text-xs">{project.shoot_start_time?.slice(0, 5) || '—'} – {project.shoot_end_time?.slice(0, 5) || '—'}</span>
            )}
          </div>
        } />
        <InfoRow label="Entrega" value={
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{project.delivery_date ? format(new Date(project.delivery_date), "d MMM yyyy", { locale: pt }) : '—'}</span>
          </div>
        } />
        <InfoRow label="Resp. Captação" value={
          <AvatarGroup userIds={responsaveisCaptacao} members={workspaceMembers} />
        } />
        <InfoRow label="Resp. Edição" value={
          <AvatarGroup userIds={responsaveisEdicao} members={workspaceMembers} />
        } />
        <div className="flex items-center py-1.5 col-span-2">
          <span className="w-28 text-sm font-medium shrink-0">ID</span>
          <span className="text-sm font-mono text-primary">{project.project_code || '—'}</span>
        </div>
      </div>

      <Separator className="my-2" />

      <div className="space-y-2">
        <span className="text-sm font-medium">Descrição</span>
        <div className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap min-h-[60px] p-3 rounded-md bg-muted/30",
          !project.notes && "text-muted-foreground italic"
        )}>
          {project.notes || 'Adicione uma descrição com diretrizes para o projeto...'}
        </div>
      </div>

      {isAdmin && project.internal_notes && (
        <div className="mt-2 p-3 bg-muted/20 rounded-md border border-border/30">
          <span className="text-xs font-medium text-muted-foreground">Notas Internas</span>
          <p className="mt-1 text-xs text-muted-foreground/80 whitespace-pre-wrap">{project.internal_notes}</p>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center py-1.5">
      <span className="w-28 text-sm font-medium shrink-0">{label}</span>
      {typeof value === 'string' ? (
        <span className="text-sm text-muted-foreground truncate">{value || '—'}</span>
      ) : (
        value
      )}
    </div>
  );
}

function AvatarGroup({ userIds, members }: { userIds: string[]; members: any[] }) {
  if (userIds.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {userIds.slice(0, 3).map(userId => {
          const member = members.find((m: any) => m.user_id === userId);
          return member ? (
            <Avatar key={userId} className="h-[30px] w-[30px] border border-background">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{(member.full_name || member.email).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : null;
        })}
      </div>
      {userIds.length > 3 && <span className="text-xs text-muted-foreground">+{userIds.length - 3}</span>}
    </div>
  );
}
