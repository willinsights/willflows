import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Plus, Crown, Users, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PLAN_INFO } from '@/lib/stripe-prices';

const planLabels: Record<string, string> = {
  essencial: 'Starter',
  starter: 'Starter',
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

// Plan limits for admin workspaces
const PLAN_WORKSPACE_LIMITS: Record<string, number> = {
  essencial: 1,
  starter: 1,
  pro: 3,
  studio: 10,
};

export function WorkspaceSelector() {
  const navigate = useNavigate();
  const { currentWorkspace, allWorkspaces, setCurrentWorkspace, loading, isAdmin } = useWorkspace();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(false);

  const adminWorkspaces = allWorkspaces.filter((w) => w.role === 'admin');
  const memberWorkspaces = allWorkspaces.filter((w) => w.role !== 'admin');

  const handleSelectWorkspace = async (workspaceId: string) => {
    if (workspaceId === currentWorkspace?.id) return;
    
    setSwitching(true);
    try {
      await setCurrentWorkspace(workspaceId);
      // Reload the page to refresh all data with new workspace context
      window.location.href = '/app';
    } catch (error) {
      toast({
        title: 'Erro ao trocar workspace',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
      setSwitching(false);
    }
  };

  const handleCreateWorkspace = () => {
    // Check if user can create more workspaces based on their best plan
    const bestPlan = adminWorkspaces.reduce((best, ws) => {
      const planOrder = ['essencial', 'starter', 'pro', 'studio'];
      const currentIndex = planOrder.indexOf(ws.subscription_plan);
      const bestIndex = planOrder.indexOf(best);
      return currentIndex > bestIndex ? ws.subscription_plan : best;
    }, 'essencial' as string);

    const limit = PLAN_WORKSPACE_LIMITS[bestPlan] || 1;
    
    if (adminWorkspaces.length >= limit) {
      toast({
        title: 'Limite atingido',
        description: `O seu plano ${planLabels[bestPlan]} permite ${limit} workspace${limit > 1 ? 's' : ''}. Faça upgrade para criar mais.`,
        variant: 'destructive',
      });
      return;
    }

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
        <Button variant="ghost" className="gap-2 px-2 h-auto py-1.5" disabled={switching}>
          {switching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
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
          )}
          <span className="hidden sm:inline max-w-[150px] truncate font-medium">
            {currentWorkspace?.name || 'Workspace'}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        {/* Admin Workspaces */}
        {adminWorkspaces.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Crown className="h-3 w-3" />
              MEUS WORKSPACES ({adminWorkspaces.length})
            </DropdownMenuLabel>
            {adminWorkspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSelectWorkspace(workspace.id)}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
                disabled={switching}
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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {planLabels[workspace.subscription_plan] || workspace.subscription_plan}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary">
                      Admin
                    </Badge>
                  </div>
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
              CONVIDADO ({memberWorkspaces.length})
            </DropdownMenuLabel>
            {memberWorkspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSelectWorkspace(workspace.id)}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
                disabled={switching}
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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {planLabels[workspace.subscription_plan] || workspace.subscription_plan}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {roleLabels[workspace.role] || workspace.role}
                    </Badge>
                  </div>
                </div>
                {currentWorkspace?.id === workspace.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Create Workspace - Only show if user has admin workspaces (can create more) or no workspaces */}
        {(adminWorkspaces.length > 0 || allWorkspaces.length === 0) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleCreateWorkspace}
              className="flex items-center gap-2 py-2.5 cursor-pointer text-primary"
              disabled={switching}
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">Criar novo workspace</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
