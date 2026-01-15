import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  FlaskConical,
  Crown,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
}

interface TestAccount {
  id?: string;
  email: string;
  password?: string;
  plan: string;
  workspace?: WorkspaceInfo | string;
  role: string;
  userId?: string;
  workspaceId?: string;
  createdAt?: string;
}

interface TestAccountsResponse {
  success: boolean;
  message: string;
  accounts: TestAccount[];
}

export function TestAccountsTab() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<TestAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [includeEditors, setIncludeEditors] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [newCredentials, setNewCredentials] = useState<TestAccount[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('create-test-accounts', {
        body: { action: 'list' },
      });

      if (error) throw error;

      setAccounts(data.accounts || []);
    } catch (error: any) {
      console.error('Error fetching test accounts:', error);
      toast({
        title: 'Erro ao carregar contas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createAccounts = async () => {
    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('create-test-accounts', {
        body: { 
          action: 'create',
          includeEditors,
        },
      });

      if (error) throw error;

      const result = data as TestAccountsResponse;
      
      if (result.success) {
        setNewCredentials(result.accounts);
        setCredentialsDialogOpen(true);
        await fetchAccounts();
        toast({
          title: 'Contas criadas!',
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error creating test accounts:', error);
      toast({
        title: 'Erro ao criar contas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const resetAccounts = async () => {
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('create-test-accounts', {
        body: { 
          action: 'reset',
          includeEditors,
        },
      });

      if (error) throw error;

      const result = data as TestAccountsResponse;
      
      if (result.success) {
        setNewCredentials(result.accounts);
        setCredentialsDialogOpen(true);
        await fetchAccounts();
        toast({
          title: 'Contas recriadas!',
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error resetting test accounts:', error);
      toast({
        title: 'Erro ao resetar contas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const deleteAccounts = async () => {
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('create-test-accounts', {
        body: { action: 'delete' },
      });

      if (error) throw error;

      await fetchAccounts();
      toast({
        title: 'Contas eliminadas!',
        description: 'Todas as contas de teste foram removidas.',
      });
    } catch (error: any) {
      console.error('Error deleting test accounts:', error);
      toast({
        title: 'Erro ao eliminar contas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const copyCredentials = (email: string, password: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    toast({ title: 'Credenciais copiadas!' });
  };

  const togglePasswordVisibility = (email: string) => {
    setShowPasswords(prev => ({ ...prev, [email]: !prev[email] }));
  };

  const getPlanBadge = (plan: string) => {
    const planConfig: Record<string, { label: string; className: string }> = {
      starter: { label: 'Starter', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      essencial: { label: 'Starter', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      pro: { label: 'Pro', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      studio: { label: 'Studio', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    };
    const config = planConfig[plan.toLowerCase()] || planConfig.starter;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <Crown className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
        <UserCog className="h-3 w-3 mr-1" />
        Editor
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Contas de Teste Internas
              </CardTitle>
              <CardDescription>
                Utilizadores fantasmas para validar permissões e limites de cada plano
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAccounts}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeEditors"
                checked={includeEditors}
                onCheckedChange={(checked) => setIncludeEditors(checked as boolean)}
              />
              <Label htmlFor="includeEditors" className="text-sm cursor-pointer">
                Incluir membros Editor (3 contas extra)
              </Label>
            </div>
            <div className="flex gap-2 flex-wrap">
              {accounts.length === 0 ? (
                <Button onClick={createAccounts} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A criar...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Contas de Teste
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={deleting}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Contas
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Resetar contas de teste?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá eliminar todas as contas de teste existentes e criar novas.
                          Os dados das contas anteriores serão perdidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={resetAccounts}>
                          {deleting ? 'A resetar...' : 'Resetar'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar Todas
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar todas as contas de teste?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá eliminar permanentemente todas as contas de teste e seus workspaces.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteAccounts} className="bg-destructive hover:bg-destructive/90">
                          {deleting ? 'A eliminar...' : 'Eliminar'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>

          {/* Accounts Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma conta de teste</p>
              <p className="text-sm">Clique em "Criar Contas de Teste" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const workspaceInfo = typeof account.workspace === 'object' ? account.workspace : null;
                  const workspaceName = workspaceInfo?.name || (typeof account.workspace === 'string' ? account.workspace : '');
                  const planName = workspaceInfo?.subscription_plan || account.plan;
                  
                  return (
                    <TableRow key={account.email}>
                      <TableCell className="font-mono text-sm">{account.email}</TableCell>
                      <TableCell>
                        {getPlanBadge(planName)}
                      </TableCell>
                      <TableCell>{workspaceName}</TableCell>
                      <TableCell>{getRoleBadge(account.role)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Ativo
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
            <p><strong>Password padrão:</strong> Teste1234!</p>
            <p><strong>Domínio:</strong> @test.willflow.local (não recebe emails)</p>
            <p><strong>Flag:</strong> is_internal_test = true (excluído de métricas)</p>
          </div>
        </CardContent>
      </Card>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Credenciais das Contas de Teste
            </DialogTitle>
            <DialogDescription>
              ⚠️ Estas passwords só serão mostradas uma vez. Guarde-as num local seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {newCredentials.map((account) => (
              <div
                key={account.email}
                className="p-4 border rounded-lg bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPlanBadge(account.plan)}
                    {getRoleBadge(account.role)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCredentials(account.email, account.password || 'Teste1234!')}
                  >
                    {copiedEmail === account.email ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Email:</span>
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {account.email}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Password:</span>
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {showPasswords[account.email] ? (account.password || 'Teste1234!') : '••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePasswordVisibility(account.email)}
                    >
                      {showPasswords[account.email] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Workspace:</span>
                    <span className="text-sm">
                      {typeof account.workspace === 'object' ? account.workspace?.name : account.workspace}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
