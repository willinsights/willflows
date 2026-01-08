import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Pencil, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export function KanbanColumn({ column, onUpdateColumn, onAddProject, onProjectClick }: KanbanColumnProps) {
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
        'flex flex-col w-[300px] rounded-xl transition-colors',
        column.is_final ? 'bg-success/5' : 'bg-muted/30',
        isOver && 'bg-primary/10 ring-2 ring-primary/30'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              className="h-7 text-sm"
              autoFocus
            />
          ) : (
            <span className="font-medium truncate">{column.name}</span>
          )}
          
          <Badge variant="secondary" className="text-xs shrink-0">
            {column.projects.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {!column.is_final && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Renomear
                </DropdownMenuItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Palette className="h-4 w-4 mr-2" />
                      Alterar cor
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="right">
                    <div className="flex gap-1 flex-wrap max-w-[150px]">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(color)}
                          className={cn(
                            'w-6 h-6 rounded-full transition-transform hover:scale-110',
                            column.color === color && 'ring-2 ring-offset-2 ring-primary'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddProject(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]"
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
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
            Arraste projetos aqui
          </div>
        )}
      </div>
    </div>
  );
}
