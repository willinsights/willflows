import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Check, Loader2, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_PRICES, PLAN_INFO, getPriceId } from '@/lib/stripe-prices';
import { cn } from '@/lib/utils';

interface TrialExpiredModalProps {
  open: boolean;
}

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    features: ['1 workspace', '2 utilizadores', '20 projetos'],
  },
  {
    id: 'pro',
    name: 'Pro',
    features: ['3 workspaces', '10 utilizadores', 'Projetos ilimitados'],
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    features: ['10 workspaces', 'Utilizadores ilimitados', 'API & Automações'],
  },
];

export function TrialExpiredModal({ open }: TrialExpiredModalProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const currencyKey = (currentWorkspace.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
      const priceId = getPriceId(selectedPlan as 'starter' | 'pro' | 'studio', currencyKey, 'monthly');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
  const currencySymbol = currencyKey === 'eur' ? '€' : 'R$';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">O seu período de teste terminou</DialogTitle>
          <DialogDescription className="text-base">
            Escolha um plano para continuar a usar o WillFlow e gerir os seus projetos.
          </DialogDescription>
        </DialogHeader>

        {/* Data safety message */}
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
          <p className="text-sm text-success font-medium">
            🔒 Os seus dados estão guardados em segurança
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ao subscrever, terá acesso imediato a todos os seus projetos e clientes.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 my-6">
          {plans.map((plan) => {
            const planInfo = PLAN_INFO[plan.id as keyof typeof PLAN_INFO];
            const price = planInfo?.prices[currencyKey]?.monthly || 0;

            return (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all',
                  selectedPlan === plan.id
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gradient-primary text-xs">
                    Popular
                  </Badge>
                )}

                <div className="text-center mb-3 pt-2">
                  <h3 className="font-bold">{plan.name}</h3>
                  <div className="mt-1">
                    <span className="text-xl font-bold">
                      {currencySymbol}{price}
                    </span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                </div>

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
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleUpgrade} 
            disabled={loading} 
            className="w-full gradient-primary"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A processar...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Subscrever {plans.find(p => p.id === selectedPlan)?.name}
              </>
            )}
          </Button>

          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Terminar sessão
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          Pode cancelar a qualquer momento. Sem compromisso.
        </p>
      </DialogContent>
    </Dialog>
  );
}
