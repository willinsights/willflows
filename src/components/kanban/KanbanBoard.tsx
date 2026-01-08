import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Plus, Filter, Search, LayoutGrid, List, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { useKanban, KanbanPhase, ProjectWithClient } from '@/hooks/useKanban';
import type { Tables } from '@/integrations/supabase/types';

interface KanbanBoardProps {
  phase: KanbanPhase;
  title: string;
  description: string;
}

export function KanbanBoard({ phase, title, description }: KanbanBoardProps) {
  const { columns, loading, moveProject, updateColumn, addColumn, refresh } = useKanban(phase);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectWithClient | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const projectId = event.active.id as string;
    const project = columns
      .flatMap(c => c.projects)
      .find(p => p.id === projectId);
    
    if (project) {
      setActiveProject(project as ProjectWithClient);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = active.id as string;
    const targetColumnId = over.id as string;

    // Check if dropped on a column
    const targetColumn = columns.find(c => c.id === targetColumnId);
    if (targetColumn) {
      moveProject(projectId, targetColumnId);
    }
  };

  const handleAddProject = useCallback((columnId: string) => {
    setSelectedColumnId(columnId);
    setCreateModalOpen(true);
  }, []);

  const handleProjectClick = useCallback((projectId: string) => {
    // TODO: Open project details modal
    console.log('Open project:', projectId);
  }, []);

  const handleProjectCreated = () => {
    refresh();
    setCreateModalOpen(false);
  };

  // Filter columns by search
  const filteredColumns = columns.map(column => ({
    ...column,
    projects: column.projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              className="pl-9 w-full sm:w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            className="gradient-primary"
            onClick={() => {
              setSelectedColumnId(null);
              setCreateModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Novo Projeto</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6 pt-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {filteredColumns.map((column, index) => (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <KanbanColumn
                  column={column}
                  onUpdateColumn={updateColumn}
                  onAddProject={handleAddProject}
                  onProjectClick={handleProjectClick}
                />
              </motion.div>
            ))}

            {/* Add Column Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredColumns.length * 0.05 }}
            >
              <Button
                variant="outline"
                className="h-12 w-[300px] border-dashed"
                onClick={() => addColumn('Nova Coluna')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Coluna
              </Button>
            </motion.div>
          </div>

          <DragOverlay>
            {activeProject && (
              <div className="w-[280px]">
                <KanbanCard project={activeProject} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleProjectCreated}
        defaultColumnId={selectedColumnId}
        phase={phase}
      />
    </div>
  );
}
