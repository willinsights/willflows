import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Plus, FolderOpen, User2, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { TrialBadge } from '@/components/dashboard/TrialBadge';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { AccountModal } from '@/components/account/AccountModal';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AppHeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalInitialTab, setAccountModalInitialTab] = useState<'workspaces' | 'plano' | 'equipa' | 'integracoes'>('workspaces');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, loading, hasQuery } = useGlobalSearch(searchQuery);

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

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setSearchFocused(false);
    
    switch (result.type) {
      case 'project':
        navigate('/app/projetos');
        break;
      case 'client':
        navigate('/app/clientes');
        break;
      case 'task':
        navigate('/app/projetos');
        break;
    }
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

  return (
    <>
      <header className="flex items-center h-16 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Menu Button (Mobile) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden mr-2"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Workspace Name */}
        {currentWorkspace && (
          <div className="flex items-center gap-2 font-medium">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold">
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline max-w-[150px] truncate">
              {currentWorkspace.name}
            </span>
          </div>
        )}

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

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchFocused && hasQuery && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-[100] overflow-hidden"
                >
                  {loading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      A pesquisar...
                    </div>
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
                              <p className="text-xs text-muted-foreground truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {result.meta}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum resultado encontrado
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Trial Badge - Enhanced */}
          <TrialBadge variant="header" onUpgradeClick={() => {
            setAccountModalInitialTab('plano');
            setAccountModalOpen(true);
          }} />

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
              setAccountModalInitialTab('workspaces');
              setAccountModalOpen(true);
            }}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </header>

      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={() => setCreateProjectOpen(false)}
      />

      <AccountModal
        open={accountModalOpen}
        onOpenChange={setAccountModalOpen}
        initialTab={accountModalInitialTab}
      />
    </>
  );
}
