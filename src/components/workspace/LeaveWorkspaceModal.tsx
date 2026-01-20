import { useState } from 'react';
import { Loader2, LogOut, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaveWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  onSuccess: () => void;
  isLastWorkspace?: boolean;
}

export function LeaveWorkspaceModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  onSuccess,
  isLastWorkspace = false,
}: LeaveWorkspaceModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    if (!user) return;

    setLeaving(true);
    try {
      // Set membership as inactive
      const { error } = await supabase
        .from('workspace_members')
        .update({ is_active: false })
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id);

      if (error) throw error;

      // If this is the last workspace, delete the account
      if (isLastWorkspace) {
        toast({
          title: 'A eliminar conta...',
          description: 'A sua conta está a ser eliminada permanentemente.',
        });

        const { error: deleteError } = await supabase.functions.invoke('delete-account');
        
        if (deleteError) {
          console.error('Error deleting account:', deleteError);
          // Continue with signout even if delete fails
        }

        // Clear all local storage
        localStorage.clear();
        sessionStorage.clear();

        // Sign out and redirect to landing
        await supabase.auth.signOut();
        window.location.href = '/';
        return;
      }

      toast({
        title: 'Saiu do workspace',
        description: `Já não tem acesso ao workspace "${workspaceName}".`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error leaving workspace:', error);
      toast({
        title: 'Erro ao sair',
        description: error.message || 'Ocorreu um erro ao sair do workspace.',
        variant: 'destructive',
      });
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLastWorkspace ? (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-destructive">Eliminar Conta e Sair</span>
              </>
            ) : (
              <>
                <LogOut className="h-5 w-5" />
                Sair do Workspace
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLastWorkspace 
              ? 'Este é o seu único workspace. Ao sair, a sua conta será eliminada.'
              : `Tem a certeza que deseja sair do workspace "${workspaceName}"?`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLastWorkspace ? (
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <p className="text-sm text-destructive font-medium mb-2">
                <strong>Atenção: A sua conta Willflow será eliminada permanentemente!</strong>
              </p>
              <ul className="text-sm text-destructive list-disc list-inside space-y-1">
                <li>Todos os seus dados serão perdidos</li>
                <li>Esta ação é irreversível</li>
                <li>Para voltar a utilizar a Willflow, terá de criar uma nova conta</li>
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-warning/20 bg-warning/5">
              <p className="text-sm text-warning">
                <strong>Atenção:</strong> Ao sair deste workspace, irá perder o acesso a todos os projetos, tarefas e dados associados. Para voltar a ter acesso, precisará de um novo convite.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={leaving}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={leaving}
          >
            {leaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isLastWorkspace ? 'A eliminar conta...' : 'A sair...'}
              </>
            ) : (
              isLastWorkspace ? 'Eliminar Conta e Sair' : 'Sair do Workspace'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
