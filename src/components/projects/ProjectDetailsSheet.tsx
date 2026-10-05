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

import { priorityOptions, typeOptions, categoryOptions, itemTypeLabels, itemTypeOptions } from './details/constants';
import { EditModeContent } from './details/EditModeContent';
import { ViewModeContent, TabLoadingFallback } from './details/ViewModeContent';

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
    edit_kind: '' as '' | 'edicao' | 'reedicao',
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
        edit_kind: ((project as any).edit_kind as '' | 'edicao' | 'reedicao') || '',
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

      const [{ data: ownTeamData }, { data: rosterData }] = await Promise.all([
        supabase.from('project_team').select('*').eq('project_id', project.id),
        supabase.rpc('get_project_team_roster', { _project_id: project.id }),
      ]);

      // Colaboradores sem acesso financeiro só recebem a própria linha com valor;
      // o roster completa a lista com nomes/fases (sem valores).
      const visibleIds = new Set((ownTeamData || []).map(t => t.id));
      const rosterOnly = (rosterData || [])
        .filter(r => !visibleIds.has(r.id))
        .map(r => ({
          id: r.id,
          project_id: project.id,
          user_id: r.user_id,
          phase: r.phase,
          is_external: r.is_external,
          external_name: r.external_name,
          invitation_id: null,
          payment_amount: null,
        }) as unknown as ProjectTeam);
      const teamData = [...(ownTeamData || []), ...rosterOnly];

      setProjectTeam(teamData);
      
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
          edit_kind: (editForm.item_type === 'projeto_edicao' || editForm.item_type === 'projeto_completo')
            ? (editForm.edit_kind || null)
            : null,
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
        .select('user_id, invitation_id, phase, payment_amount, cost_amount, payment_status, paid_at')
        .eq('project_id', project.id);

      // Os totais por fase são derivados da equipa (trigger). Se o utilizador alterou
      // o total de uma fase, redistribui-o como "Custo (card)" pelos membros dessa fase;
      // o Pagamento não muda.
      const captacaoTotalChanged = Math.abs(Number(editForm.custo_captacao || 0) - Number(project.custo_captacao || 0)) > 0.001;
      const edicaoTotalChanged = Math.abs(Number(editForm.custo_edicao || 0) - Number(project.custo_edicao || 0)) > 0.001;

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
        const totalChanged = phase === 'captacao' ? captacaoTotalChanged : edicaoTotalChanged;
        if (existing && existing.payment_amount !== null) {
          return { 
            payment_amount: existing.payment_amount, 
            cost_amount: totalChanged ? autoValue : ((existing as any).cost_amount ?? null),
            payment_status: existing.payment_status || 'pendente',
            paid_at: (existing as any).paid_at ?? null,
          };
        }
        return { payment_amount: autoValue, cost_amount: totalChanged ? autoValue : null, payment_status: 'pendente', paid_at: null };
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
            cost_amount: paymentData.cost_amount,
            paid_at: paymentData.paid_at,
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
            cost_amount: paymentData.cost_amount,
            paid_at: paymentData.paid_at,
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
           <SheetHeader className="px-4 sm:px-6 py-5 border-b border-border/60 shrink-0 bg-card/80 backdrop-blur-sm">
             <SheetTitle className="flex min-w-0 items-start gap-3 pr-8">
              {isEditing ? (
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                   className="min-w-0 flex-1 text-lg font-semibold"
                  placeholder="Nome do projeto"
                />
              ) : (
                 <span className="min-w-0 flex-1 break-words text-left text-lg font-semibold">{project.name}</span>
              )}
               <Badge className={cn('shrink-0 mt-0.5', currentPriority?.color)}>
                {currentPriority?.label}
              </Badge>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
             <div className="min-w-0 shrink-0 px-4 sm:px-6 mt-4 overflow-x-auto scrollbar-hide">
               <TabsList className="flex w-max min-w-full justify-start">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="media">Links</TabsTrigger>
              <TabsTrigger value="tempo">Tempo</TabsTrigger>
              {canViewOwnFinancials && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
              {showVideoProductionTab && <TabsTrigger value="video">Review Studio</TabsTrigger>}
               </TabsList>
             </div>

             <ScrollArea className="min-w-0 flex-1 px-4 sm:px-6">
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
           <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-border/60 shrink-0 bg-card/80 backdrop-blur-sm overflow-x-auto scrollbar-hide">
             <div className="flex shrink-0 gap-2">
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
            
             <div className="flex shrink-0 gap-2 ml-auto">
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

