import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Clock, 
  ListChecks,
  Download,
  ArrowRight,
  Loader2,
  Crown,
  Building2,
  Mail,
  AlertCircle,
  RefreshCw,
  Upload,
  Send,
  AlertTriangle,
  Skull,
  Trash2,
  Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUsersSummary, type PendingInvite } from '@/hooks/useUsersSummary';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ImportContactsModal } from './ImportContactsModal';
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

const KPICard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary',
  subtitle
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
  subtitle?: string;
}) => {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    destructive: 'text-destructive bg-destructive/10',
    muted: 'text-muted-foreground bg-muted',
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-full', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FunnelStep = ({ 
  label, 
  value, 
  isLast = false 
}: { 
  label: string; 
  value: number; 
  isLast?: boolean;
}) => (
  <div className="flex items-center gap-2">
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 text-primary font-bold rounded-lg px-4 py-2 min-w-[80px] text-center">
        <div className="text-xl">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
    {!isLast && (
      <ArrowRight className="h-5 w-5 text-muted-foreground" />
    )}
  </div>
);

export function UsersSummaryTab() {
  const { 
    data: summary, 
    isLoading, 
    error, 
    resendInvitation, 
    bulkSendBetaInvites,
    sendBetaInviteToWaitlist,
    resendBetaInvite
  } = useUsersSummary();
  const { toast } = useToast();
  const [activeTable, setActiveTable] = useState('owners');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  
  // Cleanup state
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [executingCleanup, setExecutingCleanup] = useState(false);

  // Cleanup functions
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
        description: `Eliminados: ${results.deletedUsers} utilizadores, ${results.deletedWorkspaces} workspaces`,
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

  const handleResendInvite = async (invite: PendingInvite) => {
    setResendingId(invite.id);
    
    const result = await resendInvitation(invite);
    
    if (result.success) {
      toast({
        title: 'Convite reenviado',
        description: `Email enviado para ${invite.email}`,
      });
    } else {
      toast({
        title: 'Erro ao reenviar',
        description: result.error || 'Tente novamente',
        variant: 'destructive',
      });
    }
    
    setResendingId(null);
  };

  const handleBulkImport = async (emails: string[], freeDays: number) => {
    return await bulkSendBetaInvites(emails, freeDays);
  };

  const handleSendBetaInvite = async (email: string, name: string | null) => {
    setProcessingEmail(email);
    
    const result = await sendBetaInviteToWaitlist(email, name, 30);
    
    if (result.success) {
      toast({
        title: 'Convite enviado',
        description: `Email enviado para ${email}`,
      });
    } else {
      toast({
        title: 'Erro ao enviar',
        description: result.error || 'Tente novamente',
        variant: 'destructive',
      });
    }
    
    setProcessingEmail(null);
  };

  const handleResendBetaInvite = async (email: string, name: string | null) => {
    setProcessingEmail(email);
    
    const result = await resendBetaInvite(email, name);
    
    if (result.success) {
      toast({
        title: 'Convite reenviado',
        description: `Email reenviado para ${email}`,
      });
    } else {
      toast({
        title: 'Erro ao reenviar',
        description: result.error || 'Tente novamente',
        variant: 'destructive',
      });
    }
    
    setProcessingEmail(null);
  };

  const handleExportExcel = async (type: string) => {
    if (!summary) return;

    const { exportToExcel } = await import('@/lib/excel-export');

    let data: (string | number)[][] = [];
    let filename = '';
    let headers: string[] = [];
    let title = '';

    switch (type) {
      case 'owners':
        title = 'Donos de Workspace';
        headers = ['Email', 'Nome', 'Workspace', 'Membros', 'Plano', 'Criado em'];
        data = summary.workspaceOwners.map(o => [
          o.email,
          o.fullName || '',
          o.workspaceName,
          o.totalMembers,
          o.plan || 'Trial',
          format(new Date(o.createdAt), 'dd/MM/yyyy', { locale: pt })
        ]);
        filename = 'donos-workspace';
        break;
      case 'collaborators':
        title = 'Colaboradores';
        headers = ['Email', 'Nome', 'Role', 'Workspace', 'Dono', 'Adicionado em'];
        data = summary.collaborators.map(c => [
          c.email,
          c.fullName || '',
          c.role,
          c.workspaceName,
          c.ownerEmail,
          format(new Date(c.joinedAt), 'dd/MM/yyyy', { locale: pt })
        ]);
        filename = 'colaboradores';
        break;
      case 'invites':
        title = 'Convites Pendentes';
        headers = ['Email', 'Workspace', 'Role', 'Convidado por', 'Data', 'Status'];
        data = summary.pendingInvites.map(i => [
          i.email,
          i.workspaceName,
          i.role,
          i.invitedByEmail,
          format(new Date(i.createdAt), 'dd/MM/yyyy', { locale: pt }),
          i.isExpired ? 'Expirado' : 'Pendente'
        ]);
        filename = 'convites-pendentes';
        break;
      case 'waitlist':
        title = 'Waitlist Sem Conta';
        headers = ['Email', 'Nome', 'Empresa', 'Origem', 'Inscrito em', 'Convite Enviado'];
        data = summary.waitlistWithoutAccount.map(w => [
          w.email,
          w.name || '',
          w.company || '',
          w.source || '',
          format(new Date(w.createdAt), 'dd/MM/yyyy', { locale: pt }),
          w.wasInvited ? 'Sim' : 'Não'
        ]);
        filename = 'waitlist-sem-conta';
        break;
    }

    await exportToExcel({
      title,
      subtitle: 'WillFlow Admin Export',
      headers,
      data,
      filename,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Perfis"
          value={summary.totals.profiles}
          icon={Users}
          color="primary"
        />
        <KPICard
          title="Donos Workspace"
          value={summary.totals.workspaceOwners}
          icon={Crown}
          color="success"
        />
        <KPICard
          title="Colaboradores"
          value={summary.totals.collaborators}
          icon={UserCheck}
          color="primary"
        />
        <KPICard
          title="Convites Pendentes"
          value={summary.totals.pendingInvites}
          icon={Clock}
          color="warning"
        />
        <KPICard
          title="Waitlist s/ Conta"
          value={summary.totals.waitlistWithoutAccount}
          icon={ListChecks}
          color="destructive"
        />
        <KPICard
          title="Waitlist c/ Conta"
          value={summary.totals.waitlistWithAccount}
          icon={UserPlus}
          color="success"
          subtitle="Convertidos"
        />
      </div>

      {/* Acquisition Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funil de Aquisição</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 py-4">
            <FunnelStep label="Waitlist" value={summary.totals.waitlistTotal} />
            <FunnelStep label="Contas" value={summary.totals.profiles} />
            <FunnelStep label="Workspaces" value={summary.totals.workspaceOwners} />
            <FunnelStep label="Colaboradores" value={summary.totals.collaborators} isLast />
          </div>
        </CardContent>
      </Card>

      {/* Data Tables */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTable} onValueChange={setActiveTable} className="w-full">
            <div className="border-b px-4 pt-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="owners" className="gap-2">
                  <Crown className="h-4 w-4" />
                  Donos ({summary.totals.workspaceOwners})
                </TabsTrigger>
                <TabsTrigger value="collaborators" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Colaboradores ({summary.totals.collaborators})
                </TabsTrigger>
                <TabsTrigger value="invites" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Convites ({summary.totals.pendingInvites})
                </TabsTrigger>
                <TabsTrigger value="waitlist" className="gap-2">
                  <ListChecks className="h-4 w-4" />
                  Waitlist ({summary.totals.waitlistWithoutAccount})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Owners Table */}
              <TabsContent value="owners" className="mt-0">
                <div className="flex justify-end mb-4">
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('owners')}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead className="text-center">Membros</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.workspaceOwners.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum dono de workspace encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        summary.workspaceOwners.map((owner) => (
                          <TableRow key={`${owner.userId}-${owner.workspaceId}`}>
                            <TableCell className="font-medium">{owner.email}</TableCell>
                            <TableCell>{owner.fullName || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {owner.workspaceName}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{owner.totalMembers}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={owner.plan ? 'default' : 'outline'}>
                                {owner.plan || 'Trial'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(owner.createdAt), 'dd MMM yyyy', { locale: pt })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Collaborators Table */}
              <TabsContent value="collaborators" className="mt-0">
                <div className="flex justify-end mb-4">
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('collaborators')}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Dono</TableHead>
                        <TableHead>Adicionado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.collaborators.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum colaborador encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        summary.collaborators.map((collab) => (
                          <TableRow key={`${collab.userId}-${collab.workspaceId}`}>
                            <TableCell className="font-medium">{collab.email}</TableCell>
                            <TableCell>{collab.fullName || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{collab.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {collab.workspaceName}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {collab.ownerEmail}
                            </TableCell>
                            <TableCell>
                              {format(new Date(collab.joinedAt), 'dd MMM yyyy', { locale: pt })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Pending Invites Table */}
              <TabsContent value="invites" className="mt-0">
                <div className="flex justify-between mb-4">
                  <Button onClick={() => setShowImportModal(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Contactos
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('invites')}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Convidado por</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acções</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.pendingInvites.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhum convite pendente
                          </TableCell>
                        </TableRow>
                      ) : (
                        summary.pendingInvites.map((invite) => (
                          <TableRow key={invite.id}>
                            <TableCell className="font-medium">{invite.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {invite.workspaceName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{invite.role}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {invite.invitedByEmail}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invite.createdAt), 'dd MMM yyyy', { locale: pt })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={invite.isExpired ? 'destructive' : 'secondary'}>
                                {invite.isExpired ? 'Expirado' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResendInvite(invite)}
                                disabled={resendingId === invite.id}
                              >
                                {resendingId === invite.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-2">Reenviar</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Waitlist Table */}
              <TabsContent value="waitlist" className="mt-0">
                <div className="flex justify-end mb-4">
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('waitlist')}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Inscrito em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acções</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.waitlistWithoutAccount.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Todos os contactos da waitlist já criaram conta
                          </TableCell>
                        </TableRow>
                      ) : (
                        summary.waitlistWithoutAccount.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.email}</TableCell>
                            <TableCell>{entry.name || '-'}</TableCell>
                            <TableCell>{entry.company || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{entry.source || 'Direto'}</Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(entry.createdAt), 'dd MMM yyyy', { locale: pt })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={entry.wasInvited ? 'default' : 'secondary'}>
                                {entry.wasInvited ? 'Enviado' : 'Não enviado'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.wasInvited ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleResendBetaInvite(entry.email, entry.name)}
                                  disabled={processingEmail === entry.email}
                                >
                                  {processingEmail === entry.email ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                  <span className="ml-2">Reenviar</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendBetaInvite(entry.email, entry.name)}
                                  disabled={processingEmail === entry.email}
                                >
                                  {processingEmail === entry.email ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                  <span className="ml-2">Convidar</span>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cleanup Section */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Skull className="h-5 w-5" />
                Limpeza de Dados
              </CardTitle>
              <CardDescription>
                Eliminar todos os utilizadores e workspaces excepto contas de teste e super admin
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              onClick={loadCleanupPreview}
              disabled={loadingPreview}
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A carregar...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Limpar Base de Dados
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
            <p><strong>⚠️ ATENÇÃO:</strong> Esta acção é irreversível!</p>
            <p><strong>Mantidos:</strong> willdesign7@gmail.com + 6 contas de teste</p>
            <p><strong>Eliminados:</strong> Todos os outros utilizadores, workspaces e dados associados</p>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setConfirmText('');
        }
        setCleanupDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Limpeza de Dados
            </DialogTitle>
            <DialogDescription>
              Esta acção eliminará permanentemente os seguintes dados:
            </DialogDescription>
          </DialogHeader>
          
          {cleanupPreview && (
            <div className="space-y-4 mt-4">
              {/* Users to Delete */}
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">
                  Utilizadores a Eliminar ({cleanupPreview.usersToDelete.length})
                </h4>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-destructive/5">
                  {cleanupPreview.usersToDelete.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum utilizador a eliminar</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {cleanupPreview.usersToDelete.map(u => (
                        <li key={u.id} className="flex items-center gap-2">
                          <Trash2 className="h-3 w-3 text-destructive" />
                          {u.email} {u.full_name && `(${u.full_name})`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Users to Keep */}
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">
                  Utilizadores a Manter ({cleanupPreview.usersToKeep.length})
                </h4>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-green-500/5">
                  <ul className="text-sm space-y-1">
                    {cleanupPreview.usersToKeep.map(u => (
                      <li key={u.id} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-600" />
                        {u.email}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Workspaces to Delete */}
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">
                  Workspaces a Eliminar ({cleanupPreview.workspacesToDelete.length})
                </h4>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-destructive/5">
                  {cleanupPreview.workspacesToDelete.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum workspace a eliminar</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {cleanupPreview.workspacesToDelete.map(w => (
                        <li key={w.id} className="flex items-center gap-2">
                          <Trash2 className="h-3 w-3 text-destructive" />
                          {w.name} ({w.slug})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Other data */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold">{cleanupPreview.countsToDelete.waitlist}</div>
                  <div className="text-muted-foreground">Waitlist</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold">{cleanupPreview.countsToDelete.betaTokens}</div>
                  <div className="text-muted-foreground">Beta Tokens</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold">{cleanupPreview.countsToDelete.invitations}</div>
                  <div className="text-muted-foreground">Convites</div>
                </div>
              </div>

              {/* Confirmation */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="confirmText" className="text-sm font-medium">
                  Para confirmar, escreva <code className="bg-destructive/20 px-1 rounded">LIMPAR</code>:
                </Label>
                <Input
                  id="confirmText"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Escreva LIMPAR"
                  className="font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCleanupDialogOpen(false)}
                  disabled={executingCleanup}
                >
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
                      A limpar...
                    </>
                  ) : (
                    <>
                      <Skull className="h-4 w-4 mr-2" />
                      Confirmar Limpeza
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Contacts Modal */}
      <ImportContactsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
}
