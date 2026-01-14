import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Plus, FolderOpen, User2, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal';
import { TrialBadge } from '@/components/dashboard/TrialBadge';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { AccountModal } from '@/components/account/AccountModal';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getPriceId } from '@/lib/stripe-prices';
import type { ProjectWithClient } from '@/hooks/useProjects';

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
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle upgrade click - open checkout directly
  const handleUpgradeClick = useCallback(async () => {
    try {
      setUpgradeLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/auth');
        return;
      }

      // Default to Pro plan
      const planId = 'pro' as const;
      const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
      const priceId = getPriceId(planId, currencyKey, 'monthly');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { priceId, workspaceId: currentWorkspace?.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error opening checkout:', error);
      toast.error('Erro ao abrir checkout. Tente novamente.');
    } finally {
      setUpgradeLoading(false);
    }
  }, [currentWorkspace, navigate]);

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
  useEffect(() => {
    if (!searchFocused || !hasQuery) {
      setDropdownRect(null);
      return;
    }

    const update = () => {
      const inputEl = inputRef.current;
      if (!inputEl) return;
      const rect = inputEl.getBoundingClientRect();
      setDropdownRect({
        left: rect.left,
        top: rect.bottom,
        width: rect.width,
      });
    };

    update();

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [searchFocused, hasQuery, searchQuery]);

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
        console.error('Error fetching project:', err);
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

        {/* Workspace Selector */}
        <WorkspaceSelector />

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

      <ProjectDetailsModal
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
        project={selectedProject}
        onUpdate={handleProjectModalUpdate}
      />
    </>
  );
}
