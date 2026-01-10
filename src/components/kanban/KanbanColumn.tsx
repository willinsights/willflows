import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import type { KanbanColumnWithProjects } from '@/hooks/useKanban';

interface KanbanColumnProps {
  column: KanbanColumnWithProjects;
  onUpdateColumn: (columnId: string, updates: { name?: string; color?: string }) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddProject: (columnId: string) => void;
  onProjectClick: (projectId: string) => void;
  isOver?: boolean;
}

const colorOptions = [
  '#6b7280', // Gray
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#22c55e', // Green
  '#ef4444', // Red
  '#06b6d4', // Cyan
];

export function KanbanColumn({ column, onUpdateColumn, onDeleteColumn, onAddProject, onProjectClick }: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const handleSaveName = () => {
    if (editName.trim() && editName !== column.name) {
      onUpdateColumn(column.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleColorChange = (color: string) => {
    onUpdateColumn(column.id, { color });
    setShowColorPicker(false);
  };

  const handleDeleteClick = () => {
    if (column.projects.length > 0) {
      setShowDeleteDialog(true);
    } else if (onDeleteColumn) {
      onDeleteColumn(column.id);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex flex-col w-[240px] rounded-lg transition-all duration-200',
          'backdrop-blur-sm',
          column.is_final ? 'bg-success/5' : 'bg-muted/30',
          isOver && 'bg-primary/10 ring-2 ring-primary/40 shadow-lg shadow-primary/10 scale-[1.01]',
          'hover:shadow-md hover:shadow-black/5'
        )}
      >
        {/* Column Header - Compact */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
              <PopoverTrigger asChild>
                <button
                  className="w-2 h-2 rounded-full shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  style={{ backgroundColor: column.color }}
                  title="Alterar cor"
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="bottom" align="start">
                <div className="flex gap-1 flex-wrap max-w-[100px]">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={cn(
                        'w-4 h-4 rounded-full transition-transform hover:scale-110',
                        column.color === color && 'ring-2 ring-offset-1 ring-primary'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="h-5 text-[11px] px-1"
                autoFocus
              />
            ) : (
              <span className="font-medium text-[11px] truncate">{column.name}</span>
            )}
            
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 shrink-0 font-normal">
              {column.projects.length}
            </Badge>
          </div>

          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs">
                  <Pencil className="h-3 w-3 mr-2" />
                  Renomear
                </DropdownMenuItem>
                {onDeleteColumn && !column.is_final && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-destructive focus:text-destructive text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Apagar coluna
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onAddProject(column.id)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Column Content */}
        <div
          ref={setNodeRef}
          className="flex-1 p-1 space-y-1 overflow-y-auto min-h-[120px] max-h-[calc(100vh-220px)]"
        >
          <SortableContext
            items={column.projects.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {column.projects.map((project) => (
              <KanbanCard
                key={project.id}
                project={project}
                onClick={() => onProjectClick(project.id)}
              />
            ))}
          </SortableContext>

          {column.projects.length === 0 && (
            <div className="flex items-center justify-center h-12 text-[10px] text-muted-foreground border border-dashed border-border/50 rounded-md">
              Arraste projetos aqui
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog - when column has projects */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Coluna não vazia</AlertDialogTitle>
            <AlertDialogDescription>
              Esta coluna contém {column.projects.length} projeto(s). 
              Mova os projetos para outra coluna antes de apagar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
