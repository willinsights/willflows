import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  X,
} from 'lucide-react';
import logoWillflow from '@/assets/logo-willflow-sistema.png';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { STRIPE_PRICES } from '@/lib/stripe-prices';

// Plan definitions
const plans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Para freelancers',
    priceEUR: { monthly: 14, annual: 11 },
    priceBRL: { monthly: 79, annual: 63 },
    limits: '1 workspace • 2 utilizadores • 20 projetos',
    features: ['Kanban', 'CRM básico', 'Excel export'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para equipas',
    priceEUR: { monthly: 24, annual: 19 },
    priceBRL: { monthly: 149, annual: 119 },
    limits: '3 workspaces • 10 utilizadores • Ilimitados',
    features: ['Tudo do Starter', 'Google Calendar', 'Meet', 'PDF'],
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Para agências',
    priceEUR: { monthly: 32, annual: 26 },
    priceBRL: { monthly: 197, annual: 158 },
    limits: '10 workspaces • Ilimitados • Ilimitados',
    features: ['Tudo do Pro', 'Frame.io', 'Automações', 'API'],
  },
];

type Step = 'region' | 'plan' | 'success';

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshWorkspaces, currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  // Get URL params
  const urlPlan = searchParams.get('plan') || 'pro';
  const urlCurrency = searchParams.get('currency') as 'eur' | 'brl' | null;
  const urlInterval = searchParams.get('interval') as 'monthly' | 'annual' | null;
  const isCreatingNew = searchParams.get('new') === 'true';

  // State
  const [step, setStep] = useState<Step>('region');
  const [country, setCountry] = useState<'PT' | 'BR'>(urlCurrency === 'brl' ? 'BR' : 'PT');
  const [selectedPlan, setSelectedPlan] = useState(urlPlan);
  const [isAnnual, setIsAnnual] = useState(urlInterval === 'annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showBRL = country === 'BR';

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

  const getPrice = (plan: typeof plans[0]) => {
    const prices = showBRL ? plan.priceBRL : plan.priceEUR;
    return isAnnual ? prices.annual : prices.monthly;
  };

  const handleCreateWorkspaceAndCheckout = async () => {
    if (!user) return;

    const workspaceName = getWorkspaceName();
    setLoading(true);
    setError(null);

    try {
      // Create workspace
      const { data: workspaceId, error: rpcError } = await supabase.rpc('create_workspace_with_admin', {
        p_name: workspaceName,
        p_slug: createSlug(workspaceName),
        p_country: country,
        p_currency: country === 'PT' ? 'EUR' : 'BRL',
        p_timezone: country === 'PT' ? 'Europe/Lisbon' : 'America/Sao_Paulo',
        p_locale: country === 'PT' ? 'pt-PT' : 'pt-BR',
      });

      if (rpcError) throw rpcError;

      // Refresh workspaces
      await refreshWorkspaces();

      // Get Stripe price ID
      const currency = showBRL ? 'brl' : 'eur';
      const interval = isAnnual ? 'annual' : 'monthly';
      const priceId = STRIPE_PRICES[selectedPlan as keyof typeof STRIPE_PRICES]?.[currency]?.[interval];

      if (!priceId) {
        throw new Error('Preço não encontrado');
      }

      // Create checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          workspaceId,
        },
      });

      if (checkoutError) throw checkoutError;

      setStep('success');
      
      toast({
        title: 'Workspace criado com sucesso!',
        description: 'A redirecionar para o checkout...',
      });

      // Redirect to checkout
      if (checkoutData?.url) {
        setTimeout(() => {
          window.location.href = checkoutData.url;
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error:', err);
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
    handleCreateWorkspaceAndCheckout();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Logo */}
      <div className="mb-8">
        <img src={logoWillflow} alt="WillFlow" className="h-12 object-contain" />
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div className={cn(
          "w-8 h-1 rounded-full transition-colors",
          step === 'region' || step === 'plan' || step === 'success' ? 'bg-primary' : 'bg-muted'
        )} />
        <div className={cn(
          "w-8 h-1 rounded-full transition-colors",
          step === 'plan' || step === 'success' ? 'bg-primary' : 'bg-muted'
        )} />
        <div className={cn(
          "w-8 h-1 rounded-full transition-colors",
          step === 'success' ? 'bg-primary' : 'bg-muted'
        )} />
      </div>

      {/* Step Content */}
      <div className="w-full max-w-2xl">
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

              <Button 
                onClick={() => setStep('plan')} 
                className="w-full gradient-primary"
                size="lg"
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Plan Selection */}
          {step === 'plan' && (
            <motion.div
              key="plan-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">Escolha o seu plano</h1>
                <p className="text-muted-foreground mb-4">
                  7 dias grátis com cartão • Cancele quando quiser
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50">
                  <span className={cn("text-sm font-medium", !isAnnual ? 'text-foreground' : 'text-muted-foreground')}>
                    Mensal
                  </span>
                  <Switch
                    checked={isAnnual}
                    onCheckedChange={setIsAnnual}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className={cn("text-sm font-medium", isAnnual ? 'text-foreground' : 'text-muted-foreground')}>
                    Anual
                  </span>
                  {isAnnual && (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      −20%
                    </Badge>
                  )}
                </div>
              </div>

              {/* Plan Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      "relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                      selectedPlan === plan.id
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50',
                      plan.popular && selectedPlan === plan.id && 'ring-2 ring-primary/20'
                    )}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gradient-primary text-xs">
                        Popular
                      </Badge>
                    )}

                    <div className="text-center mb-3 pt-2">
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>

                    <div className="text-center mb-3">
                      <span className="text-2xl font-bold">
                        {showBRL ? 'R$' : '€'}{getPrice(plan)}
                      </span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>

                    <p className="text-xs text-center text-muted-foreground mb-3">
                      {plan.limits}
                    </p>

                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-1.5 text-xs">
                          <Check className="h-3 w-3 text-success flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {selectedPlan === plan.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

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

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setStep('region')} 
                  disabled={loading}
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  onClick={handleCreateWorkspaceAndCheckout} 
                  disabled={loading} 
                  className="flex-1 gradient-primary"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A criar...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Começar 7 dias grátis
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Ao continuar, concorda com os nossos Termos de Serviço e Política de Privacidade.
              </p>
            </motion.div>
          )}

          {/* Step 3: Success */}
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
                <h1 className="text-2xl font-bold mb-2">Workspace criado!</h1>
                <p className="text-muted-foreground">
                  A redirecionar para o checkout do Stripe...
                </p>
              </div>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
