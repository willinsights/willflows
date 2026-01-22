/**
 * AdminGrowth - Beta invites, waitlist, promos, referrals
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Rocket, 
  Mail, 
  Users, 
  Gift, 
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Upload,
  Copy,
  Check,
  Trash2,
  Send,
  Loader2,
  UserCheck,
  Clock,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isBetaModeEnabled } from '@/contexts/BetaContext';
import { ImportContactsModal } from '@/components/admin/ImportContactsModal';

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

export default function AdminGrowth() {
  const { toast } = useToast();
  const [invites, setInvites] = useState<BetaInviteToken[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteNotes, setNewInviteNotes] = useState('');
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const isBetaMode = isBetaModeEnabled();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invitesResult, waitlistResult] = await Promise.all([
        supabase
          .from('beta_invite_tokens')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('beta_waitlist')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (invitesResult.error) throw invitesResult.error;
      if (waitlistResult.error) throw waitlistResult.error;

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
      console.error('Error sending beta invite email:', error);
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

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase.from('beta_invite_tokens').delete().eq('id', id);
      if (error) throw error;
      setInvites(invites.filter(inv => inv.id !== id));
      toast({ title: 'Convite removido' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
    setDeleteId(null);
  };

  const inviteFromWaitlist = async (entry: WaitlistEntry) => {
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

      await sendBetaInviteEmail(entry.email, invite.token, entry.name || undefined);
      toast({ title: 'Convite enviado!', description: `Email enviado para ${entry.email}` });

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

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Link copiado!' });
  };

  const getInviteStatus = (invite: BetaInviteToken) => {
    if (invite.used_at) return { label: 'Usado', variant: 'default' as const, icon: UserCheck };
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return { label: 'Expirado', variant: 'secondary' as const, icon: Clock };
    return { label: 'Ativo', variant: 'outline' as const, icon: Send };
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

  const activeInvites = invites.filter(inv => !inv.used_at && (!inv.expires_at || new Date(inv.expires_at) > new Date()));
  const usedInvites = invites.filter(inv => inv.used_at);
  const pendingWaitlist = waitlist.filter(w => !w.invited_at);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Growth</h1>
          <p className="text-muted-foreground">Aquisição e gestão de utilizadores</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Growth</h1>
            <p className="text-muted-foreground">Aquisição e gestão de utilizadores</p>
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
                  <DialogTitle>Criar Novo Convite Beta</DialogTitle>
                  <DialogDescription>
                    Gera um link de convite único para aceder à plataforma.
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
              <CardDescription>Convites Ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{activeInvites.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Convites Usados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{usedInvites.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Waitlist Pendente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{pendingWaitlist.length}</p>
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

        <Tabs defaultValue="invites" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invites" className="gap-2">
              <Rocket className="h-4 w-4" />
              Convites Beta ({invites.length})
            </TabsTrigger>
            <TabsTrigger value="waitlist" className="gap-2">
              <Mail className="h-4 w-4" />
              Waitlist ({waitlist.length})
            </TabsTrigger>
            <TabsTrigger value="promos" className="gap-2">
              <Gift className="h-4 w-4" />
              Promoções
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Referrals
            </TabsTrigger>
          </TabsList>

          {/* BETA INVITES TAB */}
          <TabsContent value="invites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Convites para Criar Conta</CardTitle>
                <CardDescription>
                  Tokens únicos que permitem novos utilizadores registarem-se na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invites.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Criado</TableHead>
                        <TableHead>Expira</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map(invite => {
                        const status = getInviteStatus(invite);
                        const StatusIcon = status.icon;
                        return (
                          <TableRow key={invite.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{invite.email || '—'}</p>
                                {invite.notes && (
                                  <p className="text-xs text-muted-foreground">{invite.notes}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {invite.created_at ? format(new Date(invite.created_at), 'dd/MM/yy', { locale: pt }) : '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {invite.expires_at ? format(new Date(invite.expires_at), 'dd/MM/yy', { locale: pt }) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => copyInviteLink(invite.token)}
                                    >
                                      {copiedId === invite.token ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar link</TooltipContent>
                                </Tooltip>

                                {invite.email && !invite.used_at && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => resendInviteEmail(invite)}
                                        disabled={sendingEmail === invite.id}
                                      >
                                        {sendingEmail === invite.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Send className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reenviar email</TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteId(invite.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sem convites criados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WAITLIST TAB */}
          <TabsContent value="waitlist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Espera</CardTitle>
                <CardDescription>
                  Utilizadores que se inscreveram para acesso antecipado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {waitlist.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Inscrito</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waitlist.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.email}</TableCell>
                          <TableCell>{entry.name || '—'}</TableCell>
                          <TableCell>{entry.company || '—'}</TableCell>
                          <TableCell>
                            {entry.invited_at ? (
                              <Badge variant="default" className="gap-1">
                                <Check className="h-3 w-3" />
                                Convidado
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(entry.created_at), 'dd/MM/yy', { locale: pt })}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {!entry.invited_at && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => inviteFromWaitlist(entry)}
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Enviar convite</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteWaitlistEntry(entry.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Ninguém na lista de espera</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROMOS TAB */}
          <TabsContent value="promos" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">Códigos Promocionais</h3>
                  <p className="text-sm">Em breve: códigos de desconto e benefícios especiais</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REFERRALS TAB */}
          <TabsContent value="referrals" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">Convites de Workspace</h3>
                  <p className="text-sm">Em breve: gestão de convites para adicionar membros a workspaces</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar convite?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser revertida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteInvite(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Modal */}
        <ImportContactsModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          onImport={handleBulkImport}
        />
      </div>
    </TooltipProvider>
  );
}
