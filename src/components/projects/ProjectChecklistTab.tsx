import { useState } from 'react';
import { Plus, GripVertical, Pencil, Trash2, CheckSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface ProjectChecklistTabProps {
  checklists: TaskChecklist[];
  setChecklists: React.Dispatch<React.SetStateAction<TaskChecklist[]>>;
  projectId: string;
  taskId: string | null;
  workspaceId: string;
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

export function ProjectChecklistTab({ 
  checklists, 
  setChecklists, 
  projectId,
  taskId,
  workspaceId
}: ProjectChecklistTabProps) {
  const { toast } = useToast();
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

  const completedCount = checklists.filter(c => c.is_completed).length;
  const totalCount = checklists.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = async (checklistId: string, isCompleted: boolean) => {
    try {
      await supabase
        .from('task_checklists')
        .update({ 
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', checklistId);
      
      setChecklists(prev => 
        prev.map(c => c.id === checklistId ? { ...c, is_completed: !isCompleted, completed_at: !isCompleted ? new Date().toISOString() : null } : c)
      );
    } catch (error) {
      console.error('Error toggling checklist:', error);
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    }
  };

  const handleAdd = async () => {
    if (!newItemTitle.trim()) return;
    
    // We need a task_id to create checklist items
    // If no task exists, we need to create one first
    let currentTaskId = taskId;
    
    if (!currentTaskId) {
      // Create a default task for this project
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          workspace_id: workspaceId,
          title: 'Checklist do Projeto',
          phase: 'captacao',
          position: 0,
        })
        .select()
        .single();
      
      if (taskError || !newTask) {
        toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
        return;
      }
      currentTaskId = newTask.id;
    }

    // Validate checklist item data
    const validation = validateWithSchema(checklistItemSchema, {
      title: newItemTitle,
      task_id: currentTaskId,
    });
    
    if (!validation.success) {
      toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
      return;
    }

    const newPosition = checklists.length;
    
    const { data, error } = await supabase
      .from('task_checklists')
      .insert({
        task_id: currentTaskId,
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

    setChecklists(prev => [...prev, data]);
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
    
    // Get the current checklist item to get its task_id
    const currentItem = checklists.find(c => c.id === editingId);
    if (!currentItem) return;

    // Validate edit data
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

    setChecklists(prev => 
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

    setChecklists(prev => prev.filter(c => c.id !== checklistId));
    toast({ title: 'Item removido' });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = checklists.findIndex(c => c.id === active.id);
      const newIndex = checklists.findIndex(c => c.id === over.id);

      const newOrder = arrayMove(checklists, oldIndex, newIndex);
      setChecklists(newOrder);

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
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Checklist ({completedCount}/{totalCount})
          </span>
          {completedCount < totalCount && totalCount > 0 && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pendente
            </Badge>
          )}
        </div>
        
        {totalCount > 0 && (
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {progressPercent.toFixed(0)}% concluído
            </p>
          </div>
        )}
      </div>

      {/* Checklist items */}
      {checklists.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={checklists.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {checklists.map((item) => (
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
        <div className="text-center text-muted-foreground py-8">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum item na checklist</p>
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
    </div>
  );
}
