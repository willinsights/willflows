import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Building2, 
  MapPin, 
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import logoWillflow from '@/assets/logo-willflow-sistema.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const workspaceSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  country: z.enum(['PT', 'BR']),
});

type WorkspaceFormData = z.infer<typeof workspaceSchema>;

const steps = [
  { id: 1, title: 'Workspace', icon: Building2 },
  { id: 2, title: 'Região', icon: MapPin },
  { id: 3, title: 'Concluído', icon: Check },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: '',
      country: 'PT',
    },
  });

  const createSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) + '-' + Date.now().toString(36);
  };

  const handleCreateWorkspace = async () => {
    if (!user) return;

    const values = form.getValues();
    setLoading(true);
    setError(null);

    try {
      // Use RPC function to create workspace with admin member atomically
      const { data: workspaceId, error: rpcError } = await supabase.rpc('create_workspace_with_admin', {
        p_name: values.name,
        p_slug: createSlug(values.name),
        p_country: values.country,
        p_currency: values.country === 'PT' ? 'EUR' : 'BRL',
        p_timezone: values.country === 'PT' ? 'Europe/Lisbon' : 'America/Sao_Paulo',
        p_locale: values.country === 'PT' ? 'pt-PT' : 'pt-BR',
      });

      if (rpcError) throw rpcError;

      setCurrentStep(3);
      
      toast({
        title: 'Workspace criado com sucesso!',
        description: 'O seu espaço de trabalho está pronto.',
      });

      // Give time for the database to propagate, then refresh and redirect
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshWorkspaces();

      // Redirect after short delay
      setTimeout(() => {
        navigate('/app');
      }, 1500);
    } catch (err: any) {
      console.error('Error creating workspace:', err);
      const errorMessage = err.message?.includes('Failed to fetch') 
        ? 'Erro de ligação. Verifique a sua internet e tente novamente.'
        : err.message || 'Ocorreu um erro. Tente novamente.';
      setError(errorMessage);
      toast({
        title: 'Erro ao criar workspace',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleCreateWorkspace();
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      const isValid = await form.trigger('name');
      if (!isValid) return;
    }

    if (currentStep === 2) {
      await handleCreateWorkspace();
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Logo */}
      <div className="mb-12">
        <img src={logoWillflow} alt="WillFlow" className="h-14 object-contain" />
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-12">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full transition-all',
                currentStep >= step.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <step.icon className="h-5 w-5" />
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-12 h-0.5 mx-2 transition-all',
                  currentStep > step.id ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Criar o seu Workspace</h1>
                <p className="text-muted-foreground">
                  O workspace é o espaço onde você e a sua equipa vão trabalhar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do workspace</Label>
                <Input
                  id="name"
                  placeholder="Ex: In-Sights Produções"
                  {...form.register('name')}
                  className={cn(
                    form.formState.errors.name && 'border-destructive'
                  )}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Selecionar região</h1>
                <p className="text-muted-foreground">
                  Isto define a moeda, idioma e fuso horário padrão
                </p>
              </div>

              <RadioGroup
                value={form.watch('country')}
                onValueChange={(value) => form.setValue('country', value as 'PT' | 'BR')}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="PT"
                  className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all',
                    form.watch('country') === 'PT'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="PT" id="PT" className="sr-only" />
                  <span className="text-4xl">🇵🇹</span>
                  <div className="text-center">
                    <div className="font-semibold">Portugal</div>
                    <div className="text-sm text-muted-foreground">EUR • pt-PT</div>
                  </div>
                </Label>

                <Label
                  htmlFor="BR"
                  className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all',
                    form.watch('country') === 'BR'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="BR" id="BR" className="sr-only" />
                  <span className="text-4xl">🇧🇷</span>
                  <div className="text-center">
                    <div className="font-semibold">Brasil</div>
                    <div className="text-sm text-muted-foreground">BRL • pt-BR</div>
                  </div>
                </Label>
              </RadioGroup>

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
                    Tentar novamente
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full bg-success/10">
                <Check className="h-10 w-10 text-success" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Tudo pronto!</h1>
                <p className="text-muted-foreground">
                  O seu workspace foi criado com sucesso. A redirecionar...
                </p>
              </div>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {currentStep < 3 && (
          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={cn(currentStep === 1 && 'invisible')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={nextStep} disabled={loading} className="gradient-primary">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A criar...
                </>
              ) : currentStep === 2 ? (
                <>
                  Criar workspace
                  <Check className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
