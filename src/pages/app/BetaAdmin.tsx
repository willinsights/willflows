import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Shield,
  Link as LinkIcon,
  List
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isBetaModeEnabled } from '@/contexts/BetaContext';

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

export default function BetaAdmin() {
  const { toast } = useToast();
  const [invites, setInvites] = useState<BetaInviteToken[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteNotes, setNewInviteNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
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

  const createInvite = async () => {
    setCreating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

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
      setNewInviteEmail('');
      setNewInviteNotes('');
      setDialogOpen(false);
      
      toast({
        title: 'Convite criado!',
        description: 'O link de convite foi gerado com sucesso.',
      });
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

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('beta_invite_tokens')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInvites(invites.filter(inv => inv.id !== id));
      toast({ title: 'Convite removido' });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const inviteFromWaitlist = async (entry: WaitlistEntry) => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invite token
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

      // Mark waitlist entry as invited
      const { error: updateError } = await supabase
        .from('beta_waitlist')
        .update({
          invited_at: new Date().toISOString(),
          invite_token_id: invite.id,
        })
        .eq('id', entry.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchData();

      toast({
        title: 'Convite enviado!',
        description: `Link de convite criado para ${entry.email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao convidar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteWaitlistEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('beta_waitlist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWaitlist(waitlist.filter(w => w.id !== id));
      toast({ title: 'Entrada removida' });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
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
    if (invite.used_at) {
      return { label: 'Usado', variant: 'default' as const, icon: UserCheck };
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { label: 'Expirado', variant: 'secondary' as const, icon: Clock };
    }
    return { label: 'Ativo', variant: 'outline' as const, icon: Send };
  };

  const activeInvites = invites.filter(inv => !inv.used_at && (!inv.expires_at || new Date(inv.expires_at) > new Date()));
  const usedInvites = invites.filter(inv => inv.used_at);
  const pendingWaitlist = waitlist.filter(w => !w.invited_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Gestão Beta
          </h1>
          <p className="text-muted-foreground">
            {isBetaMode ? (
              <span className="flex items-center gap-2">
                <Badge variant="default" className="bg-primary">Beta Ativo</Badge>
                Apenas utilizadores convidados podem criar conta
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Badge variant="secondary">Modo Público</Badge>
                Qualquer pessoa pode criar conta
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
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
                  <p className="text-xs text-muted-foreground">
                    Se especificado, apenas este email pode usar o convite.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex: Cliente da empresa X, Beta tester..."
                    value={newInviteNotes}
                    onChange={(e) => setNewInviteNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createInvite} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A criar...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Convite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{activeInvites.length}</p>
                <p className="text-xs text-muted-foreground">Convites Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{usedInvites.length}</p>
                <p className="text-xs text-muted-foreground">Convites Usados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{pendingWaitlist.length}</p>
                <p className="text-xs text-muted-foreground">Na Lista de Espera</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{invites.length}</p>
                <p className="text-xs text-muted-foreground">Total Convites</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Convites ({invites.length})
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista de Espera ({waitlist.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle>Convites Beta</CardTitle>
              <CardDescription>
                Gerencie os links de convite para beta testers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhum convite criado ainda.</p>
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Convite
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email / Notas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => {
                      const status = getInviteStatus(invite);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={invite.id}>
                          <TableCell>
                            <div>
                              {invite.email && (
                                <span className="font-medium">{invite.email}</span>
                              )}
                              {invite.notes && (
                                <p className="text-sm text-muted-foreground">{invite.notes}</p>
                              )}
                              {!invite.email && !invite.notes && (
                                <span className="text-muted-foreground">Convite genérico</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {invite.created_at && format(new Date(invite.created_at), 'dd MMM yyyy', { locale: pt })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {invite.expires_at 
                              ? format(new Date(invite.expires_at), 'dd MMM yyyy', { locale: pt })
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!invite.used_at && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyInviteLink(invite.token)}
                                >
                                  {copiedId === invite.token ? (
                                    <Check className="h-4 w-4 text-success" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover convite?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O link de convite deixará de funcionar.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteInvite(invite.id)}>
                                      Remover
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waitlist">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Espera</CardTitle>
              <CardDescription>
                Pessoas que se registaram para receber acesso ao beta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : waitlist.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <List className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma pessoa na lista de espera.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email / Nome</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{entry.email}</span>
                            {entry.name && (
                              <p className="text-sm text-muted-foreground">{entry.name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.company || '-'}
                        </TableCell>
                        <TableCell>
                          {entry.invited_at ? (
                            <Badge variant="default" className="bg-success">
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
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'dd MMM yyyy', { locale: pt })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!entry.invited_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => inviteFromWaitlist(entry)}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Convidar
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover da lista?</AlertDialogTitle>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}