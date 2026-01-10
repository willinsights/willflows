import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Plus, Crown, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useUserWorkspaces, UserWorkspace } from '@/hooks/useUserWorkspaces';
import { cn } from '@/lib/utils';

const planLabels: Record<string, string> = {
  essencial: 'Essencial',
  pro: 'Pro',
  studio: 'Studio',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  captacao: 'Captação',
  freelancer: 'Freelancer',
  visualizador: 'Visualizador',
};

export function WorkspaceSelector() {
  const navigate = useNavigate();
  const { currentWorkspace, refreshWorkspace } = useWorkspace();
  const { workspaces, loading } = useUserWorkspaces();

  const adminWorkspaces = workspaces.filter((w) => w.role === 'admin');
  const memberWorkspaces = workspaces.filter((w) => w.role !== 'admin');

  const handleSelectWorkspace = async (workspace: UserWorkspace) => {
    if (workspace.id === currentWorkspace?.id) return;
    // Refresh will pick up the new workspace
    await refreshWorkspace();
    // For now, just reload the page to switch context
    window.location.href = '/app';
  };

  const handleCreateWorkspace = () => {
    navigate('/onboarding?new=true');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded hidden sm:block" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2 h-auto py-1.5">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold">
            {currentWorkspace?.logo_url ? (
              <img
                src={currentWorkspace.logo_url}
                alt={currentWorkspace.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              currentWorkspace?.name?.charAt(0).toUpperCase() || 'W'
            )}
          </div>
          <span className="hidden sm:inline max-w-[150px] truncate font-medium">
            {currentWorkspace?.name || 'Workspace'}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {/* Admin Workspaces */}
        {adminWorkspaces.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Crown className="h-3 w-3" />
              MEUS WORKSPACES (ADMIN)
            </DropdownMenuLabel>
            {adminWorkspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSelectWorkspace(workspace)}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
                  {workspace.logo_url ? (
                    <img
                      src={workspace.logo_url}
                      alt={workspace.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    workspace.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{workspace.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {planLabels[workspace.subscription_plan] || workspace.subscription_plan}
                  </p>
                </div>
                {currentWorkspace?.id === workspace.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Member Workspaces */}
        {memberWorkspaces.length > 0 && (
          <>
            {adminWorkspaces.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              WORKSPACES (MEMBRO)
            </DropdownMenuLabel>
            {memberWorkspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSelectWorkspace(workspace)}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded bg-muted text-muted-foreground text-sm font-bold flex-shrink-0">
                  {workspace.logo_url ? (
                    <img
                      src={workspace.logo_url}
                      alt={workspace.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    workspace.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{workspace.name}</p>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {roleLabels[workspace.role] || workspace.role}
                  </Badge>
                </div>
                {currentWorkspace?.id === workspace.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Create Workspace */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleCreateWorkspace}
          className="flex items-center gap-2 py-2.5 cursor-pointer text-primary"
        >
          <Plus className="h-4 w-4" />
          <span className="font-medium">Criar novo workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
