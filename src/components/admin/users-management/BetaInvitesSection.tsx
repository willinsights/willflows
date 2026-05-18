/**
 * BetaInvitesSection - Beta invites and waitlist management
 * Moved from BetaAdminTab.tsx for the unified Users Management tab
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Users, 
  Mail, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  RefreshCw,
  Clock,
  UserCheck,
  Send,
  Loader2,
  Link as LinkIcon,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isBetaModeEnabled } from '@/contexts/BetaContext';
import { ImportContactsModal } from '../ImportContactsModal';

import { logger } from '@/lib/logger';
interface BetaInviteToken {
  id: string;
  token: string;
  email: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string | null;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  invited_at: string | null;
  invite_token_id: string | null;
}

export function BetaInvitesSection() {
  const { toast } = useToast();
  const [invites, setInvites] = useState<BetaInviteToken[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [existingProfileEmails, setExistingProfileEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [resendingAll, setResendingAll] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteNotes, setNewInviteNotes] = useState('');
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const isBetaMode = isBetaModeEnabled();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invitesResult, waitlistResult, profilesResult] = await Promise.all([
        supabase
          .from('beta_invite_tokens')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('beta_waitlist')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('email')
      ]);

      if (invitesResult.error) throw invitesResult.error;
      if (waitlistResult.error) throw waitlistResult.error;

      // Criar set de emails que já têm conta criada
      const emailSet = new Set(
        (profilesResult.data || [])
          .map(p => p.email?.toLowerCase())
          .filter(Boolean) as string[]
      );
      setExistingProfileEmails(emailSet);

      setInvites(invitesResult.data || []);
      setWaitlist(waitlistResult.data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sendBetaInviteEmail = async (email: string, token: string, name?: string): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Não autenticado');
      }

      const { error } = await supabase.functions.invoke('send-beta-invite', {
        body: { email, name, inviteToken: token },
      });

      if (error) throw error;
      return true;
    } catch (error: any) {
      logger.error('Error sending beta invite email:', error);
      throw error;
    }
  };

  const createInvite = async () => {
    setCreating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from('beta_invite_tokens')
        .insert({
          email: newInviteEmail || null,
          notes: newInviteNotes || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setInvites([data, ...invites]);

      if (sendEmailOnCreate && newInviteEmail) {
        try {
          await sendBetaInviteEmail(newInviteEmail, data.token);
          toast({
            title: 'Convite criado e email enviado!',
            description: `Link de convite enviado para ${newInviteEmail}`,
          });
        } catch (emailError: any) {
          toast({
            title: 'Convite criado',
            description: `Email não foi enviado: ${emailError.message}`,
            variant: 'destructive',
          });
        }
      } else {
        toast({ title: 'Convite criado!' });
      }

      setNewInviteEmail('');
      setNewInviteNotes('');
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar convite',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const resendInviteEmail = async (invite: BetaInviteToken) => {
    if (!invite.email) {
      toast({ title: 'Email não definido', variant: 'destructive' });
      return;
    }

    setSendingEmail(invite.id);
    try {
      await sendBetaInviteEmail(invite.email, invite.token);
      toast({ title: 'Email enviado!', description: `Convite reenviado para ${invite.email}` });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar email', description: error.message, variant: 'destructive' });
    } finally {
      setSendingEmail(null);
    }
  };

  const resendAllPending = async () => {
    const pendingWithEmail = pendingInvites.filter(i => i.email);
    if (pendingWithEmail.length === 0) return;

    setResendingAll(true);
    let successCount = 0;

    for (const invite of pendingWithEmail) {
      try {
        await sendBetaInviteEmail(invite.email!, invite.token);
        successCount++;
      } catch (error) {
        logger.error(`Failed to resend to ${invite.email}:`, error);
      }
    }

    setResendingAll(false);
    toast({
      title: 'Convites reenviados',
      description: `${successCount} de ${pendingWithEmail.length} emails enviados.`,
    });
  };

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase.from('beta_invite_tokens').delete().eq('id', id);
      if (error) throw error;
      setInvites(invites.filter(inv => inv.id !== id));
      toast({ title: 'Convite removido' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
  };

  const inviteFromWaitlist = async (entry: WaitlistEntry, sendEmail: boolean = true) => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: invite, error: inviteError } = await supabase
        .from('beta_invite_tokens')
        .insert({
          email: entry.email,
          notes: `Waitlist: ${entry.name || entry.email}`,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      await supabase
        .from('beta_waitlist')
        .update({
          invited_at: new Date().toISOString(),
          invite_token_id: invite.id,
        })
        .eq('id', entry.id);

      if (sendEmail) {
        await sendBetaInviteEmail(entry.email, invite.token, entry.name || undefined);
        toast({ title: 'Convite enviado!', description: `Email enviado para ${entry.email}` });
      }

      await fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao convidar', description: error.message, variant: 'destructive' });
    }
  };

  const deleteWaitlistEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('beta_waitlist').delete().eq('id', id);
      if (error) throw error;
      setWaitlist(waitlist.filter(w => w.id !== id));
      toast({ title: 'Entrada removida' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
  };

  const approveAllWaitlist = async () => {
    if (pendingWaitlist.length === 0) return;
    
    setApprovingAll(true);
    let successCount = 0;

    for (const entry of pendingWaitlist) {
      try {
        await inviteFromWaitlist(entry, true);
        successCount++;
      } catch (error) {
        logger.error(`Failed to invite ${entry.email}:`, error);
      }
    }

    setApprovingAll(false);
    toast({ title: 'Convites enviados!', description: `${successCount} emails enviados.` });
    await fetchData();
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Link copiado!' });
  };

  const handleBulkImport = async (emails: string[], freeDays: number): Promise<{ success: number; failed: number; errors: string[] }> => {
    let success = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + freeDays);

        const { data: invite, error: inviteError } = await supabase
          .from('beta_invite_tokens')
          .insert({
            email,
            notes: `Importação em massa - ${freeDays} dias grátis`,
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (inviteError) throw inviteError;

        await sendBetaInviteEmail(email, invite.token);
        success++;
      } catch (error: any) {
        errors.push(`${email}: ${error.message}`);
      }
    }

    await fetchData();
    const failed = emails.length - success;
    return { success, failed, errors };
  };

  // Separar convites por estado (lógica inteligente: cruza com profiles)
  // Pendentes: Convite NÃO usado E email NÃO tem conta em profiles
  const pendingInvites = invites.filter(inv => 
    !inv.used_at && 
    (!inv.email || !existingProfileEmails.has(inv.email.toLowerCase()))
  );
  // Registados: Convite usado OU email já tem conta em profiles
  const registeredInvites = invites.filter(inv => 
    inv.used_at || 
    (inv.email && existingProfileEmails.has(inv.email.toLowerCase()))
  );
  const pendingWaitlist = waitlist.filter(w => !w.invited_at);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with explanation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Aquisição de Novos Utilizadores</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gerir convites para <strong>criar conta</strong> na plataforma.
              {' '}
              <span className="text-xs opacity-75">
                (Para adicionar membros a workspaces existentes, use a gestão de cada workspace)
              </span>
            </p>
            <div className="mt-2">
              {isBetaMode ? (
                <Badge variant="default" className="bg-primary">
                  Beta Ativo — Apenas utilizadores convidados podem criar conta
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Modo Público — Qualquer pessoa pode criar conta
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Convite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Convite</DialogTitle>
                  <DialogDescription>
                    Gera um link de convite único para um beta tester.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newInviteEmail}
                      onChange={(e) => setNewInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ex: Cliente da empresa X..."
                      value={newInviteNotes}
                      onChange={(e) => setNewInviteNotes(e.target.value)}
                    />
                  </div>
                  {newInviteEmail && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sendEmail"
                        checked={sendEmailOnCreate}
                        onChange={(e) => setSendEmailOnCreate(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                        Enviar email de convite
                      </Label>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={createInvite} disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {sendEmailOnCreate && newInviteEmail ? 'Criar e Enviar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{pendingInvites.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Registados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{registeredInvites.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Waitlist Pendente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-muted-foreground">{pendingWaitlist.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Waitlist</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{waitlist.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-2" />
              Pendentes ({pendingInvites.length})
            </TabsTrigger>
            <TabsTrigger value="registered">
              <UserCheck className="h-4 w-4 mr-2" />
              Registados ({registeredInvites.length})
            </TabsTrigger>
            <TabsTrigger value="waitlist">
              <Users className="h-4 w-4 mr-2" />
              Waitlist ({waitlist.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Pendentes */}
          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Convites Pendentes</CardTitle>
                  {pendingInvites.filter(i => i.email).length > 0 && (
                    <Button size="sm" onClick={resendAllPending} disabled={resendingAll}>
                      {resendingAll ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Reenviar Todos
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Notas</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="hidden sm:table-cell">Expira em</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">A carregar...</TableCell>
                    </TableRow>
                  ) : pendingInvites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum convite pendente
                      </TableCell>
                    </TableRow>
                  ) : pendingInvites.map((invite) => {
                    const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
                    return (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.email || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                          {invite.notes || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {invite.created_at ? format(new Date(invite.created_at), 'dd/MM/yy', { locale: pt }) : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {invite.expires_at ? format(new Date(invite.expires_at), 'dd/MM/yy', { locale: pt }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isExpired ? 'destructive' : 'outline'}>
                            {isExpired ? 'Expirado' : 'Activo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyInviteLink(invite.token)}>
                                  {copiedId === invite.token ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar link</TooltipContent>
                            </Tooltip>
                            {invite.email && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => resendInviteEmail(invite)}
                                    disabled={sendingEmail === invite.id}
                                  >
                                    {sendingEmail === invite.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reenviar email</TooltipContent>
                              </Tooltip>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar convite?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O link de convite deixará de funcionar.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteInvite(invite.id)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Tab: Registados */}
          <TabsContent value="registered" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Utilizadores Registados</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Notas</TableHead>
                    <TableHead>Registou em</TableHead>
                    <TableHead className="hidden sm:table-cell">Convite Criado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">A carregar...</TableCell>
                    </TableRow>
                  ) : registeredInvites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum utilizador registado via convite
                      </TableCell>
                    </TableRow>
                  ) : registeredInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                        {invite.notes || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {invite.used_at ? format(new Date(invite.used_at), 'dd/MM/yy HH:mm', { locale: pt }) : '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {invite.created_at ? format(new Date(invite.created_at), 'dd/MM/yy', { locale: pt }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Tab: Waitlist */}
          <TabsContent value="waitlist" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Waitlist</CardTitle>
                  {pendingWaitlist.length > 0 && (
                    <Button size="sm" onClick={approveAllWaitlist} disabled={approvingAll}>
                      {approvingAll ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Convidar Todos ({pendingWaitlist.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Nome</TableHead>
                    <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">A carregar...</TableCell>
                    </TableRow>
                  ) : waitlist.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma entrada na waitlist
                      </TableCell>
                    </TableRow>
                  ) : waitlist.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{entry.name || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{entry.company || '—'}</TableCell>
                      <TableCell>
                        {entry.invited_at ? (
                          <Badge variant="default">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Convidado
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {format(new Date(entry.created_at), 'dd/MM/yy', { locale: pt })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!entry.invited_at && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => inviteFromWaitlist(entry)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enviar convite</TooltipContent>
                            </Tooltip>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover da waitlist?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteWaitlistEntry(entry.id)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Import Modal */}
        <ImportContactsModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleBulkImport}
        />
      </div>
    </TooltipProvider>
  );
}
