import { useState } from 'react';
import { Check, Building2, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface WorkspaceWithRole {
  id: string;
  name: string;
  slug: string;
  subscription_plan: 'essencial' | 'pro' | 'studio';
  subscription_status: string;
  trial_ends_at?: string | null;
  role: 'admin' | 'editor' | 'captacao' | 'freelancer' | 'visualizador';
  logo_url?: string | null;
}

interface ActiveWorkspacesListProps {
  workspaces: WorkspaceWithRole[];
  currentWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => Promise<void>;
  loading?: boolean;
}

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

export function ActiveWorkspacesList({
  workspaces,
  currentWorkspaceId,
  onSelectWorkspace,
  loading = false,
}: ActiveWorkspacesListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  // Filter out current workspace
  const otherWorkspaces = workspaces.filter(w => w.id !== currentWorkspaceId);

  const handleSelect = async () => {
    if (!selectedId) return;
    
    setSwitching(true);
    try {
      await onSelectWorkspace(selectedId);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (otherWorkspaces.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Não tem outros workspaces ativos.</p>
        <p className="text-xs mt-1">Contacte o administrador ou termine sessão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-2 pr-4">
          {otherWorkspaces.map((workspace) => {
            const isSelected = selectedId === workspace.id;
            const isOwner = workspace.role === 'admin';

            return (
              <button
                key={workspace.id}
                onClick={() => setSelectedId(workspace.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                {/* Workspace icon/logo */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  {workspace.logo_url ? (
                    <img
                      src={workspace.logo_url}
                      alt={workspace.name}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground">
                      {workspace.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Workspace info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{workspace.name}</span>
                    {isOwner && (
                      <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {planLabels[workspace.subscription_plan] || workspace.subscription_plan}
                    </Badge>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {roleLabels[workspace.role] || workspace.role}
                    </span>
                  </div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <Button
        onClick={handleSelect}
        disabled={!selectedId || switching}
        className="w-full"
      >
        {switching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            A mudar...
          </>
        ) : (
          'Mudar para este workspace'
        )}
      </Button>
    </div>
  );
}
