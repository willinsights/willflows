import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Plus, Search, Loader2 } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanFilters, KanbanFilterState } from './KanbanFilters';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectDetailsSheet } from '@/components/projects/ProjectDetailsSheet';
import { ChecklistPendingAlert } from '@/components/projects/ChecklistPendingAlert';
import { useKanban, KanbanPhase, ProjectWithClient } from '@/hooks/useKanban';
import { useCategories } from '@/hooks/useCategories';

interface KanbanBoardProps {
  phase: KanbanPhase;
  title: string;
  description: string;
}

const defaultFilters: KanbanFilterState = {
  clientId: null,
  priority: null,
  assigneeId: null,
  dueDateRange: 'all',
  categoryId: null,
};

interface PendingAlertData {
  items: Array<{ id: string; title: string }>;
  tasks: number;
  checklists: number;
  message?: string;
}

export function KanbanBoard({ phase, title, description }: KanbanBoardProps) {
  const { columns, loading, moveProject, updateColumn, addColumn, deleteColumn, refresh, silentRefresh, pendingAlert, clearPendingAlert } = useKanban(phase);
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<KanbanFilterState>(defaultFilters);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectWithClient | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const projectId = event.active.id as string;
    const project = columns
      .flatMap(c => c.projects)
      .find(p => p.id === projectId);
    
    if (project) {
      setActiveProject(project);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);
    setOverId(null);

    if (!over) return;

    const projectId = active.id as string;
    let targetColumnId = over.id as string;

    // Check if dropped on another project, find its column
    const isProject = columns.some(c => c.projects.some(p => p.id === targetColumnId));
    if (isProject) {
      const column = columns.find(c => c.projects.some(p => p.id === targetColumnId));
      if (column) {
        targetColumnId = column.id;
      }
    }

    // Check if dropped on a column
    const targetColumn = columns.find(c => c.id === targetColumnId);
    if (targetColumn) {
      // Find current column of the project
      const currentColumn = columns.find(c => c.projects.some(p => p.id === projectId));
      if (currentColumn?.id !== targetColumnId) {
        moveProject(projectId, targetColumnId);
      }
    }
  };

  const handleAddProject = useCallback((columnId: string) => {
    setSelectedColumnId(columnId);
    setCreateModalOpen(true);
  }, []);

  const handleProjectClick = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  const handleProjectCreated = () => {
    refresh();
    setCreateModalOpen(false);
  };

  // Get unique clients from projects for filter
  const uniqueClients = useMemo(() => {
    const clientMap = new Map<string, string>();
    columns.flatMap(c => c.projects).forEach(p => {
      if (p.client_id && p.clients?.name) {
        clientMap.set(p.client_id, p.clients.name);
      }
    });
    return Array.from(clientMap, ([id, name]) => ({ id, name }));
  }, [columns]);

  // Get unique team members from projects for filter
  const uniqueTeamMembers = useMemo(() => {
    const memberMap = new Map<string, { full_name: string | null; email: string }>();
    columns.flatMap(c => c.projects)
      .flatMap(p => p.team_members || [])
      .forEach(m => {
        if (!memberMap.has(m.user_id) && m.profile) {
          memberMap.set(m.user_id, {
            full_name: m.profile.full_name || null,
            email: m.profile.email || '',
          });
        }
      });
    return Array.from(memberMap, ([user_id, profile]) => ({
      user_id,
      full_name: profile.full_name,
      email: profile.email,
    }));
  }, [columns]);

  // Filter columns by search, advanced filters, and limit "Entregue" to 7 days
  const filteredColumns = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return columns.map(column => {
      let filteredProjects = column.projects;

      // Text search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredProjects = filteredProjects.filter(project =>
          project.name.toLowerCase().includes(query) ||
          project.clients?.name?.toLowerCase().includes(query) ||
          (project as any).project_code?.toLowerCase().includes(query)
        );
      }

      // Client filter
      if (filters.clientId) {
        filteredProjects = filteredProjects.filter(p => p.client_id === filters.clientId);
      }

      // Priority filter
      if (filters.priority) {
        filteredProjects = filteredProjects.filter(p => p.priority === filters.priority);
      }

      // Assignee filter
      if (filters.assigneeId) {
        filteredProjects = filteredProjects.filter(p =>
          p.team_members?.some(m => m.user_id === filters.assigneeId)
        );
      }

      // Due date filter
      if (filters.dueDateRange !== 'all') {
        filteredProjects = filteredProjects.filter(p => {
          if (!p.delivery_date) return false;
          const date = new Date(p.delivery_date);
          switch (filters.dueDateRange) {
            case 'overdue':
              return isPast(date) && !isToday(date);
            case 'today':
              return isToday(date);
            case 'this_week':
              return isThisWeek(date, { weekStartsOn: 1 });
            case 'this_month':
              return isThisMonth(date);
            default:
              return true;
          }
        });
      }

      // Category filter
      if (filters.categoryId) {
        filteredProjects = filteredProjects.filter(p => 
          (p as any).custom_category_id === filters.categoryId
        );
      }

      // For "Entregue" column (is_final), only show deliveries from last 7 days
      if (column.is_final) {
        filteredProjects = filteredProjects.filter(project => {
          if (!project.delivered_at) return true;
          return new Date(project.delivered_at) >= sevenDaysAgo;
        });
      }

      return {
        ...column,
        projects: filteredProjects,
      };
    });
  }, [columns, searchQuery, filters]);

  // Get selected project
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return columns.flatMap(c => c.projects).find(p => p.id === selectedProjectId) || null;
  }, [columns, selectedProjectId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Subtle focal background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-primary/[0.02] dark:bg-primary/[0.04] rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-success/[0.02] dark:bg-success/[0.03] rounded-full blur-[60px]" />
      </div>
      {/* Header - Compact */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 border-b border-border/40 shrink-0">
        <div>
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              className="pl-7 h-7 text-[11px] w-full sm:w-[160px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Pesquisar projetos por nome, cliente ou código"
            />
          </div>
          <KanbanFilters
            filters={filters}
            onFiltersChange={setFilters}
            clients={uniqueClients}
            teamMembers={uniqueTeamMembers}
            categories={categories}
          />
          <Button
            size="sm"
            className="gradient-primary h-7 text-[11px] px-2"
            onClick={() => {
              setSelectedColumnId(null);
              setCreateModalOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-0.5" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-3 py-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-2 h-full min-w-max">
            {filteredColumns.map((column, index) => (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <KanbanColumn
                  column={column}
                  onUpdateColumn={updateColumn}
                  onDeleteColumn={deleteColumn}
                  onAddProject={handleAddProject}
                  onProjectClick={handleProjectClick}
                  isOver={overId === column.id}
                />
              </motion.div>
            ))}

            {/* Add Column Button */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredColumns.length * 0.02 }}
            >
              <Button
                variant="outline"
                className="h-8 w-[240px] border-dashed text-[11px]"
                onClick={() => addColumn('Nova Coluna')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Coluna
              </Button>
            </motion.div>
          </div>

          <DragOverlay>
            {activeProject && (
              <div className="w-[220px] rotate-1 opacity-90">
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

      {/* Project Details Sheet */}
      <ProjectDetailsSheet
        open={!!selectedProjectId}
        onOpenChange={(open) => !open && setSelectedProjectId(null)}
        project={selectedProject}
        onUpdate={refresh}
        onSilentUpdate={silentRefresh}
      />

      {/* Checklist Pending Alert - shown when trying to deliver with incomplete items */}
      <ChecklistPendingAlert
        open={pendingAlert.open}
        onOpenChange={(open) => !open && clearPendingAlert()}
        pendingItems={pendingAlert.items}
        pendingTasksCount={pendingAlert.tasks}
        pendingChecklistsCount={pendingAlert.checklists}
        message={pendingAlert.message}
      />
    </div>
  );
}
