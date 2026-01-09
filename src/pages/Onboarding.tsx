import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import logoWillflow from '@/assets/logo-willflow-sistema.png';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Onboarding() {
  const [country, setCountry] = useState<'PT' | 'BR'>('PT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { refreshWorkspaces, currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [created, setCreated] = useState(false);

  // If user already has workspace, redirect to app
  useEffect(() => {
    if (currentWorkspace) {
      navigate('/app', { replace: true });
    }
  }, [currentWorkspace, navigate]);

  // Generate workspace name from user data
  const getWorkspaceName = (): string => {
    if (user?.user_metadata?.full_name) {
      const firstName = user.user_metadata.full_name.split(' ')[0];
      return `Estúdio ${firstName}`;
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      // Capitalize first letter
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

  const handleCreateWorkspace = async () => {
    if (!user) return;

    const workspaceName = getWorkspaceName();
    setLoading(true);
    setError(null);

    try {
      // Use RPC function to create workspace with admin member atomically
      const { data: workspaceId, error: rpcError } = await supabase.rpc('create_workspace_with_admin', {
        p_name: workspaceName,
        p_slug: createSlug(workspaceName),
        p_country: country,
        p_currency: country === 'PT' ? 'EUR' : 'BRL',
        p_timezone: country === 'PT' ? 'Europe/Lisbon' : 'America/Sao_Paulo',
        p_locale: country === 'PT' ? 'pt-PT' : 'pt-BR',
      });

      if (rpcError) throw rpcError;

      setCreated(true);
      
      toast({
        title: 'Workspace criado com sucesso!',
        description: 'O seu espaço de trabalho está pronto.',
      });

      // Give time for the database to propagate, then refresh and redirect
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshWorkspaces();

      // Redirect after short delay
      setTimeout(() => {
        navigate('/app', { replace: true });
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Logo */}
      <div className="mb-12">
        <img src={logoWillflow} alt="WillFlow" className="h-14 object-contain" />
      </div>

      {/* Step Content */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {!created ? (
            <motion.div
              key="region-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Bem-vindo ao WillFlow!</h1>
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

              {/* Create Button */}
              <Button 
                onClick={handleCreateWorkspace} 
                disabled={loading} 
                className="w-full gradient-primary"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A criar...
                  </>
                ) : (
                  <>
                    Começar
                    <MapPin className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
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
      </div>
    </div>
  );
}
