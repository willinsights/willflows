import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, User2, CheckSquare, Plus, ArrowRight, Wallet } from 'lucide-react';
import { FINANCE_TABS } from '@/pages/app/financeiro/tabs';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectDetailsSheet } from '@/components/projects/ProjectDetailsSheet';
import { useGlobalSearch, type SearchResult } from '@/hooks/useGlobalSearch';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { navSections, superAdminSection, filterSections } from '@/lib/nav-config';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { ProjectWithClient } from '@/hooks/useProjects';

const RECENTS_LIMIT = 5;
const recentsKey = (wsId: string | undefined | null) =>
  `cmdPalette:recents:${wsId ?? 'none'}`;

function loadRecents(wsId: string | undefined | null): SearchResult[] {
  try {
    const raw = localStorage.getItem(recentsKey(wsId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENTS_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveRecents(wsId: string | undefined | null, items: SearchResult[]) {
  try {
    localStorage.setItem(recentsKey(wsId), JSON.stringify(items.slice(0, RECENTS_LIMIT)));
  } catch {
    /* ignore */
  }
}

function ResultIcon({ type }: { type: SearchResult['type'] }) {
  if (type === 'project') return <FolderOpen className="h-4 w-4 text-primary" />;
  if (type === 'client') return <User2 className="h-4 w-4 text-blue-500" />;
  return <CheckSquare className="h-4 w-4 text-kanban-cyan" />;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const { results, loading, hasQuery } = useGlobalSearch(query);
  const navigate = useNavigate();
  const { currentWorkspace, isAdmin } = useWorkspace();
  const { isSuperAdmin } = useSuperAdmin();
  const {
    canViewLeads,
    canViewClients,
    canViewContracts,
    canViewTeam,
    canViewReports,
    canViewAllFinancials,
  } = useFinancialPermissions();

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithClient | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [recents, setRecents] = useState<SearchResult[]>([]);

  // Load recents when workspace changes or palette opens
  useEffect(() => {
    setRecents(loadRecents(currentWorkspace?.id));
  }, [currentWorkspace?.id, open]);

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setQuery(''), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const pushRecent = useCallback(
    (item: SearchResult) => {
      const key = `${item.type}-${item.id}`;
      const filtered = recents.filter((r) => `${r.type}-${r.id}` !== key);
      const next = [item, ...filtered].slice(0, RECENTS_LIMIT);
      setRecents(next);
      saveRecents(currentWorkspace?.id, next);
    },
    [recents, currentWorkspace?.id],
  );

  const getProjectRoute = (isDelivered?: boolean, currentPhase?: 'captacao' | 'edicao') => {
    if (isDelivered) return '/app/finalizados';
    if (currentPhase === 'edicao') return '/app/edicao';
    return '/app/captacao';
  };

  const handleResult = useCallback(
    async (result: SearchResult) => {
      onOpenChange(false);
      pushRecent(result);

      if (result.type === 'client') {
        navigate('/app/clientes');
        return;
      }

      const projectId = result.type === 'task' ? result.projectId : result.id;
      if (!projectId) {
        navigate(getProjectRoute(result.isDelivered, result.currentPhase));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, clients(name)')
          .eq('id', projectId)
          .single();
        if (error) throw error;
        if (data) {
          setSelectedProject(data as ProjectWithClient);
          setProjectModalOpen(true);
        }
      } catch (err) {
        logger.error('CommandPalette: error fetching project', err);
        navigate(getProjectRoute(result.isDelivered, result.currentPhase));
      }
    },
    [navigate, onOpenChange, pushRecent],
  );

  // Nav destinations, using exact same permission gating as AppSidebar
  const baseSections = isSuperAdmin ? [...navSections, superAdminSection] : navSections;
  const navDestinations = filterSections(baseSections, {
    isAdmin,
    isSuperAdmin,
    canViewLeads,
    canViewClients,
    canViewContracts,
    canViewTeam,
    canViewReports,
    canViewFinancials: canViewAllFinancials,
  }).flatMap((s) => s.items.map((i) => ({ ...i, sectionTitle: s.title })));

  const showRecents = !hasQuery && recents.length > 0;

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        {/* Disable cmdk internal filter so useGlobalSearch drives result set */}
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Pesquisar projetos, clientes, tarefas ou saltar para..."
          className="text-base md:text-sm"
        />
        <CommandList className="max-h-[60vh]">
          {loading && hasQuery && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">A pesquisar...</div>
          )}

          {!loading && hasQuery && results.length === 0 && (
            <CommandEmpty>Nenhum resultado encontrado</CommandEmpty>
          )}

          {showRecents && (
            <CommandGroup heading="Recentes">
              {recents.map((result) => (
                <CommandItem
                  key={`recent-${result.type}-${result.id}`}
                  value={`recent ${result.title} ${result.subtitle ?? ''}`}
                  onSelect={() => handleResult(result)}
                  className="gap-3"
                >
                  <ResultIcon type={result.type} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {result.meta}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {hasQuery && results.length > 0 && (
            <CommandGroup heading="Resultados">
              {results.map((result) => (
                <CommandItem
                  key={`res-${result.type}-${result.id}`}
                  value={`res ${result.type} ${result.title} ${result.subtitle ?? ''}`}
                  onSelect={() => handleResult(result)}
                  className="gap-3"
                >
                  <ResultIcon type={result.type} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {result.meta}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(showRecents || (hasQuery && results.length > 0)) && <CommandSeparator />}

          <CommandGroup heading="Ir para">
            {navDestinations.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={`nav-${item.path}`}
                  value={`nav ${item.label} ${item.path}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate(item.path);
                  }}
                  className="gap-3"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                </CommandItem>
              );
            })}
          </CommandGroup>

          {canViewAllFinancials && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Finanças">
                {FINANCE_TABS.filter((t) => t.enabled).map((t) => (
                  <CommandItem
                    key={`fin-${t.id}`}
                    value={`fin ${t.label} ${t.id}`}
                    onSelect={() => {
                      onOpenChange(false);
                      navigate(`/app/financeiro?tab=${t.id}`);
                    }}
                    className="gap-3"
                  >
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">Financeiro · {t.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          <CommandGroup heading="Ações">
            <CommandItem
              value="acao novo projeto criar"
              onSelect={() => {
                onOpenChange(false);
                setCreateProjectOpen(true);
              }}
              className="gap-3"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span className="flex-1">Novo Projeto</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>

        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>Command Palette</span>
          <span>↑↓ navegar · ↵ abrir · esc fechar</span>
        </div>
      </CommandDialog>

      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={() => setCreateProjectOpen(false)}
      />

      <ProjectDetailsSheet
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
        project={selectedProject}
        onUpdate={() => {
          setProjectModalOpen(false);
          setSelectedProject(null);
        }}
      />
    </>
  );
}
