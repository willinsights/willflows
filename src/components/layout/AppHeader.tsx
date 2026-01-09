import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Moon, Sun, Plus, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { TrialBadge } from '@/components/dashboard/TrialBadge';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTheme } from '@/contexts/ThemeContext';

interface AppHeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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

        {/* Search */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div
            className={`relative transition-all duration-200 ${searchOpen ? 'w-full max-w-md' : 'w-auto'}`}
          >
            {searchOpen ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar projetos, clientes, tarefas..."
                  className="pl-9 pr-4 bg-muted/50"
                  autoFocus
                  onBlur={() => setSearchOpen(false)}
                />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="text-muted-foreground"
                type="button"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Trial Badge */}
          <div className="hidden sm:block">
            <TrialBadge />
          </div>

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

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} type="button">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" type="button">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/configuracoes')}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Terminar sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={() => setCreateProjectOpen(false)}
      />
    </>
  );
}
