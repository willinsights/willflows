import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Edit, Trash2, CheckCircle, Calendar, MapPin, User, Clock, 
  Link as LinkIcon, AlertTriangle, CheckSquare, Square, Save, X,
  ExternalLink, Video
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

const priorityLabels = {
  baixa: 'Baixa',
  media: 'Média', 
  alta: 'Alta',
  urgente: 'Urgente',
};

const priorityClasses = {
  baixa: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  media: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  alta: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  urgente: 'bg-red-500/20 text-red-500 border-red-500/30',
};

const itemTypeLabels: Record<string, string> = {
  projeto_captacao: 'Projeto de Captação',
  projeto_edicao: 'Projeto de Edição',
  projeto_completo: 'Captação + Edição',
  reuniao: 'Reunião/Compromisso',
};

export function ProjectDetailsModal({ open, onOpenChange, project, onUpdate }: ProjectDetailsModalProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingChecklistItems, setPendingChecklistItems] = useState<TaskChecklist[]>([]);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    notes: '',
    agreed_value: 0,
    custo_captacao: 0,
    custo_edicao: 0,
  });

  // Fetch related data when project changes
  useEffect(() => {
    if (project && open) {
      fetchRelatedData();
      setEditForm({
        name: project.name,
        notes: project.notes || '',
        agreed_value: project.agreed_value || 0,
        custo_captacao: (project as any).custo_captacao || 0,
        custo_edicao: (project as any).custo_edicao || 0,
      });
    }
  }, [project, open]);

  const fetchRelatedData = async () => {
    if (!project) return;
    
    try {
      // Fetch tasks for this project
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('position');
      
      setTasks(tasksData || []);
      
      // Fetch checklists for all tasks
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: checklistData } = await supabase
          .from('task_checklists')
          .select('*')
          .in('task_id', taskIds)
          .order('position');
        
        setChecklists(checklistData || []);
      }

      // Fetch media links
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
          notes: editForm.notes,
          agreed_value: editForm.agreed_value,
          custo_captacao: editForm.custo_captacao,
          custo_edicao: editForm.custo_edicao,
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
    
    // Check for pending checklist items
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              {isEditing ? (
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="text-lg font-semibold"
                />
              ) : (
                <span className="truncate">{project.name}</span>
              )}
              <Badge className={priorityClasses[project.priority]}>
                {priorityLabels[project.priority]}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <div className="space-y-6 pr-4">
              {/* Project Info */}
              <div className="grid grid-cols-2 gap-4">
                {/* Project Code */}
                {(project as any).project_code && (
                  <div>
                    <span className="text-sm text-muted-foreground">ID do Projeto</span>
                    <p className="font-mono text-primary">{(project as any).project_code}</p>
                  </div>
                )}
                
                {/* Type */}
                <div>
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <p className="font-medium">{itemTypeLabels[(project as any).item_type] || 'Projeto'}</p>
                </div>
              </div>

              {/* Client */}
              {project.clients?.name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{project.clients.name}</span>
                </div>
              )}

              {/* Location */}
              {project.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{project.city}</span>
                </div>
              )}

              {/* Google Meet Link */}
              {(project as any).google_meet_url && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={(project as any).google_meet_url} 
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

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                {project.shoot_date && (
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
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
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Data de Entrega
                    </span>
                    <p className="font-medium">
                      {format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Financial */}
              {isEditing ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Preço Cliente (€)</Label>
                    <Input 
                      type="number" 
                      value={editForm.agreed_value}
                      onChange={(e) => setEditForm(prev => ({ ...prev, agreed_value: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Custo Captação (€)</Label>
                    <Input 
                      type="number" 
                      value={editForm.custo_captacao}
                      onChange={(e) => setEditForm(prev => ({ ...prev, custo_captacao: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Custo Edição (€)</Label>
                    <Input 
                      type="number" 
                      value={editForm.custo_edicao}
                      onChange={(e) => setEditForm(prev => ({ ...prev, custo_edicao: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">Preço Cliente</span>
                    <p className="text-lg font-bold text-green-500">
                      €{(project.agreed_value || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">Custos</span>
                    <p className="text-lg font-bold text-red-500">
                      €{(((project as any).custo_captacao || 0) + ((project as any).custo_edicao || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">Lucro</span>
                    <p className="text-lg font-bold text-primary">
                      €{((project.agreed_value || 0) - ((project as any).custo_captacao || 0) - ((project as any).custo_edicao || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Checklist Section */}
              {checklists.length > 0 && (
                <>
                  <Separator />
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
                          className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted cursor-pointer"
                          onClick={() => handleToggleChecklist(item.id, item.is_completed)}
                        >
                          <Checkbox checked={item.is_completed} />
                          <span className={item.is_completed ? 'line-through text-muted-foreground' : ''}>
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Media Links */}
              {mediaLinks.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm font-medium flex items-center gap-2 mb-3">
                      <LinkIcon className="h-4 w-4" />
                      Links de Mídia
                    </span>
                    <div className="space-y-2">
                      {mediaLinks.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>{link.title || link.link_type}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              {isEditing ? (
                <div>
                  <Label>Notas</Label>
                  <Textarea 
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                  />
                </div>
              ) : project.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Notas</span>
                    <p className="mt-1 whitespace-pre-wrap">{project.notes}</p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

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
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  {!project.is_delivered && (
                    <Button className="gradient-primary" onClick={checkAndComplete}>
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
