import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, User, Users, Shield, Palette, Loader2, Database as DatabaseIcon, Clock, Trash2, RefreshCw, X, Calendar, Video, Film, AlertTriangle, LogOut, Camera, HelpCircle, Tags, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SeedDemoData } from '@/components/demo/SeedDemoData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';
import { EmailPreferencesCard } from '@/components/settings/EmailPreferencesCard';
import { NotificationPreferencesCard } from '@/components/settings/NotificationPreferencesCard';
import { PermissionsMatrix } from '@/components/settings/PermissionsMatrix';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';
import { DeleteWorkspaceModal } from '@/components/workspace/DeleteWorkspaceModal';
import { LeaveWorkspaceModal } from '@/components/workspace/LeaveWorkspaceModal';
import { WorkspaceDataExport } from '@/components/workspace/WorkspaceDataExport';
import { CategoryManagement } from '@/components/categories/CategoryManagement';
import { AutomationsList } from '@/components/automations/AutomationsList';
import { useProductTour } from '@/hooks/useProductTour';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace, allWorkspaces, refreshWorkspaces, isAdmin } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { restartTour } = useProductTour();
  const { preferences, updatePreferences, saving: savingPreferences } = useUserPreferences();
  
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
  const [vatRateDefault, setVatRateDefault] = useState('23');
  const [vatRegime, setVatRegime] = useState('standard');
  const [vatCountry, setVatCountry] = useState('PT');
  
  // Profile state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Team invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('edicao');
  const [inviting, setInviting] = useState(false);

  // Workspace management modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Check if user is admin or guest in current workspace
  const isGuestMember = currentWorkspace && !isAdmin;
  const adminWorkspaces = allWorkspaces.filter(w => w.role === 'admin');
  const isLastAdminWorkspace = adminWorkspaces.length <= 1;

  const handleDeleteSuccess = async () => {
    setDeleteModalOpen(false);
    // Clear cache and redirect
    localStorage.removeItem('willflow_workspace_cache');
    localStorage.removeItem('willflow_last_workspace_id');
    await refreshWorkspaces();
    // Redirect to app or onboarding
    window.location.href = '/app';
  };

  const handleLeaveSuccess = async () => {
    setLeaveModalOpen(false);
    // Clear cache and redirect
    localStorage.removeItem('willflow_workspace_cache');
    localStorage.removeItem('willflow_last_workspace_id');
    await refreshWorkspaces();
    // Redirect to app or onboarding
    window.location.href = '/app';
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirmText !== 'ELIMINAR') {
      toast({
        title: 'Confirmação incorreta',
        description: 'Por favor, escreva ELIMINAR para confirmar.',
        variant: 'destructive',
      });
      return;
    }

    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      
      if (error) throw error;

      toast({ title: 'Conta eliminada com sucesso' });
      
      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: 'Erro ao eliminar conta',
        description: error.message || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleRestartTour = () => {
    restartTour();
    toast({ title: 'Tour reiniciado', description: 'Navegue para o Dashboard para ver o tour.' });
  };

  // Sync form with current workspace
  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      setCurrency(currentWorkspace.currency);
      setCountry(currentWorkspace.country);
      setTimezone(currentWorkspace.timezone);
      // Fetch VAT defaults (not exposed in workspace context)
      (async () => {
        const { data } = await supabase
          .from('workspaces')
          .select('vat_rate_default, vat_regime, vat_country')
          .eq('id', currentWorkspace.id)
          .single();
        if (data) {
          setVatRateDefault(String((data as any).vat_rate_default ?? 23));
          setVatRegime((data as any).vat_regime ?? 'standard');
          setVatCountry((data as any).vat_country ?? 'PT');
        }
      })();
    }
  }, [currentWorkspace]);

  // Sync profile state with user data and fetch avatar from profiles table
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setPhone(user.user_metadata?.phone || '');
      
      // Fetch avatar from profiles table
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        } else if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
          // Fallback to Google avatar if no custom avatar
          setAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ficheiro inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Ficheiro muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }
    
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // Cache bust
      
      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setAvatarUrl(publicUrl);
      toast({ title: 'Foto de perfil atualizada!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

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
          vat_rate_default: Number(vatRateDefault) || 0,
          vat_regime: vatRegime,
          vat_country: vatCountry,
          updated_at: new Date().toISOString(),
        } as any)
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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: fullName,
          phone: phone,
        }
      });
      
      if (error) throw error;
      
      // Also update the profiles table if it exists
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ 
            full_name: fullName,
            phone: phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
      
      toast({ 
        title: 'Perfil atualizado', 
        description: 'As suas informações foram guardadas com sucesso.' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar perfil', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Roles disponíveis para atribuir - admin removido para convidados
  const roles: { id: AppRole; name: string; description: string }[] = [
    { id: 'edicao', name: 'Edição', description: 'Edita projetos e tarefas' },
    { id: 'captacao', name: 'Captação', description: 'Apenas fase de captação' },
    { id: 'gestao', name: 'Gestão', description: 'Vê tarefas atribuídas e ganhos próprios' },
    { id: 'visualizacao', name: 'Visualização', description: 'Apenas visualização' },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'edicao': return 'secondary';
      case 'captacao': return 'outline';
      case 'gestao': return 'outline';
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
      setInviteRole('edicao');
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

    // Bloquear promoção a admin (convidados nunca podem ser admin)
    if (newRole === 'admin') {
      toast({
        title: 'Ação não permitida',
        description: 'Membros convidados não podem ser promovidos a administradores.',
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl md:text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as definições do workspace</p>
      </motion.div>

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
          <TabsTrigger value="equipa" className="gap-2 text-xs md:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Equipa</span>
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
          {isAdmin && (
            <TabsTrigger value="automacoes" className="gap-2 text-xs md:text-sm">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Automações</span>
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

                {isAdmin && (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>País</Label>
                        <Select value={country} onValueChange={setCountry}>
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
                        <Select value={currency} onValueChange={setCurrency}>
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
                      <Select value={timezone} onValueChange={setTimezone}>
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

                    {/* Fiscal / IVA */}
                    <div className="space-y-3 rounded-lg border border-border/50 p-4 bg-muted/20">
                      <div>
                        <h4 className="text-sm font-semibold">Fiscal</h4>
                        <p className="text-xs text-muted-foreground">
                          Esta taxa é aplicada a todas as faturas, salvo override do cliente ou da invoice.
                        </p>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label>Taxa de IVA padrão (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={vatRateDefault}
                            onChange={(e) => setVatRateDefault(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Regime fiscal</Label>
                          <Select value={vatRegime} onValueChange={setVatRegime}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Padrão</SelectItem>
                              <SelectItem value="reduced">Taxa reduzida</SelectItem>
                              <SelectItem value="exempt">Isento</SelectItem>
                              <SelectItem value="reverse_charge">IVA reverso (UE)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>País fiscal</Label>
                          <Select value={vatCountry} onValueChange={setVatCountry}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                              <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                              <SelectItem value="OTHER">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>


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
                  </>
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
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Minimizar Menu ao Navegar</p>
                    <p className="text-sm text-muted-foreground">
                      Minimiza automaticamente a barra lateral quando clica num link
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.sidebar_auto_collapse ?? true}
                    onCheckedChange={(checked) => updatePreferences({ sidebar_auto_collapse: checked })}
                    disabled={savingPreferences}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categories Management */}
            {isAdmin && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="h-5 w-5" />
                    Categorias
                  </CardTitle>
                  <CardDescription>Gerir categorias personalizadas para projetos</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={() => setCategoryModalOpen(true)}>
                    Gerir Categorias
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            <Card className="glass-card border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Zona de Perigo
                </CardTitle>
                <CardDescription>
                  Ações irreversíveis que afetam o workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAdmin && (
                  <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div>
                      <p className="font-medium text-destructive">Eliminar Workspace</p>
                      <p className="text-sm text-muted-foreground">
                        Eliminar permanentemente este workspace e todos os dados associados
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={() => setDeleteModalOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                )}

                {isGuestMember && (
                  <div className="flex items-center justify-between p-4 rounded-lg border border-warning/20 bg-warning/5">
                    <div>
                      <p className="font-medium">Sair do Workspace</p>
                      <p className="text-sm text-muted-foreground">
                        Deixar de ter acesso a este workspace
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setLeaveModalOpen(true)}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                )}

                {!isAdmin && !isGuestMember && (
                  <p className="text-sm text-muted-foreground">
                    Não tem permissões para modificar este workspace.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* Perfil Tab */}
        <TabsContent value="perfil">
          <div className="grid gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Perfil do Utilizador</CardTitle>
                <CardDescription>Gerencie suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      {uploadingAvatar ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="font-medium">{user?.user_metadata?.full_name || 'Utilizador'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique na foto para alterar
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 pt-4">
                  <div className="grid gap-2">
                    <Label>Nome Completo</Label>
                    <Input 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+351 912 345 678" 
                    />
                  </div>
                </div>

                <Button 
                  className="gradient-primary" 
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    'Salvar Perfil'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Email Preferences */}
            <EmailPreferencesCard />

            {/* Notification Preferences */}
            <NotificationPreferencesCard />

            {/* Push Notifications */}
            <PushNotificationSettings />

            {/* Tour & Conta */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Ajuda e Conta
                </CardTitle>
                <CardDescription>Tour guiado e gestão da conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Tour Guiado</p>
                    <p className="text-sm text-muted-foreground">
                      Reveja o tour de introdução ao sistema
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleRestartTour}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Repetir Tour
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-destructive">Eliminar Conta</p>
                    <p className="text-sm text-muted-foreground">
                      Eliminar permanentemente a sua conta e todos os dados
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={() => setDeleteAccountModalOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Conta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
                <CardDescription>Links de reunião automáticos ao agendar eventos e comunicações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Activo</p>
                  </div>
                  <Badge variant="default" className="bg-success text-xs">Activo</Badge>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Permissões Tab */}
        <TabsContent value="permissoes">
          <PermissionsMatrix />
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

        {/* Automações Tab */}
        {isAdmin && (
          <TabsContent value="automacoes">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <AutomationsList />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Workspace Management Modals */}
      {currentWorkspace && (
        <>
          <DeleteWorkspaceModal
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            workspaceId={currentWorkspace.id}
            workspaceName={currentWorkspace.name}
            onSuccess={handleDeleteSuccess}
            isLastWorkspace={isLastAdminWorkspace}
          />
          <LeaveWorkspaceModal
            isOpen={leaveModalOpen}
            onClose={() => setLeaveModalOpen(false)}
            workspaceId={currentWorkspace.id}
            workspaceName={currentWorkspace.name}
            onSuccess={handleLeaveSuccess}
          />
        </>
      )}

      {/* Delete Account Modal */}
      <AlertDialog open={deleteAccountModalOpen} onOpenChange={setDeleteAccountModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Eliminar Conta Permanentemente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação é <strong>irreversível</strong>. Todos os seus dados, incluindo:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Perfil e preferências</li>
                <li>Workspaces onde é o único admin (serão eliminados)</li>
                <li>Projetos e tarefas associados</li>
                <li>Histórico de pagamentos</li>
              </ul>
              <p className="font-medium pt-2">
                Para confirmar, escreva <span className="text-destructive">ELIMINAR</span> abaixo:
              </p>
              <Input
                value={deleteAccountConfirmText}
                onChange={(e) => setDeleteAccountConfirmText(e.target.value.toUpperCase())}
                placeholder="Escreva ELIMINAR"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAccountConfirmText('')}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteAccountConfirmText !== 'ELIMINAR'}
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A eliminar...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Conta
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Management Modal */}
      <CategoryManagement 
        open={categoryModalOpen} 
        onOpenChange={setCategoryModalOpen} 
      />
    </div>
  );
}
