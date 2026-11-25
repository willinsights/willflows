import { CheckCircle2, Download, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoDownload } from '@/hooks/useVideoDownload';

interface ApprovedBannerProps {
  approval: {
    client_name: string | null;
    version_number?: number | null;
    video_version_id?: string | null;
    approved_at: string;
    notes?: string | null;
    expires_at?: string | null;
  };
  versions: Array<{ id: string; version_number: number; file_name: string }>;
  token: string;
}

/** Shown on top of the (read-only) review player while an approved link is still available. */
export function ApprovedBanner({ approval, versions, token }: ApprovedBannerProps) {
  const { downloadVideo, isDownloading } = useVideoDownload({ approvalToken: token });
  const approvedVersion =
    versions.find((v) => v.id === approval.video_version_id) ??
    versions.find((v) => v.version_number === approval.version_number);
  const expires = approval.expires_at ? new Date(approval.expires_at) : null;

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-success/30 bg-success/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">
            Versão V{approval.version_number ?? approvedVersion?.version_number} aprovada
            {approval.client_name ? ` por ${approval.client_name}` : ''}
          </p>
          <p className="text-muted-foreground">
            {new Date(approval.approved_at).toLocaleString('pt-PT')}
            {approval.notes ? ` · ${approval.notes}` : ''}
          </p>
          {expires && (
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Disponível até {expires.toLocaleDateString('pt-PT')} — descarregue antes dessa data.
            </p>
          )}
        </div>
      </div>
      {approvedVersion && (
        <Button
          onClick={() => downloadVideo(approvedVersion.id, approvedVersion.file_name)}
          disabled={!!isDownloading}
          className="shrink-0"
        >
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Descarregar versão aprovada
        </Button>
      )}
    </div>
  );
}
