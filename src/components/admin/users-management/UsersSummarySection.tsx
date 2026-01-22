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
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useUsersSummary, type PendingInvite } from '@/hooks/useUsersSummary';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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

export function UsersSummarySection() {
  const { 
    data: summary, 
    isLoading, 
    error, 
    resendInvitation, 
    sendBetaInviteToWaitlist,
    resendBetaInvite
  } = useUsersSummary();
  const { toast } = useToast();
  const [activeTable, setActiveTable] = useState('owners');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);

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

  const exportToCSV = (type: string) => {
    if (!summary) return;

    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    switch (type) {
      case 'owners':
        headers = ['Email', 'Nome', 'Workspace', 'Membros', 'Plano', 'Criado em'];
        data = summary.workspaceOwners.map(o => [
          o.email,
          o.fullName || '',
          o.workspaceName,
          o.totalMembers,
          o.plan || 'N/A',
          format(new Date(o.createdAt), 'dd/MM/yyyy', { locale: pt })
        ]);
        filename = 'donos-workspace.csv';
        break;
      case 'collaborators':
        headers = ['Email', 'Nome', 'Role', 'Workspace', 'Dono', 'Adicionado em'];
        data = summary.collaborators.map(c => [
          c.email,
          c.fullName || '',
          c.role,
          c.workspaceName,
          c.ownerEmail,
          format(new Date(c.joinedAt), 'dd/MM/yyyy', { locale: pt })
        ]);
        filename = 'colaboradores.csv';
        break;
      case 'invites':
        headers = ['Email', 'Workspace', 'Role', 'Convidado por', 'Data', 'Status'];
        data = summary.pendingInvites.map(i => [
          i.email,
          i.workspaceName,
          i.role,
          i.invitedByEmail,
          format(new Date(i.createdAt), 'dd/MM/yyyy', { locale: pt }),
          i.isExpired ? 'Expirado' : 'Pendente'
        ]);
        filename = 'convites-pendentes.csv';
        break;
      case 'waitlist':
        headers = ['Email', 'Nome', 'Empresa', 'Origem', 'Inscrito em', 'Convite Enviado'];
        data = summary.waitlistWithoutAccount.map(w => [
          w.email,
          w.name || '',
          w.company || '',
          w.source || '',
          format(new Date(w.createdAt), 'dd/MM/yyyy', { locale: pt }),
          w.wasInvited ? 'Sim' : 'Não'
        ]);
        filename = 'waitlist-sem-conta.csv';
        break;
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
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
      {/* KPI Cards - Apenas gestão de utilizadores existentes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          title="Convites Workspace"
          value={summary.totals.pendingInvites}
          icon={Clock}
          color="warning"
          subtitle="Pendentes"
        />
      </div>

      {/* Activation Funnel - Apenas utilizadores existentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funil de Ativação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Progresso dos utilizadores com conta criada
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 py-4">
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
                  Convites Workspace ({summary.totals.pendingInvites})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Owners Table */}
              <TabsContent value="owners" className="mt-0">
                <div className="flex justify-end mb-4">
                  <Button variant="outline" size="sm" onClick={() => exportToCSV('owners')}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
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
                  <Button variant="outline" size="sm" onClick={() => exportToCSV('collaborators')}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
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
                        <TableHead>Adicionado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.collaborators.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                            <TableCell>{collab.workspaceName}</TableCell>
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

              {/* Invites Table */}
              <TabsContent value="invites" className="mt-0">
                <div className="flex justify-end mb-4">
                  <Button variant="outline" size="sm" onClick={() => exportToCSV('invites')}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.pendingInvites.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum convite pendente
                          </TableCell>
                        </TableRow>
                      ) : (
                        summary.pendingInvites.map((invite) => (
                          <TableRow key={invite.id}>
                            <TableCell className="font-medium">{invite.email}</TableCell>
                            <TableCell>{invite.workspaceName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{invite.role}</Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(invite.createdAt), 'dd MMM yyyy', { locale: pt })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={invite.isExpired ? 'destructive' : 'secondary'}>
                                {invite.isExpired ? 'Expirado' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvite(invite)}
                                disabled={resendingId === invite.id}
                              >
                                {resendingId === invite.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
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
    </div>
  );
}
