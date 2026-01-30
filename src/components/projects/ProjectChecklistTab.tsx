import { useState, useMemo } from 'react';
import { Plus, GripVertical, Pencil, Trash2, CheckSquare, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { checklistItemSchema, validateWithSchema } from '@/lib/validation-schemas';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Tables } from '@/integrations/supabase/types';

type TaskChecklist = Tables<'task_checklists'>;
type Task = Tables<'tasks'>;

interface ProjectChecklistTabProps {
  checklists: TaskChecklist[];
  setChecklists: React.Dispatch<React.SetStateAction<TaskChecklist[]>>;
  tasks: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  projectId: string;
  workspaceId: string;
  currentPhase: 'captacao' | 'edicao';
  itemType: 'projeto_captacao' | 'projeto_edicao' | 'projeto_completo' | 'reuniao';
}

interface SortableChecklistItemProps {
  item: TaskChecklist;
  onToggle: (id: string, isCompleted: boolean) => void;
  onEdit: (item: TaskChecklist) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (title: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function SortableChecklistItem({ 
  item, 
  onToggle, 
  onEdit, 
  onDelete,
  editingId,
  editTitle,
  setEditTitle,
  onSaveEdit,
  onCancelEdit
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isEditing = editingId === item.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <Checkbox 
        checked={item.is_completed} 
        onCheckedChange={() => onToggle(item.id, item.is_completed)}
      />
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <Button size="sm" variant="ghost" onClick={onSaveEdit}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            Cancelar
          </Button>
        </div>
      ) : (
        <>
          <span className={cn("flex-1 text-sm", item.is_completed && 'line-through text-muted-foreground')}>
            {item.title}
          </span>
          
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(item)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface PhaseChecklistSectionProps {
  phase: 'captacao' | 'edicao';
  phaseLabel: string;
  checklists: TaskChecklist[];
  taskIds: string[];
  projectId: string;
  workspaceId: string;
  onTaskCreated?: (task: Task) => void;
  onChecklistsChange: (updater: (prev: TaskChecklist[]) => TaskChecklist[]) => void;
  defaultOpen?: boolean;
}

function PhaseChecklistSection({
  phase,
  phaseLabel,
  checklists,
  taskIds,
  projectId,
  workspaceId,
  onTaskCreated,
  onChecklistsChange,
  defaultOpen = true,
}: PhaseChecklistSectionProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter checklists for this phase's tasks
  const phaseChecklists = useMemo(() => 
    checklists.filter(c => taskIds.includes(c.task_id)),
    [checklists, taskIds]
  );

  const completedCount = phaseChecklists.filter(c => c.is_completed).length;
  const totalCount = phaseChecklists.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = totalCount === 0 || completedCount === totalCount;

  const handleToggle = async (checklistId: string, isCompleted: boolean) => {
    try {
      await supabase
        .from('task_checklists')
        .update({ 
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', checklistId);
      
      onChecklistsChange(prev => 
        prev.map(c => c.id === checklistId ? { ...c, is_completed: !isCompleted, completed_at: !isCompleted ? new Date().toISOString() : null } : c)
      );
    } catch (error) {
      console.error('Error toggling checklist:', error);
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    }
  };

  const handleAdd = async () => {
    if (!newItemTitle.trim()) return;
    
    // Get or create task for this phase
    let targetTaskId = taskIds[0];
    
    if (!targetTaskId) {
      // Create a default task for this project with the correct phase
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          workspace_id: workspaceId,
          title: `Checklist ${phaseLabel}`,
          phase: phase,
          position: 0,
        })
        .select()
        .single();
      
      if (taskError || !newTask) {
        toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
        return;
      }

      // Keep parent task list in sync (so the Produção dropdown updates immediately)
      onTaskCreated?.(newTask as Task);
      targetTaskId = newTask.id;
    }

    const validation = validateWithSchema(checklistItemSchema, {
      title: newItemTitle,
      task_id: targetTaskId,
    });
    
    if (!validation.success) {
      toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
      return;
    }

    const newPosition = phaseChecklists.length;
    
    const { data, error } = await supabase
      .from('task_checklists')
      .insert({
        task_id: targetTaskId,
        title: validation.data.title,
        position: newPosition,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao adicionar item', variant: 'destructive' });
      return;
    }

    onChecklistsChange(prev => [...prev, data]);
    setNewItemTitle('');
    setIsAdding(false);
    toast({ title: 'Item adicionado' });
  };

  const handleEdit = (item: TaskChecklist) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    
    const currentItem = phaseChecklists.find(c => c.id === editingId);
    if (!currentItem) return;

    const validation = validateWithSchema(checklistItemSchema, {
      title: editTitle,
      task_id: currentItem.task_id,
    });
    
    if (!validation.success) {
      toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('task_checklists')
      .update({ title: validation.data.title })
      .eq('id', editingId);

    if (error) {
      toast({ title: 'Erro ao editar item', variant: 'destructive' });
      return;
    }

    onChecklistsChange(prev => 
      prev.map(c => c.id === editingId ? { ...c, title: validation.data.title } : c)
    );
    setEditingId(null);
    setEditTitle('');
    toast({ title: 'Item atualizado' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (checklistId: string) => {
    const { error } = await supabase
      .from('task_checklists')
      .delete()
      .eq('id', checklistId);

    if (error) {
      toast({ title: 'Erro ao remover item', variant: 'destructive' });
      return;
    }

    onChecklistsChange(prev => prev.filter(c => c.id !== checklistId));
    toast({ title: 'Item removido' });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = phaseChecklists.findIndex(c => c.id === active.id);
      const newIndex = phaseChecklists.findIndex(c => c.id === over.id);

      const newOrder = arrayMove(phaseChecklists, oldIndex, newIndex);
      
      // Update all checklists with the new order for this phase
      onChecklistsChange(prev => {
        const otherChecklists = prev.filter(c => !taskIds.includes(c.task_id));
        return [...otherChecklists, ...newOrder];
      });

      // Update positions in database
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('task_checklists')
          .update({ position: update.position })
          .eq('id', update.id);
      }
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="h-4 w-4" />
            <span className="font-medium">{phaseLabel}</span>
            <Badge variant="outline" className={cn(
              "text-xs",
              isComplete ? "border-success/30 text-success" : "border-yellow-500/30 text-yellow-500"
            )}>
              {completedCount}/{totalCount}
            </Badge>
            {!isComplete && totalCount > 0 && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4">
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="space-y-1 mb-4">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {progressPercent.toFixed(0)}% concluído
            </p>
          </div>
        )}

        {/* Checklist items */}
        {phaseChecklists.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={phaseChecklists.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-4">
                {phaseChecklists.map((item) => (
                  <SortableChecklistItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    editingId={editingId}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center text-muted-foreground py-4 mb-4">
            <p className="text-sm">Nenhum item na checklist</p>
          </div>
        )}

        {/* Add new item */}
        {isAdding ? (
          <div className="flex items-center gap-2">
            <Input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="Novo item..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewItemTitle('');
                }
              }}
            />
            <Button size="sm" onClick={handleAdd}>
              Adicionar
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setIsAdding(false);
                setNewItemTitle('');
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar item
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ProjectChecklistTab({ 
  checklists, 
  setChecklists, 
  tasks,
  setTasks,
  projectId,
  workspaceId,
  currentPhase,
  itemType
}: ProjectChecklistTabProps) {
  // Filter tasks by phase
  const captacaoTasks = useMemo(() => 
    tasks.filter(t => t.phase === 'captacao'),
    [tasks]
  );
  const edicaoTasks = useMemo(() => 
    tasks.filter(t => t.phase === 'edicao'),
    [tasks]
  );

  const captacaoTaskIds = useMemo(() => captacaoTasks.map(t => t.id), [captacaoTasks]);
  const edicaoTaskIds = useMemo(() => edicaoTasks.map(t => t.id), [edicaoTasks]);

  // Determine which phases to show based on item_type
  const showCaptacao = itemType === 'projeto_captacao' || itemType === 'projeto_completo';
  const showEdicao = itemType === 'projeto_edicao' || itemType === 'projeto_completo';

  // Reuniões don't need checklists
  if (itemType === 'reuniao') {
    return (
      <div className="text-center text-muted-foreground py-8">
        <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Reuniões não necessitam de checklist</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showCaptacao && (
        <PhaseChecklistSection
          phase="captacao"
          phaseLabel="WillFlow Review Captação"
          checklists={checklists}
          taskIds={captacaoTaskIds}
          projectId={projectId}
          workspaceId={workspaceId}
          onTaskCreated={(task) =>
            setTasks?.((prev) => (prev.some((t) => t.id === task.id) ? prev : [...prev, task]))
          }
          onChecklistsChange={setChecklists}
          defaultOpen={currentPhase === 'captacao'}
        />
      )}
      
      {showEdicao && (
        <PhaseChecklistSection
          phase="edicao"
          phaseLabel="WillFlow Review Edição"
          checklists={checklists}
          taskIds={edicaoTaskIds}
          projectId={projectId}
          workspaceId={workspaceId}
          onTaskCreated={(task) =>
            setTasks?.((prev) => (prev.some((t) => t.id === task.id) ? prev : [...prev, task]))
          }
          onChecklistsChange={setChecklists}
          defaultOpen={currentPhase === 'edicao'}
        />
      )}
    </div>
  );
}
