import { useState } from 'react';
import { useChatActions } from '@/hooks/useChatActions';
import { useProjects } from '@/hooks/useProjects';
import { useConversations } from '@/hooks/useConversations';
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
import { Loader2, CheckSquare, Quote } from 'lucide-react';
import type { Message } from '@/hooks/useMessages';

interface CreateTaskFromMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message;
}

export function CreateTaskFromMessageModal({
  open,
  onOpenChange,
  message,
}: CreateTaskFromMessageModalProps) {
  const { createTaskFromMessage } = useChatActions();
  const { projects } = useProjects();
  const { conversations } = useConversations();
  const { members } = useWorkspaceMembers();

  // Find the project from conversation
  const conversation = conversations.find(
    (c) => c.id === message.conversation_id
  );
  const defaultProjectId = conversation?.project_id || '';

  const [title, setTitle] = useState(
    message.body.slice(0, 100) + (message.body.length > 100 ? '...' : '')
  );
  const [phase, setPhase] = useState<'captacao' | 'edicao'>('edicao');
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    await createTaskFromMessage.mutateAsync({
      message,
      title: title.trim(),
      phase,
      projectId,
      assigneeId: assigneeId && assigneeId !== '__unassigned__' ? assigneeId : undefined,
      dueDate: dueDate || undefined,
    });

    onOpenChange(false);
  };

  const handleClose = () => {
    setTitle(
      message.body.slice(0, 100) + (message.body.length > 100 ? '...' : '')
    );
    setPhase('edicao');
    setProjectId(defaultProjectId);
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
            Criar Tarefa a partir de Mensagem
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Original Message Preview */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-2">
              <Quote className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground line-clamp-3">
                {message.body}
              </p>
            </div>
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Título da Tarefa</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Corrigir cor do céu"
              autoFocus
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

          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Projeto</Label>
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
                    {member.full_name || 'Membro'}
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
              disabled={
                !title.trim() ||
                !projectId ||
                createTaskFromMessage.isPending
              }
            >
              {createTaskFromMessage.isPending && (
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
