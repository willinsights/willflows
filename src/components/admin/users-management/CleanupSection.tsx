/**
 * CleanupSection - Database cleanup tools
 * Consolidated cleanup functionality for the unified Users Management tab
 */

import { useState } from 'react';
import { 
  Trash2, 
  Loader2, 
  AlertTriangle,
  Skull,
  Check,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CleanupPreview {
  usersToKeep: Array<{ id: string; email: string; full_name: string | null }>;
  usersToDelete: Array<{ id: string; email: string; full_name: string | null }>;
  workspacesToKeep: Array<{ id: string; name: string; slug: string }>;
  workspacesToDelete: Array<{ id: string; name: string; slug: string }>;
  countsToDelete: {
    waitlist: number;
    betaTokens: number;
    invitations: number;
  };
}

interface CleanupResults {
  deletedUsers: number;
  deletedWorkspaces: number;
  deletedWaitlist: number;
  deletedBetaTokens: number;
  deletedInvitations: number;
  errors: string[];
}

export function CleanupSection() {
  const { toast } = useToast();
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [executingCleanup, setExecutingCleanup] = useState(false);

  const loadCleanupPreview = async () => {
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-users', {
        body: { action: 'preview' },
      });

      if (error) throw error;
      setCleanupPreview(data as CleanupPreview);
      setCleanupDialogOpen(true);
    } catch (error: any) {
      console.error('Error loading cleanup preview:', error);
      toast({
        title: 'Erro ao carregar preview',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const executeCleanup = async () => {
    if (confirmText !== 'LIMPAR') return;
    
    setExecutingCleanup(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-users', {
        body: { action: 'execute' },
      });

      if (error) throw error;

      const results = data.results as CleanupResults;
      
      toast({
        title: 'Limpeza concluída!',
        description: `Eliminados: ${results.deletedUsers} utilizadores, ${results.deletedWorkspaces} workspaces, ${results.deletedWaitlist} waitlist, ${results.deletedBetaTokens} tokens beta, ${results.deletedInvitations} convites`,
      });
      
      setCleanupDialogOpen(false);
      setConfirmText('');
      setCleanupPreview(null);
    } catch (error: any) {
      console.error('Error executing cleanup:', error);
      toast({
        title: 'Erro na limpeza',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExecutingCleanup(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Card */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ferramentas de limpeza da base de dados. Use com extrema cautela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Skull className="h-4 w-4" />
              Limpeza Completa da Base de Dados
            </h4>
            <p className="text-sm text-muted-foreground">
              Remove todos os utilizadores, workspaces, waitlist e tokens beta, <strong>excepto</strong>:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Super Admin (willdesign7@gmail.com)</li>
              <li>Contas de teste internas (*@test.willflow.local)</li>
              <li>Clientes reais identificados</li>
            </ul>
            <Button
              variant="destructive"
              onClick={loadCleanupPreview}
              disabled={loadingPreview}
              className="mt-4"
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A carregar preview...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ver o que será eliminado
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Protection Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Contas Protegidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>As seguintes contas nunca são eliminadas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">willdesign7@gmail.com</code> - Super Admin</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">*@test.willflow.local</code> - Contas de teste</li>
              <li>Clientes reais (José, Pedro, Pablo, Júnio, Lucas)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Preview Dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Preview da Limpeza
            </DialogTitle>
            <DialogDescription>
              Reveja cuidadosamente o que será eliminado antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {cleanupPreview && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-destructive">{cleanupPreview.usersToDelete.length}</p>
                    <p className="text-xs text-muted-foreground">Utilizadores a eliminar</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-destructive">{cleanupPreview.workspacesToDelete.length}</p>
                    <p className="text-xs text-muted-foreground">Workspaces a eliminar</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-green-500">{cleanupPreview.usersToKeep.length}</p>
                    <p className="text-xs text-muted-foreground">Utilizadores a manter</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-green-500">{cleanupPreview.workspacesToKeep.length}</p>
                    <p className="text-xs text-muted-foreground">Workspaces a manter</p>
                  </CardContent>
                </Card>
              </div>

              {/* Users to Keep */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Utilizadores a Manter ({cleanupPreview.usersToKeep.length})
                </h4>
                <div className="rounded-md border max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cleanupPreview.usersToKeep.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.full_name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Users to Delete */}
              {cleanupPreview.usersToDelete.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Utilizadores a Eliminar ({cleanupPreview.usersToDelete.length})
                  </h4>
                  <div className="rounded-md border border-destructive/30 max-h-40 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nome</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cleanupPreview.usersToDelete.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>{user.full_name || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Workspaces to Delete */}
              {cleanupPreview.workspacesToDelete.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Workspaces a Eliminar ({cleanupPreview.workspacesToDelete.length})
                  </h4>
                  <div className="rounded-md border border-destructive/30 max-h-40 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Slug</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cleanupPreview.workspacesToDelete.map((ws) => (
                          <TableRow key={ws.id}>
                            <TableCell className="font-medium">{ws.name}</TableCell>
                            <TableCell className="text-muted-foreground">/{ws.slug}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Other data to delete */}
              <div className="flex gap-4 text-sm">
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  {cleanupPreview.countsToDelete.waitlist} waitlist
                </Badge>
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  {cleanupPreview.countsToDelete.betaTokens} tokens beta
                </Badge>
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  {cleanupPreview.countsToDelete.invitations} convites
                </Badge>
              </div>

              {/* Confirmation */}
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Para confirmar, escreva <strong>LIMPAR</strong> no campo abaixo:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Escreva LIMPAR para confirmar"
                  className="max-w-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCleanupDialogOpen(false);
              setConfirmText('');
            }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={executeCleanup}
              disabled={confirmText !== 'LIMPAR' || executingCleanup}
            >
              {executingCleanup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A eliminar...
                </>
              ) : (
                <>
                  <Skull className="h-4 w-4 mr-2" />
                  Confirmar Limpeza
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
