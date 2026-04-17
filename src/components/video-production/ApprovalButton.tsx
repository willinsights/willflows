import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, User, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoApproval, VideoApproval } from '@/hooks/useVideoApproval';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ApprovalButtonProps {
  taskId: string;
  projectId?: string | null;
  workspaceId: string;
  videoVersionId: string | null;
  versionNumber: number | null;
  className?: string;
}

export function ApprovalButton({
  taskId,
  projectId,
  workspaceId,
  videoVersionId,
  versionNumber,
  className,
}: ApprovalButtonProps) {
  const { approvals, isApproved, latestApproval, approveVideo } = useVideoApproval(taskId, projectId);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    if (!videoVersionId) return;

    setApproving(true);
    try {
      await approveVideo({
        taskId,
        videoVersionId,
        workspaceId,
        notes: notes || undefined,
      });
      setShowApproveModal(false);
      setNotes('');
    } catch (error) {
      // Error handled in hook
    } finally {
      setApproving(false);
    }
  };

  if (isApproved) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <p className="font-medium text-green-700 dark:text-green-400">
              Vídeo aprovado
            </p>
            <p className="text-xs text-muted-foreground">
              {latestApproval?.client_name 
                ? `Por ${latestApproval.client_name} (cliente)` 
                : 'Por membro da equipa'}
              {' • '}
              {latestApproval && format(new Date(latestApproval.approved_at), "d MMM 'às' HH:mm", { locale: pt })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistoryModal(true)}
          >
            Ver histórico
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        className="w-full"
        size="lg"
        onClick={() => setShowApproveModal(true)}
        disabled={!videoVersionId}
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Aprovar versão {versionNumber ? `V${versionNumber}` : ''}
      </Button>

      {approvals.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowHistoryModal(true)}
        >
          Ver histórico de aprovações ({approvals.length})
        </Button>
      )}

      {/* Approve modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar vídeo</DialogTitle>
            <DialogDescription>
              Confirme a aprovação da versão {versionNumber ? `V${versionNumber}` : 'atual'} do vídeo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre a aprovação..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-700"
            >
              {approving ? 'A aprovar...' : 'Confirmar aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de aprovações</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {approvals.map((approval) => (
              <ApprovalHistoryItem key={approval.id} approval={approval} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalHistoryItem({ approval }: { approval: VideoApproval }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">
            {approval.approved_by_client
              ? approval.client_name || 'Cliente'
              : 'Membro da equipa'}
          </span>
          {approval.approved_by_client && (
            <Badge variant="outline" className="text-xs">Cliente</Badge>
          )}
          {approval.video_version && (
            <Badge variant="secondary" className="text-xs">
              V{approval.video_version.version_number}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Clock className="h-3 w-3" />
          {format(new Date(approval.approved_at), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
        </p>
        {approval.notes && (
          <p className="text-sm text-muted-foreground mt-2 italic">
            "{approval.notes}"
          </p>
        )}
      </div>
    </div>
  );
}
