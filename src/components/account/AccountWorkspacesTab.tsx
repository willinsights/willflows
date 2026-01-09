import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Plus, Check, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { UserWorkspace } from '@/hooks/useUserWorkspaces';

interface AccountWorkspacesTabProps {
  workspaces: UserWorkspace[];
  loading: boolean;
  currentWorkspaceId?: string;
  planName: string;
}

const PLAN_WORKSPACE_LIMITS: Record<string, number> = {
  essencial: 1,
  pro: 3,
  studio: 10,
};

export function AccountWorkspacesTab({
  workspaces,
  loading,
  currentWorkspaceId,
  planName,
}: AccountWorkspacesTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const maxWorkspaces = PLAN_WORKSPACE_LIMITS[planName] || 1;
  const canCreateWorkspace = workspaces.length < maxWorkspaces;

  const handleCreateWorkspace = () => {
    if (!canCreateWorkspace) {
      toast({
        title: 'Limite atingido',
        description: `O seu plano ${planName.charAt(0).toUpperCase() + planName.slice(1)} permite no máximo ${maxWorkspaces} workspace${maxWorkspaces > 1 ? 's' : ''}. Faça upgrade para criar mais.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Navigate to onboarding to create new workspace
    navigate('/onboarding?new=true');
  };

  const handleSwitchWorkspace = (workspaceId: string) => {
    // For now, just show a toast - full workspace switching would need more implementation
    toast({
      title: 'Em breve',
      description: 'A funcionalidade de trocar workspace estará disponível em breve.',
    });
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Admin',
      editor: 'Editor',
      captacao: 'Captação',
      freelancer: 'Freelancer',
      visualizador: 'Visualizador',
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {workspaces.length} de {maxWorkspaces} workspace{maxWorkspaces > 1 ? 's' : ''}
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={handleCreateWorkspace}
              disabled={!canCreateWorkspace}
              className={cn(
                'gap-2',
                canCreateWorkspace && 'gradient-primary'
              )}
            >
              <Plus className="h-4 w-4" />
              Criar Workspace
            </Button>
          </TooltipTrigger>
          {!canCreateWorkspace && (
            <TooltipContent>
              <p>Limite de workspaces atingido. Faça upgrade do plano.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      <div className="space-y-2">
        {workspaces.map((workspace, index) => {
          const isActive = workspace.id === currentWorkspaceId;
          
          return (
            <motion.div
              key={workspace.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer',
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
              onClick={() => !isActive && handleSwitchWorkspace(workspace.id)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm',
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                )}>
                  {workspace.logo_url ? (
                    <img 
                      src={workspace.logo_url} 
                      alt={workspace.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    workspace.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {workspace.name}
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleLabel(workspace.role)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {workspace.subscription_plan.charAt(0).toUpperCase() + workspace.subscription_plan.slice(1)}
              </Badge>
            </motion.div>
          );
        })}
      </div>

      {workspaces.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum workspace encontrado</p>
        </div>
      )}
    </div>
  );
}
