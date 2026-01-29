import { useState, useEffect, useMemo } from 'react';
import { Loader2, CalendarIcon, User, FolderOpen, ListChecks, Film, Settings2 } from 'lucide-react';
import { TaskChatIndicator } from './TaskChatIndicator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { VideoProductionTab } from '@/components/video-production/VideoProductionTab';

type PriorityLevel = 'baixa' | 'media' | 'alta' | 'urgente';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  phase: 'captacao' | 'edicao';
  project_id: string;
  workspace_id?: string;
  due_date?: string | null;
  is_completed: boolean;
  priority?: PriorityLevel | null;
}

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projectId?: string;
  defaultPhase?: 'captacao' | 'edicao';
  onSuccess?: () => void;
}

export function TaskModal({
  open,
  onOpenChange,
  task,
  projectId: initialProjectId,
  defaultPhase = 'edicao',
  onSuccess,
}: TaskModalProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { members } = useWorkspaceMembers();
  const { projects } = useProjects();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasFeatureAccess, loading: planLoading } = usePlanFeatures();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<'captacao' | 'edicao'>(defaultPhase);
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('__unassigned__');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('media');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const isEditing = !!task;
  // Wait for plan features to load before checking video approval access
  const hasVideoApproval = !planLoading && hasFeatureAccess('videoApproval');

  // Active projects for selection
  const activeProjects = projects.filter(
    (p) => !p.is_delivered && p.item_type !== 'reuniao'
  );

  // Reset form when modal opens or task changes
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setPhase(task.phase);
        setProjectId(task.project_id);
        setDueDate(task.due_date || '');
        setPriority(task.priority || 'media');
        // Load assignee if editing
        loadAssignee(task.id);
      } else {
        setTitle('');
        setDescription('');
        setPhase(defaultPhase);
        setProjectId(initialProjectId || '');
        setDueDate('');
        setPriority('media');
        setAssigneeId('__unassigned__');
        setActiveTab('details');
      }
    }
  }, [open, task, defaultPhase, initialProjectId]);

  const loadAssignee = async (taskId: string) => {
    const { data } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId)
      .maybeSingle();
    
    if (data?.user_id) {
      setAssigneeId(data.user_id);
    } else {
      setAssigneeId('__unassigned__');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !currentWorkspace) return;

    setIsSubmitting(true);

    try {
      if (isEditing && task) {
        // Update existing task
        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            phase,
            due_date: dueDate || null,
            priority,
          })
          .eq('id', task.id);

        if (taskError) throw taskError;

        // Update assignee
        await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', task.id);

        if (assigneeId && assigneeId !== '__unassigned__') {
          await supabase
            .from('task_assignees')
            .insert({
              task_id: task.id,
              user_id: assigneeId,
            });
        }

        toast({
          title: 'Tarefa atualizada',
          description: 'As alterações foram guardadas.',
        });
      } else {
        // Create new task
        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            phase,
            project_id: projectId,
            workspace_id: currentWorkspace.id,
            created_by: user?.id,
            due_date: dueDate || null,
            priority,
          })
          .select()
          .single();

        if (taskError) throw taskError;

        // Add assignee if selected
        if (assigneeId && assigneeId !== '__unassigned__') {
          await supabase
            .from('task_assignees')
            .insert({
              task_id: newTask.id,
              user_id: assigneeId,
            });
        }

        toast({
          title: 'Tarefa criada',
          description: 'A tarefa foi adicionada ao projeto.',
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível guardar a tarefa.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  // Determine modal size based on active tab
  // Use 2/3 of the screen width for better readability
  const modalSize = activeTab === 'production' ? 'max-w-[80vw]' : 'max-w-[66vw]';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={modalSize}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os detalhes da tarefa.'
              : 'Preencha os campos para criar uma nova tarefa.'}
          </DialogDescription>
        </DialogHeader>

        {isEditing && hasVideoApproval ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="production" className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Produção
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <TaskDetailsForm
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                phase={phase}
                setPhase={setPhase}
                projectId={projectId}
                setProjectId={setProjectId}
                assigneeId={assigneeId}
                setAssigneeId={setAssigneeId}
                dueDate={dueDate}
                setDueDate={setDueDate}
                priority={priority}
                setPriority={setPriority}
                isSubmitting={isSubmitting}
                isEditing={isEditing}
                task={task}
                initialProjectId={initialProjectId}
                activeProjects={activeProjects}
                members={members}
                onSubmit={handleSubmit}
                onClose={handleClose}
              />
            </TabsContent>

            <TabsContent value="production" className="mt-4">
              {task && currentWorkspace && (
                <VideoProductionTab
                  taskId={task.id}
                  projectId={task.project_id}
                  workspaceId={task.workspace_id || currentWorkspace.id}
                />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <TaskDetailsForm
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            phase={phase}
            setPhase={setPhase}
            projectId={projectId}
            setProjectId={setProjectId}
            assigneeId={assigneeId}
            setAssigneeId={setAssigneeId}
            dueDate={dueDate}
            setDueDate={setDueDate}
            priority={priority}
            setPriority={setPriority}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
            task={task}
            initialProjectId={initialProjectId}
            activeProjects={activeProjects}
            members={members}
            onSubmit={handleSubmit}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Extracted form component for reuse
interface TaskDetailsFormProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  phase: 'captacao' | 'edicao';
  setPhase: (v: 'captacao' | 'edicao') => void;
  projectId: string;
  setProjectId: (v: string) => void;
  assigneeId: string;
  setAssigneeId: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  priority: PriorityLevel;
  setPriority: (v: PriorityLevel) => void;
  isSubmitting: boolean;
  isEditing: boolean;
  task?: Task | null;
  initialProjectId?: string;
  activeProjects: any[];
  members: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function TaskDetailsForm({
  title,
  setTitle,
  description,
  setDescription,
  phase,
  setPhase,
  projectId,
  setProjectId,
  assigneeId,
  setAssigneeId,
  dueDate,
  setDueDate,
  priority,
  setPriority,
  isSubmitting,
  isEditing,
  task,
  initialProjectId,
  activeProjects,
  members,
  onSubmit,
  onClose,
}: TaskDetailsFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Chat Indicator - only show when editing */}
      {isEditing && task?.id && (
        <TaskChatIndicator 
          taskId={task.id} 
          onOpenChat={() => onClose()} 
        />
      )}

      {/* Task Title */}
      <div className="space-y-2">
        <Label htmlFor="task-title">Título *</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Corrigir cor do céu"
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="task-description">Descrição</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes adicionais sobre a tarefa..."
          rows={3}
        />
      </div>

      {/* Phase Selection */}
      <div className="space-y-2">
        <Label>Fase</Label>
        <RadioGroup
          value={phase}
          onValueChange={(v) => setPhase(v as 'captacao' | 'edicao')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="captacao" id="phase-captacao" />
            <Label htmlFor="phase-captacao" className="cursor-pointer">
              Captação
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="edicao" id="phase-edicao" />
            <Label htmlFor="phase-edicao" className="cursor-pointer">
              Edição
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Project Selection - Only show if not pre-selected */}
      {!initialProjectId && (
        <div className="space-y-2">
          <Label htmlFor="project" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Projeto *
          </Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar projeto" />
            </SelectTrigger>
            <SelectContent>
              {activeProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_code ? `${project.project_code} - ` : ''}
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Assignee */}
      <div className="space-y-2">
        <Label htmlFor="assignee" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Atribuir a
        </Label>
        <Select value={assigneeId} onValueChange={setAssigneeId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar membro">
              {assigneeId && assigneeId !== '__unassigned__' ? (
                (() => {
                  const selectedMember = members.find(m => m.user_id === assigneeId);
                  if (!selectedMember) return 'Selecionar membro';
                  const initials = selectedMember.full_name
                    ? selectedMember.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    : selectedMember.email?.[0]?.toUpperCase() || '?';
                  return (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-[30px] w-[30px]">
                        <AvatarImage src={selectedMember.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedMember.full_name || selectedMember.email}</span>
                    </div>
                  );
                })()
              ) : (
                'Selecionar membro'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unassigned__">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <span>Sem atribuição</span>
              </div>
            </SelectItem>
            {members.map((member) => {
              const initials = member.full_name
                ? member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                : member.email?.[0]?.toUpperCase() || '?';
              return (
                <SelectItem key={member.user_id} value={member.user_id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-[30px] w-[30px]">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.full_name || member.email}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div className="space-y-2">
        <Label htmlFor="due-date" className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Prazo
        </Label>
        <Input
          id="due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Prioridade</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || !projectId || isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Guardar' : 'Criar Tarefa'}
        </Button>
      </DialogFooter>
    </form>
  );
}
