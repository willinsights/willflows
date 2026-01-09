import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Users, Shield, Globe, Palette, Calendar, Video, Loader2, Database as DatabaseIcon, CreditCard, Crown, Check, ExternalLink, X, RefreshCw, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SeedDemoData } from '@/components/demo/SeedDemoData';
import { PLAN_INFO, getPriceId } from '@/lib/stripe-prices';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export default function Configuracoes() {
  const { user } = useAuth();
  const { currentWorkspace, refreshWorkspaces, isAdmin } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // Workspace members and invitations
  const { members, loading: membersLoading, refresh: refreshMembers } = useWorkspaceMembers();
  const { 
    invitations, 
    loading: invitationsLoading, 
    createInvitation, 
    cancelInvitation, 
    resendInvitation,
    refresh: refreshInvitations 
  } = useWorkspaceInvitations();
  
  const [saving, setSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [country, setCountry] = useState('PT');
  const [timezone, setTimezone] = useState('Europe/Lisbon');
  
  // Team invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('editor');
  const [inviting, setInviting] = useState(false);
  
  // Subscription state
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    plan: string | null;
    subscription_end: string | null;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Sync form with current workspace
  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      setCurrency(currentWorkspace.currency);
      setCountry(currentWorkspace.country);
      setTimezone(currentWorkspace.timezone);
    }
  }, [currentWorkspace]);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setSubscriptionLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) throw error;
        setSubscriptionData(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao abrir portal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (planId: 'starter' | 'pro' | 'studio') => {
    try {
      setCheckoutLoading(planId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
      const priceId = getPriceId(planId, currencyKey, 'monthly');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { priceId, workspaceId: currentWorkspace?.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const currentPlan = subscriptionData?.plan || currentWorkspace?.subscription_plan || 'starter';
  const isSubscribed = subscriptionData?.subscribed ?? false;

  const handleSaveGeneral = async () => {
    if (!currentWorkspace) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: workspaceName,
          currency,
          country: country as 'PT' | 'BR',
          timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentWorkspace.id);

      if (error) throw error;

      await refreshWorkspaces();
      
      toast({ 
        title: 'Configurações salvas', 
        description: 'As alterações foram aplicadas com sucesso.' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao salvar', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const roles: { id: AppRole; name: string; description: string }[] = [
    { id: 'admin', name: 'Admin', description: 'Acesso total ao sistema' },
    { id: 'editor', name: 'Editor', description: 'Edita projetos e tarefas' },
    { id: 'captacao', name: 'Captação', description: 'Apenas fase de captação' },
    { id: 'freelancer', name: 'Freelancer', description: 'Vê tarefas atribuídas e ganhos próprios' },
    { id: 'visualizador', name: 'Visualizador', description: 'Apenas visualização' },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'editor': return 'secondary';
      case 'captacao': return 'outline';
      case 'freelancer': return 'outline';
      default: return 'outline';
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    const result = await createInvitation(inviteEmail.trim(), inviteRole);
    setInviting(false);

    if (result.success) {
      toast({
        title: 'Convite enviado',
        description: `Convite enviado para ${inviteEmail}`,
      });
      setInviteEmail('');
      setInviteRole('editor');
    } else {
      toast({
        title: 'Erro ao enviar convite',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId);
    if (result.success) {
      toast({ title: 'Convite cancelado' });
    } else {
      toast({
        title: 'Erro ao cancelar convite',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    const result = await resendInvitation(invitationId);
    if (result.success) {
      toast({ title: 'Convite reenviado', description: 'O prazo de expiração foi estendido por 7 dias.' });
    } else {
      toast({
        title: 'Erro ao reenviar convite',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Não é possível remover a si mesmo.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('workspace_members')
      .update({ is_active: false })
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Membro removido' });
      refreshMembers();
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: AppRole, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Não é possível alterar a sua própria função.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Erro ao atualizar função',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Função atualizada' });
      refreshMembers();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as definições do workspace</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="geral" className="gap-2 text-xs md:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2 text-xs md:text-sm">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2 text-xs md:text-sm">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Permissões</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="dados" className="gap-2 text-xs md:text-sm">
              <DatabaseIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Dados Demo</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Geral Tab */}
        <TabsContent value="geral">
          <div className="grid gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Informações do Workspace</CardTitle>
                <CardDescription>Configure as informações básicas do seu workspace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="workspace-name">Nome do Workspace</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Meu Estúdio"
                    disabled={!isAdmin}
                  />
                  {!isAdmin && (
                    <p className="text-xs text-muted-foreground">Apenas administradores podem alterar o nome</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>País</Label>
                    <Select value={country} onValueChange={setCountry} disabled={!isAdmin}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o país" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                        <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Moeda</Label>
                    <Select value={currency} onValueChange={setCurrency} disabled={!isAdmin}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="BRL">Real (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Fuso Horário</Label>
                  <Select value={timezone} onValueChange={setTimezone} disabled={!isAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fuso horário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Lisbon">Lisboa (GMT+0)</SelectItem>
                      <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <Button 
                    className="gradient-primary" 
                    onClick={handleSaveGeneral}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A salvar...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Aparência
                </CardTitle>
                <CardDescription>Personalize a aparência do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Tema Escuro</p>
                    <p className="text-sm text-muted-foreground">Ativar modo escuro</p>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plano Tab */}
        <TabsContent value="plano">
          <div className="grid gap-6">
            {/* Current Plan */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Plano Atual
                </CardTitle>
                <CardDescription>Gerencie a sua subscrição</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscriptionLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">A carregar...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Crown className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg capitalize">{currentPlan}</p>
                          <p className="text-sm text-muted-foreground">
                            {isSubscribed ? 'Subscrição ativa' : 'Período de teste ou sem subscrição'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                        {isSubscribed ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    {subscriptionData?.subscription_end && (
                      <div className="text-sm text-muted-foreground">
                        <span>Próxima renovação: </span>
                        <span className="font-medium text-foreground">
                          {format(new Date(subscriptionData.subscription_end), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                        </span>
                      </div>
                    )}

                    {isSubscribed && (
                      <Button
                        variant="outline"
                        onClick={handleOpenPortal}
                        disabled={portalLoading}
                        className="w-full sm:w-auto"
                      >
                        {portalLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Gerir Subscrição
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Available Plans */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Planos Disponíveis</CardTitle>
                <CardDescription>Compare os planos e faça upgrade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {(['starter', 'pro', 'studio'] as const).map((planId) => {
                    const plan = PLAN_INFO[planId];
                    const isCurrentPlan = currentPlan === planId;
                    const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
                    const price = plan.prices[currencyKey].monthly;
                    const currencySymbol = currencyKey === 'eur' ? '€' : 'R$';

                    return (
                      <motion.div
                        key={planId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'relative p-4 rounded-xl border-2 transition-all',
                          isCurrentPlan
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {isCurrentPlan && (
                          <Badge className="absolute -top-2 right-4 bg-primary">
                            Seu Plano
                          </Badge>
                        )}
                        {'popular' in plan && plan.popular && !isCurrentPlan && (
                          <Badge className="absolute -top-2 right-4" variant="secondary">
                            Popular
                          </Badge>
                        )}

                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>

                        <div className="mb-4">
                          <span className="text-2xl font-bold">{currencySymbol}{price}</span>
                          <span className="text-muted-foreground">/mês</span>
                        </div>

                        <ul className="space-y-2 mb-4 text-sm">
                          {plan.features.slice(0, 5).map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Check className={cn(
                                'h-4 w-4',
                                feature.included ? 'text-success' : 'text-muted-foreground/40'
                              )} />
                              <span className={cn(!feature.included && 'text-muted-foreground/60')}>
                                {feature.name}{typeof feature.value === 'string' ? `: ${feature.value}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {isCurrentPlan ? (
                          <Button variant="outline" className="w-full" disabled>
                            Plano Atual
                          </Button>
                        ) : (
                          <Button
                            className={cn(
                              'w-full',
                              planId === 'pro' && 'gradient-primary'
                            )}
                            variant={planId === 'pro' ? 'default' : 'outline'}
                            onClick={() => handleUpgrade(planId)}
                            disabled={checkoutLoading === planId}
                          >
                            {checkoutLoading === planId ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            {isSubscribed ? 'Mudar Plano' : 'Começar Agora'}
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Perfil Tab */}
        <TabsContent value="perfil">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Perfil do Utilizador</CardTitle>
              <CardDescription>Gerencie suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{user?.user_metadata?.full_name || 'Utilizador'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 pt-4">
                <div className="grid gap-2">
                  <Label>Nome Completo</Label>
                  <Input defaultValue={user?.user_metadata?.full_name || ''} placeholder="Seu nome" />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input placeholder="+351 912 345 678" />
                </div>
              </div>

              <Button className="gradient-primary">Salvar Perfil</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipa Tab */}
        <TabsContent value="equipa">
          <div className="grid gap-6">
            {/* Invite Form */}
            {isAdmin && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Convidar Novo Membro</CardTitle>
                  <CardDescription>Envie um convite por email para adicionar um novo membro à equipa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input 
                      placeholder="email@exemplo.com" 
                      className="flex-1" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={inviting}
                    />
                    <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as AppRole)}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Função" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      className="gradient-primary" 
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail.trim()}
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          A enviar...
                        </>
                      ) : (
                        'Convidar'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending Invitations */}
            {isAdmin && invitations.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Convites Pendentes
                  </CardTitle>
                  <CardDescription>
                    Convites enviados que ainda não foram aceites
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invitationsLoading ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">A carregar...</span>
                      </div>
                    ) : (
                      invitations.map((invitation) => (
                        <motion.div
                          key={invitation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <span className="font-semibold text-muted-foreground">
                                {invitation.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Expira {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true, locale: pt })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{roles.find(r => r.id === invitation.role)?.name}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResendInvitation(invitation.id)}
                              title="Reenviar convite"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              title="Cancelar convite"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Members */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Membros Atuais
                </CardTitle>
                <CardDescription>
                  {members.length} {members.length === 1 ? 'membro' : 'membros'} no workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {membersLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">A carregar...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">Nenhum membro encontrado</p>
                  ) : (
                    members.map((member, index) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {(member.full_name || member.email)?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name || member.email}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                            {member.specialization && member.specialization.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {member.specialization.slice(0, 2).map((spec, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {spec}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && member.user_id !== user?.id ? (
                            <>
                              <Select 
                                value={member.role} 
                                onValueChange={(val) => handleUpdateMemberRole(member.id, val as AppRole, member.user_id)}
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map(role => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMember(member.id, member.user_id)}
                                title="Remover membro"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {roles.find(r => r.id === member.role)?.name || member.role}
                            </Badge>
                          )}
                          {member.user_id === user?.id && (
                            <Badge variant="secondary" className="ml-1">Você</Badge>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrações Tab */}
        <TabsContent value="integracoes">
          <div className="grid gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Google Calendar
                </CardTitle>
                <CardDescription>Sincronize eventos com o Google Calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Não conectado</p>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Google Meet
                </CardTitle>
                <CardDescription>Crie reuniões automaticamente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Não conectado</p>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Frame.io</CardTitle>
                <CardDescription>Integração com Frame.io para revisão de vídeos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Não conectado</p>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Permissões Tab */}
        <TabsContent value="permissoes">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Matriz de Permissões</CardTitle>
              <CardDescription>Configure as permissões por função</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role, index) => (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <Button variant="outline" size="sm">Editar</Button>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg border border-info/20 bg-info/5">
                <p className="text-sm text-info">
                  <strong>Nota:</strong> Freelancers só visualizam tarefas atribuídas e seus próprios ganhos. 
                  Não têm acesso ao preço global do cliente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados Demo Tab */}
        {isAdmin && (
          <TabsContent value="dados">
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
