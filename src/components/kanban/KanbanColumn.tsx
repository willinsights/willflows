import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Pencil, Palette, Trash2 } from 'lucide-react';
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
  };

  return (
    <div
      className={cn(
        'flex flex-col w-[260px] rounded-lg transition-all duration-200',
        column.is_final ? 'bg-success/5' : 'bg-muted/20',
        isOver && 'bg-primary/10 ring-1 ring-primary/30'
      )}
    >
      {/* Column Header - Compact */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-border/30">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              className="h-6 text-xs px-1.5"
              autoFocus
            />
          ) : (
            <span className="font-medium text-xs truncate">{column.name}</span>
          )}
          
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
            {column.projects.length}
          </Badge>
        </div>

        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Renomear
              </DropdownMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Palette className="h-3.5 w-3.5 mr-2" />
                    Alterar cor
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="right">
                  <div className="flex gap-1 flex-wrap max-w-[120px]">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        className={cn(
                          'w-5 h-5 rounded-full transition-transform hover:scale-110',
                          column.color === color && 'ring-2 ring-offset-1 ring-primary'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {onDeleteColumn && !column.is_final && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteColumn(column.id)}
                    className="text-destructive focus:text-destructive"
                    disabled={column.projects.length > 0}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    {column.projects.length > 0 ? 'Mover projetos' : 'Apagar coluna'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddProject(column.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className="flex-1 p-1.5 space-y-1.5 overflow-y-auto min-h-[150px] max-h-[calc(100vh-280px)]"
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
          <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground border border-dashed border-border/50 rounded-lg">
            Arraste projetos aqui
          </div>
        )}
      </div>
    </div>
  );
}
