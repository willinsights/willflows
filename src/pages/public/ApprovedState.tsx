import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVideoDownload } from '@/hooks/useVideoDownload';
import logoIconCyan from '@/assets/logo-willflow-icon-cyan.png';
import logoIconPurple from '@/assets/logo-willflow-icon-purple.png';

interface ApprovedStateProps {
  data: {
    approval: {
      client_name: string;
      version_number?: number;
      approved_at: string;
      notes?: string;
    };
    task: {
      project_name: string;
    };
    versions: Array<{
      id: string;
      version_number: number;
      file_name: string;
    }>;
  };
  token: string;
}

export function ApprovedState({ data, token }: ApprovedStateProps) {
  const { downloadVideo, isDownloading } = useVideoDownload({ approvalToken: token });

  // Find the approved version's ID
  const approvedVersion = data.versions.find(
    (v) => v.version_number === data.approval.version_number
  );

  const handleDownload = () => {
    if (approvedVersion) {
      downloadVideo(approvedVersion.id, approvedVersion.file_name);
    }
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
        <title>Studio Review | WillFlow</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container py-4 flex items-center justify-between">
            <img src={logoIconPurple} alt="WillFlow" className="h-8 w-8 dark:hidden" />
            <img src={logoIconCyan} alt="WillFlow" className="h-8 w-8 hidden dark:block" />
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aprovado
            </Badge>
          </div>
        </header>

        <main className="container py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Vídeo Aprovado!</h1>
              <p className="text-muted-foreground mb-6">
                Este vídeo foi aprovado por <strong>{data.approval.client_name}</strong>
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p><strong>Projeto:</strong> {data.task.project_name}</p>
                {data.approval.version_number && (
                  <p><strong>Versão:</strong> V{data.approval.version_number}</p>
                )}
                <p><strong>Aprovado em:</strong> {new Date(data.approval.approved_at).toLocaleString('pt-PT')}</p>
                {data.approval.notes && (
                  <p className="mt-2"><strong>Notas:</strong> {data.approval.notes}</p>
                )}
              </div>

              {/* Retention warning + Download */}
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-left">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Retenção de ficheiros</p>
                    <p className="text-muted-foreground mt-1">
                      Este vídeo será automaticamente eliminado 7 dias após a aprovação.
                      Recomendamos que faça o download agora.
                    </p>
                  </div>
                </div>

                {approvedVersion && (
                  <Button
                    onClick={handleDownload}
                    disabled={!!isDownloading}
                    className="w-full"
                    size="lg"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Descarregar versão aprovada
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
