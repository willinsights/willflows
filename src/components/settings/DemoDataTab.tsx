import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database as DatabaseIcon } from 'lucide-react';
import { SeedDemoData } from '@/components/demo/SeedDemoData';
import { WorkspaceDataExport } from '@/components/workspace/WorkspaceDataExport';

export function DemoDataTab() {
  return (
    <>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseIcon className="h-5 w-5" />
                  Dados de Demonstração
                </CardTitle>
                <CardDescription>
                  Popular a base de dados com dados de exemplo para testar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-warning/20 bg-warning/5">
                  <p className="text-sm text-warning">
                    <strong>Atenção:</strong> Esta funcionalidade irá criar clientes, projetos, tarefas, pagamentos e eventos de demonstração. 
                    Os dados existentes serão limpos antes de criar os novos.
                  </p>
                </div>
                
                <SeedDemoData />
              </CardContent>
            </Card>

            <div className="mt-6">
              <WorkspaceDataExport />
            </div>
    </>
  );
}
