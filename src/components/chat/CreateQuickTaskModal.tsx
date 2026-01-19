import { useState } from 'react';
import { useChatActions } from '@/hooks/useChatActions';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckSquare } from 'lucide-react';

interface CreateQuickTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  projectId?: string;
}

export function CreateQuickTaskModal({
  open,
  onOpenChange,
  conversationId,
  projectId: defaultProjectId,
}: CreateQuickTaskModalProps) {
  const { createQuickTask } = useChatActions();
  const { projects } = useProjects();
  const { members } = useWorkspaceMembers();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<'captacao' | 'edicao'>('edicao');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    await createQuickTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      phase,
      projectId,
      conversationId,
      assigneeId: assigneeId && assigneeId !== '__unassigned__' ? assigneeId : undefined,
      dueDate: dueDate || undefined,
    });

    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPhase('edicao');
    setProjectId(defaultProjectId || '');
    setAssigneeId('');
    setDueDate('');
    onOpenChange(false);
  };

  // Filter active projects
  const activeProjects = projects.filter((p) => !p.is_delivered);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Criar Tarefa Rápida
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Título da Tarefa *</Label>
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
            <Label htmlFor="task-description">Descrição (opcional)</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da tarefa..."
              rows={2}
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
                <RadioGroupItem value="captacao" id="quick-phase-captacao" />
                <Label htmlFor="quick-phase-captacao" className="cursor-pointer">
                  Captação
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="edicao" id="quick-phase-edicao" />
                <Label htmlFor="quick-phase-edicao" className="cursor-pointer">
                  Edição
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Projeto *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar projeto" />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Atribuir a (opcional)</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Sem atribuição</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.full_name || member.email || 'Membro'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date">Prazo (opcional)</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !projectId || createQuickTask.isPending}
            >
              {createQuickTask.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
