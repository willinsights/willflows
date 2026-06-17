import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Plus, FolderOpen, User2, CheckSquare, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectDetailsSheet } from '@/components/projects/ProjectDetailsSheet';
import { TrialBadge } from '@/components/dashboard/TrialBadge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { AccountModal } from '@/components/account/AccountModal';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { labelFromSegment } from '@/lib/route-labels';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectWithClient } from '@/hooks/useProjects';

import { logger } from '@/lib/logger';
interface AppHeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

type SearchDropdownRect = {
  left: number;
  top: number;
  width: number;
};

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalInitialTab, setAccountModalInitialTab] = useState<'equipa' | 'integracoes'>('equipa');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<SearchDropdownRect | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectWithClient | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle upgrade click - navigate to plans page
  const handleUpgradeClick = useCallback(() => {
    navigate('/app/planos');
  }, [navigate]);

  const { results, loading, hasQuery } = useGlobalSearch(searchQuery);

  // Fetch user avatar from profiles table, fallback to Google avatar
  useEffect(() => {
    if (!user) return;
    
    const fetchAvatar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setUserAvatarUrl(data.avatar_url);
      } else if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
        setUserAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture);
      }
    };
    
    fetchAvatar();
  }, [user]);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep dropdown above everything (portal + fixed positioning)
  // Optimized: throttled updates to prevent forced reflow
  useEffect(() => {
    if (!searchFocused || !hasQuery) {
      setDropdownRect(null);
      return;
    }

    let rafId: number | null = null;
    let lastUpdate = 0;
    const THROTTLE_MS = 100;

    const update = () => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;
      lastUpdate = now;
      
      const inputEl = inputRef.current;
      if (!inputEl) return;
      const rect = inputEl.getBoundingClientRect();
      setDropdownRect({
        left: rect.left,
        top: rect.bottom,
        width: rect.width,
      });
    };

    // Initial position
    update();

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleResize, { passive: true, capture: true });
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [searchFocused, hasQuery]);

  const getProjectRoute = (isDelivered?: boolean, currentPhase?: 'captacao' | 'edicao') => {
    if (isDelivered) return '/app/finalizados';
    if (currentPhase === 'edicao') return '/app/edicao';
    return '/app/captacao';
  };

  const handleResultClick = async (result: SearchResult) => {
    setSearchQuery('');
    setSearchFocused(false);

    if (result.type === 'project' || result.type === 'task') {
      const projectId = result.type === 'task' ? result.projectId : result.id;
      if (!projectId) {
        navigate(getProjectRoute(result.isDelivered, result.currentPhase));
        return;
      }

      setLoadingProject(true);
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
        logger.error('Error fetching project:', err);
        navigate(getProjectRoute(result.isDelivered, result.currentPhase));
      } finally {
        setLoadingProject(false);
      }
    } else if (result.type === 'client') {
      navigate('/app/clientes');
    }
  };

  const handleProjectModalUpdate = () => {
    setProjectModalOpen(false);
    setSelectedProject(null);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="h-4 w-4 text-primary" />;
      case 'client':
        return <User2 className="h-4 w-4 text-blue-500" />;
      case 'task':
        return <CheckSquare className="h-4 w-4 text-kanban-cyan" />;
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userEmail = user?.email || '';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0];

  const dropdown = (
    <AnimatePresence>
      {searchFocused && hasQuery && dropdownRect && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            position: 'fixed',
            left: dropdownRect.left,
            top: dropdownRect.top + 8,
            width: dropdownRect.width,
          }}
          className="bg-popover border border-border rounded-lg shadow-lg z-[9999] overflow-hidden"
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">A pesquisar...</div>
          ) : results.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleResultClick(result)}
                >
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {result.meta}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">Nenhum resultado encontrado</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <header className="flex items-center h-16 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Menu Button (Mobile) */}
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden mr-2" type="button">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Workspace Selector + Page Title */}
        <div className="flex items-center gap-1 min-w-0">
          <WorkspaceSelector />
          {(() => {
            const segments = location.pathname
              .split('/')
              .filter((s) => s && s !== 'app');
            const labels = segments.map((s) => labelFromSegment(s));
            if (labels.length === 0) return null;
            return (
              <div className="hidden md:flex items-center gap-1 ml-1 shrink-0">
                {labels.map((label, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Search - Always Visible */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div ref={searchRef} className="relative w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Pesquisar projetos, clientes, tarefas..."
                className="pl-9 pr-9 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => {
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Trial Badge - Enhanced */}
          <TrialBadge
            variant="header"
            onUpgradeClick={handleUpgradeClick}
          />

          {/* New Project Button */}
          <Button
            size="sm"
            className="hidden sm:flex gap-2 gradient-primary"
            onClick={() => setCreateProjectOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Projeto</span>
          </Button>
          <Button
            size="icon"
            className="sm:hidden gradient-primary"
            onClick={() => setCreateProjectOpen(true)}
            type="button"
            aria-label="Novo Projeto"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Avatar - Opens Account Modal */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            type="button"
            onClick={() => {
              setAccountModalInitialTab('equipa');
              setAccountModalOpen(true);
            }}
          >
          <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </header>

      {/* Search dropdown rendered in a portal so it stays above all UI */}
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}

      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={() => setCreateProjectOpen(false)}
      />

      <AccountModal open={accountModalOpen} onOpenChange={setAccountModalOpen} initialTab={accountModalInitialTab} />

      <ProjectDetailsSheet
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
        project={selectedProject}
        onUpdate={handleProjectModalUpdate}
      />
    </>
  );
}
