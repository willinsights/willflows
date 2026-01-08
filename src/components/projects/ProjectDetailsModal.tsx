import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Edit, Trash2, CheckCircle, Calendar, MapPin, User, Clock, 
  Link as LinkIcon, AlertTriangle, CheckSquare, Save, X,
  ExternalLink, Video, Camera, Film, DollarSign
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
import { useClients } from '@/hooks/useClients';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/hooks/useKanban';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;
type TaskChecklist = Tables<'task_checklists'>;
type MediaLink = Tables<'project_media_links'>;

interface ProjectDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithClient | null;
  onUpdate: () => void;
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

export function ProjectDetailsModal({ open, onOpenChange, project, onUpdate }: ProjectDetailsModalProps) {
  const { toast } = useToast();
  const { clients } = useClients();
  const { categories } = useCategories();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingChecklistItems, setPendingChecklistItems] = useState<TaskChecklist[]>([]);
  
  // Full edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    client_id: '',
    type: 'fotografia' as 'fotografia' | 'video' | 'foto_video',
    category: 'outro' as 'hotel' | 'experiencia' | 'evento' | 'outro',
    custom_category_id: '',
    priority: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    shoot_date: null as Date | null,
    delivery_date: null as Date | null,
    shoot_start_time: '',
    city: '',
    address: '',
    agreed_value: 0,
    custo_captacao: 0,
    custo_edicao: 0,
    notes: '',
    internal_notes: '',
    drive_folder_url: '',
    dropbox_folder_url: '',
  });

  // Initialize form when project changes
  useEffect(() => {
    if (project && open) {
      fetchRelatedData();
      setEditForm({
        name: project.name,
        client_id: project.client_id || '',
        type: project.type,
        category: project.category,
        custom_category_id: project.custom_category_id || '',
        priority: project.priority,
        shoot_date: project.shoot_date ? new Date(project.shoot_date) : null,
        delivery_date: project.delivery_date ? new Date(project.delivery_date) : null,
        shoot_start_time: project.shoot_start_time || '',
        city: project.city || '',
        address: project.address || '',
        agreed_value: project.agreed_value || 0,
        custo_captacao: project.custo_captacao || 0,
        custo_edicao: project.custo_edicao || 0,
        notes: project.notes || '',
        internal_notes: project.internal_notes || '',
        drive_folder_url: project.drive_folder_url || '',
        dropbox_folder_url: project.dropbox_folder_url || '',
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
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  const handleToggleChecklist = async (checklistId: string, isCompleted: boolean) => {
    try {
      await supabase
        .from('task_checklists')
        .update({ 
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', checklistId);
      
      setChecklists(prev => 
        prev.map(c => c.id === checklistId ? { ...c, is_completed: !isCompleted } : c)
      );
    } catch (error) {
      console.error('Error toggling checklist:', error);
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
          client_id: editForm.client_id || null,
          type: editForm.type,
          category: editForm.category,
          custom_category_id: editForm.custom_category_id || null,
          priority: editForm.priority,
          shoot_date: editForm.shoot_date ? format(editForm.shoot_date, 'yyyy-MM-dd') : null,
          delivery_date: editForm.delivery_date ? format(editForm.delivery_date, 'yyyy-MM-dd') : null,
          shoot_start_time: editForm.shoot_start_time || null,
          city: editForm.city || null,
          address: editForm.address || null,
          agreed_value: editForm.agreed_value,
          custo_captacao: editForm.custo_captacao,
          custo_edicao: editForm.custo_edicao,
          notes: editForm.notes || null,
          internal_notes: editForm.internal_notes || null,
          drive_folder_url: editForm.drive_folder_url || null,
          dropbox_folder_url: editForm.dropbox_folder_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);
      
      if (error) throw error;
      
      toast({ title: 'Projeto atualizado com sucesso' });
      setIsEditing(false);
      onUpdate();
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

  const checkAndComplete = async () => {
    if (!project) return;
    
    const pending = checklists.filter(c => !c.is_completed);
    if (pending.length > 0) {
      setPendingChecklistItems(pending);
      setShowCompleteDialog(true);
      return;
    }
    
    await completeProject();
  };

  const completeProject = async () => {
    if (!project) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          is_delivered: true,
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);
      
      if (error) throw error;
      
      toast({ title: 'Projeto concluído com sucesso!' });
      setShowCompleteDialog(false);
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Erro ao concluir', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
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
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="tasks">Tarefas</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-280px)]">
              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 pr-4">
                {isEditing ? (
                  <>
                    {/* Client Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Select 
                          value={editForm.client_id} 
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, client_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo</Label>
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
                          value={editForm.custom_category_id} 
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, custom_category_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhuma</SelectItem>
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
                    <div className="grid grid-cols-3 gap-4">
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
                        <Label>Hora Início</Label>
                        <Input 
                          type="time"
                          value={editForm.shoot_start_time}
                          onChange={(e) => setEditForm(prev => ({ ...prev, shoot_start_time: e.target.value }))}
                        />
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
                  /* View Mode */
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {project.project_code && (
                        <div>
                          <span className="text-xs text-muted-foreground">ID do Projeto</span>
                          <p className="font-mono text-primary text-sm">{project.project_code}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-muted-foreground">Tipo</span>
                        <p className="font-medium text-sm flex items-center gap-1">
                          {project.type === 'fotografia' && <Camera className="h-3 w-3" />}
                          {project.type === 'video' && <Film className="h-3 w-3" />}
                          {project.type === 'foto_video' && <><Camera className="h-3 w-3" /><Film className="h-3 w-3" /></>}
                          {typeOptions.find(t => t.value === project.type)?.label}
                        </p>
                      </div>
                    </div>

                    {project.clients?.name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{project.clients.name}</span>
                      </div>
                    )}

                    {project.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{project.city}{project.address && ` - ${project.address}`}</span>
                      </div>
                    )}

                    {project.google_meet_url && (
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={project.google_meet_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Entrar na Reunião
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      {project.shoot_date && (
                        <div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Data de Captação
                          </span>
                          <p className="font-medium">
                            {format(new Date(project.shoot_date), 'dd/MM/yyyy', { locale: pt })}
                            {project.shoot_start_time && ` às ${project.shoot_start_time.slice(0, 5)}`}
                          </p>
                        </div>
                      )}
                      {project.delivery_date && (
                        <div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Data de Entrega
                          </span>
                          <p className="font-medium">
                            {format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })}
                          </p>
                        </div>
                      )}
                    </div>

                    {project.notes && (
                      <>
                        <Separator />
                        <div>
                          <span className="text-xs text-muted-foreground">Notas</span>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{project.notes}</p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-4 pr-4">
                {checklists.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Checklist ({completedChecklists}/{totalChecklists})
                      </span>
                      {completedChecklists < totalChecklists && (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {checklists.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => handleToggleChecklist(item.id, item.is_completed)}
                        >
                          <Checkbox checked={item.is_completed} />
                          <span className={cn("text-sm", item.is_completed && 'line-through text-muted-foreground')}>
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma tarefa associada</p>
                  </div>
                )}
              </TabsContent>

              {/* Links Tab */}
              <TabsContent value="links" className="space-y-4 pr-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Link do Google Drive</Label>
                      <Input 
                        value={editForm.drive_folder_url}
                        onChange={(e) => setEditForm(prev => ({ ...prev, drive_folder_url: e.target.value }))}
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link do Dropbox</Label>
                      <Input 
                        value={editForm.dropbox_folder_url}
                        onChange={(e) => setEditForm(prev => ({ ...prev, dropbox_folder_url: e.target.value }))}
                        placeholder="https://dropbox.com/..."
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {(project.drive_folder_url || project.dropbox_folder_url || mediaLinks.length > 0) ? (
                      <div className="space-y-2">
                        {project.drive_folder_url && (
                          <a
                            href={project.drive_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted text-primary transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Google Drive</span>
                          </a>
                        )}
                        {project.dropbox_folder_url && (
                          <a
                            href={project.dropbox_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted text-primary transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Dropbox</span>
                          </a>
                        )}
                        {mediaLinks.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted text-primary transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>{link.title || link.link_type}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum link associado</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4 pr-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Preço Cliente (€)</Label>
                        <Input 
                          type="number" 
                          value={editForm.agreed_value}
                          onChange={(e) => setEditForm(prev => ({ ...prev, agreed_value: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Custo Captação (€)</Label>
                        <Input 
                          type="number" 
                          value={editForm.custo_captacao}
                          onChange={(e) => setEditForm(prev => ({ ...prev, custo_captacao: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Custo Edição (€)</Label>
                        <Input 
                          type="number" 
                          value={editForm.custo_edicao}
                          onChange={(e) => setEditForm(prev => ({ ...prev, custo_edicao: Number(e.target.value) }))}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Lucro Estimado</span>
                        <span className={cn("text-xl font-bold", profit >= 0 ? "text-green-500" : "text-red-500")}>
                          €{profit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Preço Cliente
                      </span>
                      <p className="text-xl font-bold text-green-500 mt-1">
                        €{(project.agreed_value || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                      <span className="text-xs text-muted-foreground">Custos Totais</span>
                      <p className="text-xl font-bold text-red-500 mt-1">
                        €{((project.custo_captacao || 0) + (project.custo_edicao || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-xs text-muted-foreground">Lucro</span>
                      <p className="text-xl font-bold text-primary mt-1">
                        €{((project.agreed_value || 0) - (project.custo_captacao || 0) - (project.custo_edicao || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar
            </Button>
            
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
                  {!project.is_delivered && (
                    <Button size="sm" className="gradient-primary" onClick={checkAndComplete}>
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
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Checklist Incompleta
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Existem {pendingChecklistItems.length} itens pendentes na checklist:</p>
              <ul className="list-disc pl-5 space-y-1">
                {pendingChecklistItems.slice(0, 5).map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
                {pendingChecklistItems.length > 5 && (
                  <li>... e mais {pendingChecklistItems.length - 5} itens</li>
                )}
              </ul>
              <p className="font-medium text-foreground">
                Complete todos os itens antes de concluir o projeto.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCompleteDialog(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
