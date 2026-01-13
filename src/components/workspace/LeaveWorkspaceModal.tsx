import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
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
}

export function LeaveWorkspaceModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  onSuccess,
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
            <LogOut className="h-5 w-5" />
            Sair do Workspace
          </DialogTitle>
          <DialogDescription>
            Tem a certeza que deseja sair do workspace "{workspaceName}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg border border-warning/20 bg-warning/5">
            <p className="text-sm text-warning">
              <strong>Atenção:</strong> Ao sair deste workspace, irá perder o acesso a todos os projetos, tarefas e dados associados. Para voltar a ter acesso, precisará de um novo convite.
            </p>
          </div>
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
                A sair...
              </>
            ) : (
              'Sair do Workspace'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
