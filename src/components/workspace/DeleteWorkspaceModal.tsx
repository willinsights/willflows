import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  onSuccess: () => void;
  isLastWorkspace: boolean;
}

export function DeleteWorkspaceModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  onSuccess,
  isLastWorkspace,
}: DeleteWorkspaceModalProps) {
  const { toast } = useToast();
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmName === workspaceName && !isLastWorkspace;

  const handleDelete = async () => {
    if (!canDelete) return;

    setDeleting(true);
    try {
      // Delete in cascade order
      // 1. Calendar events
      await supabase
        .from('calendar_events')
        .delete()
        .eq('workspace_id', workspaceId);

      // 2. Notifications
      await supabase
        .from('notifications')
        .delete()
        .eq('workspace_id', workspaceId);

      // 3. Payments
      await supabase
        .from('payments')
        .delete()
        .eq('workspace_id', workspaceId);

      // 4. Tasks (need to delete related data first)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        await supabase.from('task_assignees').delete().in('task_id', taskIds);
        await supabase.from('task_attachments').delete().in('task_id', taskIds);
        await supabase.from('task_checklists').delete().in('task_id', taskIds);
        await supabase.from('task_comments').delete().in('task_id', taskIds);
        await supabase.from('tasks').delete().eq('workspace_id', workspaceId);
      }

      // 5. Projects (need to delete related data first)
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        await supabase.from('project_comments').delete().in('project_id', projectIds);
        await supabase.from('project_media_links').delete().in('project_id', projectIds);
        await supabase.from('project_team').delete().in('project_id', projectIds);
        await supabase.from('projects').delete().eq('workspace_id', workspaceId);
      }

      // 6. Clients (need to delete related data first)
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (clients && clients.length > 0) {
        const clientIds = clients.map(c => c.id);
        await supabase.from('client_communications').delete().in('client_id', clientIds);
        await supabase.from('client_notes').delete().in('client_id', clientIds);
        await supabase.from('clients').delete().eq('workspace_id', workspaceId);
      }

      // 7. Categories
      await supabase
        .from('categories')
        .delete()
        .eq('workspace_id', workspaceId);

      // 8. Kanban columns
      await supabase
        .from('kanban_columns')
        .delete()
        .eq('workspace_id', workspaceId);

      // 9. Workspace invitations
      await supabase
        .from('workspace_invitations')
        .delete()
        .eq('workspace_id', workspaceId);

      // 10. Workspace role permissions
      await supabase
        .from('workspace_role_permissions')
        .delete()
        .eq('workspace_id', workspaceId);

      // 11. Activity log
      await supabase
        .from('activity_log')
        .delete()
        .eq('workspace_id', workspaceId);

      // 12. Workspace members
      await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId);

      // 13. Finally, delete the workspace
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;

      toast({
        title: 'Workspace eliminado',
        description: 'O workspace e todos os dados foram eliminados permanentemente.',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      toast({
        title: 'Erro ao eliminar',
        description: error.message || 'Ocorreu um erro ao eliminar o workspace.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Workspace
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Todos os dados serão perdidos permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLastWorkspace ? (
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <p className="text-sm text-destructive font-medium">
                Não é possível eliminar o último workspace. Crie outro workspace antes de eliminar este.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <p className="text-sm text-destructive">
                  <strong>Os seguintes dados serão eliminados:</strong>
                </p>
                <ul className="text-sm text-destructive mt-2 list-disc list-inside space-y-1">
                  <li>Todos os projetos e tarefas</li>
                  <li>Todos os clientes</li>
                  <li>Todos os pagamentos</li>
                  <li>Todos os eventos do calendário</li>
                  <li>Todos os membros e convites</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-name">
                  Escreva <strong>{workspaceName}</strong> para confirmar
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={workspaceName}
                  disabled={deleting}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={deleting}>
            Cancelar
          </Button>
          {!isLastWorkspace && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A eliminar...
                </>
              ) : (
                'Eliminar Permanentemente'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
