import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, UserPlus, Mail, Lock, ArrowRight } from 'lucide-react';
import logoWhite from '@/assets/logo-willflow-white.png';
import logo from '@/assets/logo-willflow.png';

type InvitationData = {
  id: string;
  email: string;
  role: string;
  workspace_id: string;
  workspace_name: string;
  inviter_name: string | null;
  expires_at: string;
};

type ViewState = 'loading' | 'invalid' | 'expired' | 'already_member' | 'needs_auth' | 'ready' | 'accepting' | 'success';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = searchParams.get('token');

  // Fetch invitation data
  useEffect(() => {
    if (!token) {
      setViewState('invalid');
      return;
    }

    const fetchInvitation = async () => {
      // Use secure RPC function to fetch invitation by token
      // This prevents exposing all invitations to unauthenticated users
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { _token: token });

      if (error || !data || data.length === 0) {
        setViewState('invalid');
        return;
      }

      const invitationData = data[0];

      // Check if already accepted (RPC already filters this, but double-check)
      if (invitationData.accepted_at) {
        setViewState('invalid');
        return;
      }

      // Check if expired (RPC already filters this, but double-check)
      if (new Date(invitationData.expires_at) < new Date()) {
        setViewState('expired');
        return;
      }

      setInvitation({
        id: invitationData.id,
        email: invitationData.email,
        role: invitationData.role,
        workspace_id: invitationData.workspace_id,
        workspace_name: invitationData.workspace_name,
        inviter_name: null,
        expires_at: invitationData.expires_at,
      });
      setEmail(invitationData.email);
    };

    fetchInvitation();
  }, [token]);

  // Check user status when invitation is loaded and user auth state changes
  useEffect(() => {
    if (!invitation || authLoading) return;
    // Prevent checking if we're already in a terminal state
    if (viewState === 'ready' || viewState === 'already_member' || viewState === 'success' || viewState === 'accepting') return;

    const checkUserStatus = async () => {
      if (!user) {
        setViewState('needs_auth');
        return;
      }

      // Check if user email matches invitation email
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        setViewState('needs_auth');
        toast({
          title: "Email diferente",
          description: `Este convite foi enviado para ${invitation.email}. Por favor, faça login com esse email.`,
          variant: "destructive",
        });
        return;
      }

      // Check if already a member
      const { data: existingMember, error } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', invitation.workspace_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking membership:', error);
        // Don't block the flow, proceed to ready state
        setViewState('ready');
        return;
      }

      if (existingMember) {
        setViewState('already_member');
        return;
      }

      setViewState('ready');
    };

    checkUserStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, user, authLoading]);

  const handleAcceptInvite = async () => {
    if (!invitation || !user) return;

    setViewState('accepting');

    try {
      // Create workspace member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role: invitation.role as any,
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('workspace_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      setViewState('success');

      toast({
        title: "Convite aceite!",
        description: `Bem-vindo ao workspace ${invitation.workspace_name}!`,
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      toast({
        title: "Erro ao aceitar convite",
        description: error.message || "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive",
      });
      setViewState('ready');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/convite?token=${token}`,
          },
        });
        
        if (error) {
          // If user already exists, switch to login mode automatically
          if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
            setAuthMode('login');
            toast({
              title: "Conta já existe",
              description: "Este email já está registado. Por favor, faça login para aceitar o convite.",
            });
            setSubmitting(false);
            return;
          }
          throw error;
        }
        
        toast({
          title: "Conta criada!",
          description: "A sua conta foi criada com sucesso.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message?.includes('Invalid login credentials')) {
            toast({
              title: "Credenciais inválidas",
              description: "Email ou password incorretos. Por favor, tente novamente.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }
          throw error;
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      editor: 'Editor',
      captacao: 'Captação',
      freelancer: 'Freelancer',
      visualizador: 'Visualizador',
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src={logo} alt="Willflow" className="h-10 dark:hidden" />
            <img src={logoWhite} alt="Willflow" className="h-10 hidden dark:block" />
          </Link>
        </div>

        <Card className="border-border/50 shadow-xl">
          {/* Loading State */}
          {viewState === 'loading' && (
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">A verificar convite...</p>
            </CardContent>
          )}

          {/* Invalid Token */}
          {viewState === 'invalid' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle>Convite Inválido</CardTitle>
                <CardDescription>
                  Este link de convite não é válido ou já foi utilizado.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button asChild>
                  <Link to="/">Ir para a página inicial</Link>
                </Button>
              </CardContent>
            </>
          )}

          {/* Expired */}
          {viewState === 'expired' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-warning" />
                </div>
                <CardTitle>Convite Expirado</CardTitle>
                <CardDescription>
                  Este convite expirou. Por favor, peça um novo convite ao administrador do workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button asChild>
                  <Link to="/">Ir para a página inicial</Link>
                </Button>
              </CardContent>
            </>
          )}

          {/* Already Member */}
          {viewState === 'already_member' && invitation && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Já é membro!</CardTitle>
                <CardDescription>
                  Você já faz parte do workspace <strong>{invitation.workspace_name}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button asChild>
                  <Link to="/app">Ir para o Dashboard</Link>
                </Button>
              </CardContent>
            </>
          )}

          {/* Needs Authentication */}
          {viewState === 'needs_auth' && invitation && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Convite para {invitation.workspace_name}</CardTitle>
                <CardDescription>
                  Foi convidado como <strong>{getRoleLabel(invitation.role)}</strong>.
                  {authMode === 'signup' ? ' Crie uma conta' : ' Faça login'} para aceitar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nome completo</Label>
                      <Input
                        id="fullName"
                        placeholder="O seu nome"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {authMode === 'signup' ? 'Criar conta e aceitar' : 'Entrar e aceitar'}
                  </Button>
                </form>
                
                <div className="mt-4 text-center text-sm">
                  {authMode === 'signup' ? (
                    <p className="text-muted-foreground">
                      Já tem conta?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthMode('login')}
                        className="text-primary hover:underline font-medium"
                      >
                        Fazer login
                      </button>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Não tem conta?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className="text-primary hover:underline font-medium"
                      >
                        Criar conta
                      </button>
                    </p>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* Ready to Accept */}
          {viewState === 'ready' && invitation && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Aceitar Convite</CardTitle>
                <CardDescription>
                  Foi convidado para o workspace <strong>{invitation.workspace_name}</strong> como <strong>{getRoleLabel(invitation.role)}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleAcceptInvite} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aceitar Convite
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/">Recusar</Link>
                </Button>
              </CardContent>
            </>
          )}

          {/* Accepting */}
          {viewState === 'accepting' && (
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">A aceitar convite...</p>
            </CardContent>
          )}

          {/* Success */}
          {viewState === 'success' && invitation && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-kanban-cyan/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-kanban-cyan" />
                </div>
                <CardTitle>Bem-vindo!</CardTitle>
                <CardDescription>
                  Agora faz parte do workspace <strong>{invitation.workspace_name}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button asChild>
                  <Link to="/app">
                    Ir para o Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
