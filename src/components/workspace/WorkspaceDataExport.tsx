import { Download, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useExportWorkspaceData } from '@/hooks/useExportWorkspaceData';

export function WorkspaceDataExport() {
  const { currentWorkspace } = useWorkspace();
  const { exportData, exporting } = useExportWorkspaceData();

  const handleClick = () => {
    if (currentWorkspace?.id) exportData(currentWorkspace.id);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Exportar dados do workspace
        </CardTitle>
        <CardDescription>
          Faz o download de todos os teus dados em formato JSON (GDPR Art. 20 — direito à portabilidade).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleClick} disabled={exporting || !currentWorkspace?.id} variant="outline">
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A exportar...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar dados
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
