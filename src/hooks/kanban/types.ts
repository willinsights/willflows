import type { Tables } from '@/integrations/supabase/types';

export type KanbanPhase = 'captacao' | 'edicao';
export type KanbanColumn = Tables<'kanban_columns'>;
export type Project = Tables<'projects'>;
export type Task = Tables<'tasks'>;

export interface TeamMember {
  user_id: string;
  phase: 'captacao' | 'edicao';
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
}

export interface ProjectWithClient extends Project {
  clients?: { name: string } | null;
  task_count?: number;
  task_completed?: number;
  checklist_count?: number;
  checklist_completed?: number;
  team_members?: TeamMember[];
  has_approved_video?: boolean;
}

export interface KanbanColumnWithProjects extends KanbanColumn {
  projects: ProjectWithClient[];
}

export interface PendingAlertState {
  open: boolean;
  items: Array<{ id: string; title: string }>;
  tasks: number;
  checklists: number;
  message?: string;
}

export interface PendingDeliveryState {
  open: boolean;
  projectId: string | null;
  projectName: string;
  targetColumnId: string | null;
}

export const initialPendingAlert: PendingAlertState = {
  open: false,
  items: [],
  tasks: 0,
  checklists: 0,
};

export const initialPendingDelivery: PendingDeliveryState = {
  open: false,
  projectId: null,
  projectName: '',
  targetColumnId: null,
};

// Debounce helper
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export const LOCAL_ECHO_TTL_MS = 1500;
