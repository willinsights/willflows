import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Plus, Crown, Users, Loader2, Lock, LogOut, Clock } from 'lucide-react';
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
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { UpgradeAlert } from '@/components/subscription/UpgradeAlert';
import { LeaveWorkspaceModal } from '@/components/workspace/LeaveWorkspaceModal';
import { differenceInDays, parseISO } from 'date-fns';


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

// Helper to calculate trial days remaining
function getTrialDays(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  try {
    return differenceInDays(parseISO(trialEndsAt), new Date());
  } catch {
    return null;
  }
}

export function WorkspaceSelector() {
  const navigate = useNavigate();
  const { currentWorkspace, allWorkspaces, setCurrentWorkspace, loading, refreshWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [workspaceToLeave, setWorkspaceToLeave] = useState<{ id: string; name: string } | null>(null);
  
  const { 
    currentPlan, 
    limits, 
    usage, 
    checkFeature, 
    upgradeAlert, 
    closeUpgradeAlert,
    getFeatureInfo,
  } = usePlanFeatures();

  const adminWorkspaces = allWorkspaces.filter((w) => w.role === 'admin');
  const memberWorkspaces = allWorkspaces.filter((w) => w.role !== 'admin');

  const handleSelectWorkspace = async (workspaceId: string) => {
    if (workspaceId === currentWorkspace?.id) return;
    
    setSwitching(true);
    try {
      const success = await setCurrentWorkspace(workspaceId);
      
      if (success) {
        // CRÍTICO: Usar sessionStorage para handoff determinístico
        // Isso garante que após o reload, o WorkspaceProvider vai usar este workspace
        // independentemente de race conditions com localStorage
        try {
          sessionStorage.setItem('willflow_workspace_switch_to', workspaceId);
        } catch {
          // Fallback: localStorage já foi definido pelo setCurrentWorkspace
        }
        
        // Pequeno delay para garantir que storage é persistido antes do reload
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Reload completo - garante reset total de todo o estado React
        window.location.href = '/app';
        return; // Não continuar após reload
      } else {
        toast({
          title: 'Erro ao trocar workspace',
          description: 'Não foi possível carregar o workspace selecionado.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error switching workspace:', error);
      toast({
        title: 'Erro ao trocar workspace',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateWorkspace = () => {
    // Check if user can create more workspaces
    if (!checkFeature('workspaces')) {
      return; // UpgradeAlert will be shown automatically
    }

    navigate('/onboarding?new=true');
  };

  const handleLeaveWorkspace = (e: React.MouseEvent, workspace: { id: string; name: string }) => {
    e.stopPropagation();
    setWorkspaceToLeave(workspace);
    setLeaveModalOpen(true);
  };

  const handleLeaveSuccess = async () => {
    setLeaveModalOpen(false);
    setWorkspaceToLeave(null);
    // Clear cache and refresh - usar reload completo
    localStorage.removeItem('willflow_workspace_cache');
    localStorage.removeItem('willflow_last_workspace_id');
    window.location.href = '/app';
  };

  const canCreateWorkspace = usage.workspaces < limits.workspaces;

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded hidden sm:block" />
      </div>
    );
  }

  return (
    <>
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
              <DropdownMenuLabel className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Crown className="h-3 w-3" />
                  MEUS WORKSPACES
                </div>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {usage.workspaces}/{limits.workspaces}
                </Badge>
              </DropdownMenuLabel>
                {adminWorkspaces.map((workspace) => {
                  // Get trial info for each workspace
                  const isTrial = workspace.subscription_status === 'trialing';
                  const trialDays = getTrialDays(workspace.trial_ends_at);
                  const planLabel = planLabels[workspace.subscription_plan] || 'Starter';
                  
                  return (
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
                          {isTrial && trialDays !== null && trialDays >= 0 ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1 text-orange-600 border-orange-300">
                              <Clock className="h-2.5 w-2.5" />
                              Trial ({trialDays}d)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {planLabel}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary">
                            Owner
                          </Badge>
                        </div>
                      </div>
                      {currentWorkspace?.id === workspace.id && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
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
                  className="flex items-center gap-3 py-2.5 cursor-pointer group"
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
                  <div className="flex items-center gap-1">
                    {currentWorkspace?.id === workspace.id && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <button
                      onClick={(e) => handleLeaveWorkspace(e, { id: workspace.id, name: workspace.name })}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Sair do workspace"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Create Workspace - Always show option */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleCreateWorkspace}
            className={cn(
              "flex items-center gap-2 py-2.5 cursor-pointer",
              canCreateWorkspace ? "text-primary" : "text-muted-foreground"
            )}
            disabled={switching}
          >
            {canCreateWorkspace ? (
              <Plus className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span className="font-medium">Criar novo workspace</span>
            {!canCreateWorkspace && (
              <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                Upgrade
              </Badge>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Upgrade Alert Modal */}
      <UpgradeAlert
        isOpen={upgradeAlert.isOpen}
        onClose={closeUpgradeAlert}
        feature={upgradeAlert.feature}
        requiredPlan={upgradeAlert.requiredPlan}
        currentPlan={currentPlan}
        isLimitReached={upgradeAlert.isLimitReached}
        currentUsage={usage.workspaces}
        limit={limits.workspaces}
      />

      {/* Leave Workspace Modal */}
      {workspaceToLeave && (
        <LeaveWorkspaceModal
          isOpen={leaveModalOpen}
          onClose={() => {
            setLeaveModalOpen(false);
            setWorkspaceToLeave(null);
          }}
          workspaceId={workspaceToLeave.id}
          workspaceName={workspaceToLeave.name}
          onSuccess={handleLeaveSuccess}
          isLastWorkspace={allWorkspaces.length === 1}
        />
      )}
    </>
  );
}
