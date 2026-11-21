import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import logoWillflow from '@/assets/logo-willflow-sistema.png';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { trackTrialStarted } from '@/lib/google-ads';
import { getDisplayPlanName } from '@/lib/plans';
import {
  TRIAL_USED_MESSAGE,
  getOnboardingOffer,
  getWorkspaceLimitMessage,
  hasOwnWorkspace,
} from '@/lib/billing/accountPlan';

import { logger } from '@/lib/logger';
type Step = 'region' | 'success';

// Recusas do servidor (create_workspace_with_admin) com mensagem própria
type BlockedReason = 'WORKSPACE_LIMIT_REACHED' | 'TRIAL_ALREADY_USED';

const getBlockedReason = (message: unknown): BlockedReason | null => {
  if (typeof message !== 'string') return null;
  if (message.includes('WORKSPACE_LIMIT_REACHED')) return 'WORKSPACE_LIMIT_REACHED';
  if (message.includes('TRIAL_ALREADY_USED')) return 'TRIAL_ALREADY_USED';
  return null;
};

// A mensagem do limite depende de a conta ter ou não um plano pago ativo
const getBlockedMessage = (reason: BlockedReason, accountStatus: string | null | undefined): string =>
  reason === 'WORKSPACE_LIMIT_REACHED'
    ? getWorkspaceLimitMessage(accountStatus)
    : TRIAL_USED_MESSAGE;

const formatDayMonth = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

const formatFullDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, subscription: accountSubscription } = useAuth();
  const { refreshWorkspaces, currentWorkspace, allWorkspaces, isWorkspaceOwner } = useWorkspace();
  const { toast } = useToast();
  const { isSuperAdmin } = useSuperAdmin();

  const isCreatingNew = searchParams.get('new') === 'true';
  // Só há app para onde voltar quando se cria um workspace adicional
  const hasAnyWorkspace = currentWorkspace !== null || allWorkspaces.length > 0;
  const canGoBackToApp = isCreatingNew && hasAnyWorkspace;

  // O teste gratuito é um por conta e começa com o primeiro workspace próprio.
  // Quem já é DONO de um workspace não recebe 7 dias novos: o workspace novo
  // usa o plano (ou o teste em curso) da conta. O servidor é a autoridade.
  // Uma conta que já comprou o plano (sem workspace próprio) também não começa teste,
  // e uma conta cujo teste já terminou vê logo a explicação e os planos.
  // O super admin nunca vê «Ver planos» em vez do botão de criar: o servidor
  // não lhe aplica limites nem a regra do teste.
  const offer = getOnboardingOffer({
    isSuperAdmin,
    accountStatus: accountSubscription?.status,
    trialStartedAt: accountSubscription?.trialStartedAt,
    trialEndsAt: accountSubscription?.trialEndsAt,
    addingToOwnWorkspaces: isCreatingNew && hasOwnWorkspace(allWorkspaces, user?.id),
  });
  const trialAlreadyStarted = offer !== 'trial';
  const trialUsed = offer === 'trial_used';
  // Teste em curso e sem workspace próprio: não começa outro teste de 7 dias
  const trialInProgress = offer === 'trial_in_progress';
  const trialInProgressEnd = accountSubscription?.trialEndsAt ?? null;

  // /app/planos exige um workspace (o ProtectedRoute envia para /onboarding) e só o
  // dono compra lá. Sem workspace, ou sem ser o dono, usa-se a página pública
  // de planos, onde a compra é feita para a conta, sem workspace.
  const plansPath = currentWorkspace && isWorkspaceOwner ? '/app/planos' : '/planos';

  const accountPlanInfo = (() => {
    const generic = {
      title: 'Usa o plano da sua conta',
      description: 'O novo workspace não inicia um novo período de teste.',
    };
    if (trialInProgress) {
      return {
        title: 'Teste em curso',
        description: trialInProgressEnd
          ? `O seu período de teste termina a ${formatFullDate(trialInProgressEnd)}.`
          : 'O novo workspace usa o período de teste da sua conta.',
      };
    }
    if (!accountSubscription) return generic;
    const { plan, status, trialEndsAt } = accountSubscription;
    // Super admin sem plano ativo: nada a afirmar sobre plano ou teste
    if (isSuperAdmin && status !== 'active') {
      return {
        title: 'Conta de administração',
        description: 'A criação de workspaces não depende do período de teste.',
      };
    }
    if (status === 'active' && plan) {
      return {
        title: `Usa o seu plano ${getDisplayPlanName(plan)}`,
        description: 'O novo workspace fica incluído no plano da sua conta, sem novo período de teste.',
      };
    }
    if (status === 'trialing' && trialEndsAt && Date.parse(trialEndsAt) > Date.now()) {
      return {
        title: 'Usa o teste em curso',
        description: `O novo workspace usa o período de teste da sua conta, que termina a ${formatDayMonth(trialEndsAt)}. Não começa um novo teste.`,
      };
    }
    return generic;
  })();

  // State
  const [step, setStep] = useState<Step>('region');
  const [country, setCountry] = useState<'PT' | 'BR'>('PT');
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<BlockedReason | null>(null);
  // Fixado no momento da criação: depois do refresh a conta passa a ter workspace próprio
  const [createdWithoutTrial, setCreatedWithoutTrial] = useState(false);

  // Pre-fill workspace name with suggestion
  useEffect(() => {
    if (user && !workspaceName) {
      setWorkspaceName(getWorkspaceName());
    }
  }, [user]);

  // If user already has workspace and is NOT creating a new one, redirect to app
  useEffect(() => {
    if (currentWorkspace && !isCreatingNew) {
      navigate('/app', { replace: true });
    }
  }, [currentWorkspace, navigate, isCreatingNew]);

  // Generate workspace name from user data
  const getWorkspaceName = (): string => {
    if (user?.user_metadata?.full_name) {
      const firstName = user.user_metadata.full_name.split(' ')[0];
      return `Estúdio ${firstName}`;
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      const capitalized = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      return `Estúdio ${capitalized}`;
    }
    return 'Meu Estúdio';
  };

  const createSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) + '-' + Date.now().toString(36);
  };

  const handleCreateTrialWorkspace = async () => {
    if (!user) return;

    const finalName = workspaceName.trim() || getWorkspaceName();
    setLoading(true);
    setError(null);
    setBlockedReason(null);

    try {
      // Create workspace (comes with trial from backend - starter plan, trialing status)
      const { data: workspaceId, error: rpcError } = await supabase.rpc('create_workspace_with_admin', {
        p_name: finalName,
        p_slug: createSlug(finalName),
        p_country: country,
        p_currency: country === 'PT' ? 'EUR' : 'BRL',
        p_timezone: country === 'PT' ? 'Europe/Lisbon' : 'America/Sao_Paulo',
        p_locale: country === 'PT' ? 'pt-PT' : 'pt-BR',
      });

      if (rpcError) throw rpcError;

      // Refresh workspaces to get the new one
      await refreshWorkspaces();

      setCreatedWithoutTrial(trialAlreadyStarted);
      setStep('success');
      
      if (trialAlreadyStarted) {
        toast({
          title: 'Workspace criado',
          description: trialInProgress
            ? 'O novo workspace usa o período de teste em curso da sua conta.'
            : 'O novo workspace usa o plano da sua conta.',
        });
      } else {
        // Track trial started conversion
        trackTrialStarted();

        toast({
          title: '🎉 Bem-vindo ao WillFlow!',
          description: 'O seu teste de 7 dias começou. Explore à vontade!',
        });
      }

      // Redirect directly to app (no Stripe checkout)
      setTimeout(() => {
        navigate('/app');
      }, 1500);
    } catch (err: any) {
      logger.error('Error creating workspace:', err);
      const reason = getBlockedReason(err?.message);
      if (reason) {
        // Recusa esperada do servidor: mostra-se a explicação e os planos, sem «Tentar»
        setBlockedReason(reason);
        return;
      }
      const errorMessage = err.message?.includes('Failed to fetch') 
        ? 'Erro de ligação. Verifique a sua internet e tente novamente.'
        : err.message || 'Ocorreu um erro. Tente novamente.';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleCreateTrialWorkspace();
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {canGoBackToApp && step === 'region' && !loading && (
        <Link
          to="/app"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Link>
      )}

      {/* Logo */}
      <div className="mb-8">
        <img src={logoWillflow} alt="WillFlow" className="h-12 object-contain" />
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div className={cn(
          "w-8 h-1 rounded-full transition-colors",
          step === 'region' || step === 'success' ? 'bg-primary' : 'bg-muted'
        )} />
        <div className={cn(
          "w-8 h-1 rounded-full transition-colors",
          step === 'success' ? 'bg-primary' : 'bg-muted'
        )} />
      </div>

      {/* Step Content */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* Step 1: Region */}
          {step === 'region' && (
            <motion.div
              key="region-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">
                  {isCreatingNew ? 'Criar novo workspace' : 'Bem-vindo ao WillFlow!'}
                </h1>
                <p className="text-muted-foreground">
                  Selecione a sua região para configurar moeda e fuso horário
                </p>
              </div>

              {/* Oferta do teste, plano da conta (teste já começado) ou teste já usado */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="p-2 rounded-full bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {trialUsed
                      ? 'O período de teste desta conta já foi usado'
                      : trialAlreadyStarted ? accountPlanInfo.title : '7 dias grátis'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trialUsed
                      ? 'Para criar um workspace, escolha um plano.'
                      : trialAlreadyStarted
                        ? accountPlanInfo.description
                        : 'Acesso completo • Sem cartão de crédito'}
                  </p>
                </div>
              </div>

              <RadioGroup
                value={country}
                onValueChange={(value) => setCountry(value as 'PT' | 'BR')}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="PT"
                  className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all',
                    country === 'PT'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="PT" id="PT" className="sr-only" />
                  <span className="text-4xl">🇵🇹</span>
                  <div className="text-center">
                    <div className="font-semibold">Portugal</div>
                    <div className="text-sm text-muted-foreground">EUR • Lisboa</div>
                  </div>
                </Label>

                <Label
                  htmlFor="BR"
                  className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all',
                    country === 'BR'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="BR" id="BR" className="sr-only" />
                  <span className="text-4xl">🇧🇷</span>
                  <div className="text-center">
                    <div className="font-semibold">Brasil</div>
                    <div className="text-sm text-muted-foreground">BRL • São Paulo</div>
                  </div>
                </Label>
              </RadioGroup>

              {/* Workspace Name */}
              <div className="space-y-2">
                <Label htmlFor="workspace-name" className="text-sm font-medium">
                  Nome do espaço de trabalho
                </Label>
                <Input
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Ex: Estúdio Criativo"
                  className="w-full"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Este nome será visível para todos os membros da equipa
                </p>
              </div>

              {/* Recusa do servidor: limite de workspaces ou teste já usado */}
              {blockedReason && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="space-y-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <p className="flex-1 text-sm text-destructive">{getBlockedMessage(blockedReason, accountSubscription?.status)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link to={plansPath}>Ver planos</Link>
                    </Button>
                    {blockedReason === 'WORKSPACE_LIMIT_REACHED' && hasAnyWorkspace && (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/app">Voltar à aplicação</Link>
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Error State */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div className="flex-1 text-sm text-destructive">{error}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={loading}
                    className="flex-shrink-0"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                    Tentar
                  </Button>
                </motion.div>
              )}

              {trialUsed ? (
                <Button asChild className="w-full gradient-primary" size="lg">
                  <Link to={plansPath}>
                    Ver planos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
              <Button 
                onClick={handleCreateTrialWorkspace} 
                className="w-full gradient-primary"
                size="lg"
                disabled={loading || !workspaceName.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A criar...
                  </>
                ) : (
                  <>
                    {trialAlreadyStarted ? 'Criar workspace' : 'Começar teste grátis'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Ao continuar, concorda com os nossos Termos de Serviço e Política de Privacidade.
                {!trialAlreadyStarted && (
                  <>
                    <br />
                    <span className="text-primary/80">Pode fazer upgrade a qualquer momento.</span>
                  </>
                )}
              </p>
            </motion.div>
          )}

          {/* Step 2: Success */}
          {step === 'success' && (
            <motion.div
              key="success-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full bg-success/10">
                <Check className="h-10 w-10 text-success" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Tudo pronto! 🎉</h1>
                <p className="text-muted-foreground">
                  O seu workspace foi criado com sucesso.
                  {!createdWithoutTrial && (
                    <>
                      <br />
                      <span className="text-primary">7 dias de teste ativados!</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                A redirecionar para a aplicação...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
