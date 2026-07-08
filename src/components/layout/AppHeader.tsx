import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { TrialBadge } from '@/components/dashboard/TrialBadge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { AccountModal } from '@/components/account/AccountModal';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { labelFromSegment } from '@/lib/route-labels';
import { useCommandPalette } from '@/components/command/CommandPaletteProvider';

interface AppHeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { open: openCommandPalette } = useCommandPalette();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalInitialTab, setAccountModalInitialTab] = useState<'equipa' | 'integracoes'>('equipa');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  const handleUpgradeClick = useCallback(() => {
    navigate('/app/planos');
  }, [navigate]);

  // Fetch user avatar
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

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

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

        {/* Command Palette trigger (styled as input) */}
        <div className="flex-1 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Abrir command palette"
            className="w-full max-w-md flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">Pesquisar...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-medium text-muted-foreground">
              {isMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <TrialBadge variant="header" onUpgradeClick={handleUpgradeClick} />

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

          <NotificationCenter />

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

      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={() => setCreateProjectOpen(false)}
      />

      <AccountModal open={accountModalOpen} onOpenChange={setAccountModalOpen} initialTab={accountModalInitialTab} />
    </>
  );
}
