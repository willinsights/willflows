import { memo, useState, useRef, useCallback, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from 'lucide-react';
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
  isDragging?: boolean;
  isOverlay?: boolean;
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

// Estimated height for each card (used for virtualization)
const ESTIMATED_CARD_HEIGHT = 120;
// How many extra items to render above/below viewport
const OVERSCAN_COUNT = 3;
// Minimum projects to enable virtualization
const VIRTUALIZATION_THRESHOLD = 10;

export function KanbanColumn({ column, onUpdateColumn, onDeleteColumn, onAddProject, onProjectClick, isDragging, isOverlay }: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sortable for column reordering (disabled for final columns)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
  } = useSortable({
    id: column.id,
    disabled: column.is_final || isOverlay,
  });

  // Droppable for receiving projects
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  // Combine refs for the column container
  const setNodeRef = useCallback((node: HTMLDivElement | null) => {
    setSortableNodeRef(node);
  }, [setSortableNodeRef]);

  // Transform style for dragging
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Memoize project IDs for SortableContext
  const projectIds = useMemo(() => column.projects.map(p => p.id), [column.projects]);

  // Only use virtualization if we have many projects
  const useVirtualization = column.projects.length >= VIRTUALIZATION_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: column.projects.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: OVERSCAN_COUNT,
    enabled: useVirtualization,
  });

  const handleSaveName = useCallback(() => {
    if (editName.trim() && editName !== column.name) {
      onUpdateColumn(column.id, { name: editName.trim() });
    }
    setIsEditing(false);
  }, [editName, column.name, column.id, onUpdateColumn]);

  const handleColorChange = useCallback((color: string) => {
    onUpdateColumn(column.id, { color });
    setShowColorPicker(false);
  }, [column.id, onUpdateColumn]);

  const handleDeleteClick = useCallback(() => {
    if (column.projects.length > 0) {
      setShowDeleteDialog(true);
    } else if (onDeleteColumn) {
      onDeleteColumn(column.id);
    }
  }, [column.projects.length, column.id, onDeleteColumn]);

  const handleProjectClick = useCallback((projectId: string) => {
    onProjectClick(projectId);
  }, [onProjectClick]);

  const handleAddProject = useCallback(() => {
    onAddProject(column.id);
  }, [column.id, onAddProject]);

  // Render virtualized list
  const renderVirtualizedList = () => {
    const virtualItems = virtualizer.getVirtualItems();
    
    return (
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const project = column.projects[virtualRow.index];
          return (
            <div
              key={project.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <KanbanCard
                project={project}
                onClick={() => handleProjectClick(project.id)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // Render non-virtualized list (for small number of projects)
  const renderNormalList = () => (
    <>
      {column.projects.map((project) => (
        <KanbanCard
          key={project.id}
          project={project}
          onClick={() => handleProjectClick(project.id)}
        />
      ))}
    </>
  );

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'flex flex-col w-[240px] rounded-lg transition-all duration-200',
          'backdrop-blur-sm',
          column.is_final ? 'bg-success/5' : 'bg-muted/30',
          isOver && 'bg-primary/10 ring-2 ring-primary/40 shadow-lg shadow-primary/10 scale-[1.01]',
          'hover:shadow-md hover:shadow-black/5',
          isDragging && 'opacity-50',
          isOverlay && 'shadow-2xl ring-2 ring-primary/60'
        )}
      >
        {/* Column Header - Compact */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Drag handle - only for non-final columns */}
            {!column.is_final && !isOverlay && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-muted/50 transition-colors touch-none"
                title="Arrastar coluna"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            
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
              onClick={handleAddProject}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Column Content - Virtualized */}
        <div
          ref={(node) => {
            setDroppableNodeRef(node);
            if (node) {
              scrollContainerRef.current = node;
            }
          }}
          className="flex-1 p-1 space-y-1 overflow-y-auto min-h-[120px] max-h-[calc(100vh-220px)]"
        >
          <SortableContext
            items={projectIds}
            strategy={verticalListSortingStrategy}
          >
            {useVirtualization ? renderVirtualizedList() : renderNormalList()}
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
