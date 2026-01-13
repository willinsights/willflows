import { useState, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/hooks/useKanban';
import type { Tables } from '@/integrations/supabase/types';
import { ProjectChecklistTab } from './ProjectChecklistTab';
import { ProjectCommentsTab } from './ProjectCommentsTab';
import { ProjectMediaTab } from './ProjectMediaTab';
import { ProjectFinancialTab } from './ProjectFinancialTab';
import { ChecklistPendingAlert } from './ChecklistPendingAlert';

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
  const { toast } = useToast();
  const { duplicateProject } = useProjects();
  const { clients } = useClients();
  const { categories } = useCategories();
  const { members: workspaceMembers } = useWorkspaceMembers();
  const { isAdmin } = useWorkspace();
  const { canViewOwnFinancials } = useFinancialPermissions();
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

      // Update project team - delete existing and insert new
      await supabase
        .from('project_team')
        .delete()
        .eq('project_id', project.id);

      const teamMembers = [
        ...responsaveisCaptacao.map(userId => ({
          project_id: project.id,
          user_id: userId,
          phase: 'captacao' as const,
        })),
        ...responsaveisEdicao.map(userId => ({
          project_id: project.id,
          user_id: userId,
          phase: 'edicao' as const,
        })),
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
    
    // DEBUG LOG
    console.warn('[handleDeliver]', {
      projectId: project.id,
      item_type: project.item_type,
      current_phase: project.current_phase
    });
    
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
      
      console.warn('[deliver_project RPC result]', { data, error });
      
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
        // Mostrar diálogo com itens pendentes
        const tasksInPhase = tasks.filter(t => t.phase === project.current_phase);
        const taskIdsInPhase = new Set(tasksInPhase.map(t => t.id));
        const pending = checklists.filter(c => taskIdsInPhase.has(c.task_id) && !c.is_completed);
        
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
      console.warn('[handleReopenProject]', { projectId: project.id });
      
      const { data, error } = await supabase.rpc('reopen_project', {
        p_project_id: project.id
      });
      
      const result = data as { success: boolean; reason?: string; new_column_id?: string; phase?: string } | null;
      console.warn('[reopen_project RPC result]', { result, error });
      
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
            <TabsList className={cn("grid w-full mb-4", canViewOwnFinancials ? "grid-cols-5" : "grid-cols-4")}>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="comments">Comentários</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              {canViewOwnFinancials && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
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

                    {/* Links & URLs */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Links e Pastas</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            Google Drive
                          </Label>
                          <Input 
                            value={editForm.drive_folder_url}
                            onChange={(e) => setEditForm(prev => ({ ...prev, drive_folder_url: e.target.value }))}
                            placeholder="https://drive.google.com/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            Dropbox
                          </Label>
                          <Input 
                            value={editForm.dropbox_folder_url}
                            onChange={(e) => setEditForm(prev => ({ ...prev, dropbox_folder_url: e.target.value }))}
                            placeholder="https://dropbox.com/..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Link Google Meet
                        </Label>
                        <Input 
                          value={editForm.google_meet_url}
                          onChange={(e) => setEditForm(prev => ({ ...prev, google_meet_url: e.target.value }))}
                          placeholder="https://meet.google.com/..."
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Notas do Projeto</Label>
                      <Textarea 
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        placeholder="Detalhes sobre o projeto..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Notas Internas</Label>
                      <Textarea 
                        value={editForm.internal_notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, internal_notes: e.target.value }))}
                        rows={2}
                        placeholder="Notas internas da equipe..."
                      />
                    </div>
                  </>
                ) : (
                  /* View Mode - Show ALL fields */
                  <>
                    {/* Tipo de Item e ID */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Tipo de Item
                        </span>
                        <p className="font-medium text-sm">
                          {itemTypeLabels[project.item_type || 'projeto_completo'] || 'Não definido'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">ID do Projeto</span>
                        <p className={cn("text-sm", project.project_code ? "font-mono text-primary" : "text-muted-foreground italic")}>
                          {project.project_code || 'Não definido'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Cliente e Tipo de Mídia */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> Cliente
                        </span>
                        <p className={cn("font-medium text-sm", !project.clients?.name && "text-muted-foreground italic")}>
                          {project.clients?.name || 'Não definido'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Tipo de Mídia</span>
                        <p className="font-medium text-sm flex items-center gap-1">
                          {project.type === 'fotografia' && <Camera className="h-3 w-3" />}
                          {project.type === 'video' && <Film className="h-3 w-3" />}
                          {project.type === 'foto_video' && <><Camera className="h-3 w-3" /><Film className="h-3 w-3" /></>}
                          {typeOptions.find(t => t.value === project.type)?.label}
                        </p>
                      </div>
                    </div>

                    {/* Categoria e Prioridade */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Categoria</span>
                        <p className="font-medium text-sm">
                          {categories.find(c => c.id === project.custom_category_id)?.name || categoryOptions.find(c => c.value === project.category)?.label || 'Outro'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Prioridade</span>
                        <Badge className={currentPriority?.color}>
                          {currentPriority?.label}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Data de Captação
                        </span>
                        <p className={cn("font-medium", !project.shoot_date && "text-muted-foreground italic text-sm")}>
                          {project.shoot_date 
                            ? format(new Date(project.shoot_date), 'dd/MM/yyyy', { locale: pt })
                            : 'Não definida'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Data de Entrega
                        </span>
                        <p className={cn("font-medium", !project.delivery_date && "text-muted-foreground italic text-sm")}>
                          {project.delivery_date 
                            ? format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })
                            : 'Não definida'}
                        </p>
                      </div>
                    </div>

                    {/* Horários */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Hora Início</span>
                        <p className={cn("font-medium text-sm", !project.shoot_start_time && "text-muted-foreground italic")}>
                          {project.shoot_start_time ? project.shoot_start_time.slice(0, 5) : 'Não definida'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Hora Fim</span>
                        <p className={cn("font-medium text-sm", !project.shoot_end_time && "text-muted-foreground italic")}>
                          {project.shoot_end_time ? project.shoot_end_time.slice(0, 5) : 'Não definida'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Localização */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Cidade
                        </span>
                        <p className={cn("font-medium text-sm", !project.city && "text-muted-foreground italic")}>
                          {project.city || 'Não definida'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Morada</span>
                        <p className={cn("font-medium text-sm", !project.address && "text-muted-foreground italic")}>
                          {project.address || 'Não definida'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Responsáveis */}
                    <div className="space-y-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Responsáveis
                      </span>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">Captação</span>
                          {responsaveisCaptacao.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {responsaveisCaptacao.map(userId => {
                                const member = workspaceMembers.find(m => m.user_id === userId);
                                return member ? (
                                  <div key={userId} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-full">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={member.avatar_url || undefined} />
                                      <AvatarFallback className="text-[10px]">
                                        {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium">{member.full_name || member.email}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic mt-1">Nenhum atribuído</p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Edição</span>
                          {responsaveisEdicao.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {responsaveisEdicao.map(userId => {
                                const member = workspaceMembers.find(m => m.user_id === userId);
                                return member ? (
                                  <div key={userId} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-full">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={member.avatar_url || undefined} />
                                      <AvatarFallback className="text-[10px]">
                                        {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium">{member.full_name || member.email}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic mt-1">Nenhum atribuído</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Links e Pastas */}
                    <div className="space-y-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Folder className="h-3 w-3" /> Links e Pastas
                      </span>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">Google Drive</span>
                          {project.drive_folder_url ? (
                            <a 
                              href={project.drive_folder_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                            >
                              Abrir pasta
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <p className="text-sm text-muted-foreground italic mt-1">Não definido</p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Dropbox</span>
                          {project.dropbox_folder_url ? (
                            <a 
                              href={project.dropbox_folder_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                            >
                              Abrir pasta
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <p className="text-sm text-muted-foreground italic mt-1">Não definido</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Google Meet</span>
                        {project.google_meet_url ? (
                          <a 
                            href={project.google_meet_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                          >
                            <Video className="h-4 w-4" />
                            Entrar na Reunião
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground italic mt-1">Não definido</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Notas */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Notas do Projeto</span>
                        <p className={cn("mt-1 text-sm whitespace-pre-wrap", !project.notes && "text-muted-foreground italic")}>
                          {project.notes || 'Sem notas'}
                        </p>
                      </div>
                      {isAdmin && (
                        <div>
                          <span className="text-xs text-muted-foreground">Notas Internas</span>
                          <p className={cn("mt-1 text-sm whitespace-pre-wrap", !project.internal_notes && "text-muted-foreground italic")}>
                            {project.internal_notes || 'Sem notas internas'}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Checklist Tab */}
              <TabsContent value="checklist" className="space-y-4 pr-4">
                <ProjectChecklistTab
                  checklists={checklists}
                  setChecklists={setChecklists}
                  projectId={project.id}
                  taskId={firstTaskId}
                  workspaceId={project.workspace_id}
                  currentPhase={project.current_phase}
                />
              </TabsContent>

              {/* Comments Tab */}
              <TabsContent value="comments" className="space-y-4 pr-4">
                <ProjectCommentsTab
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
