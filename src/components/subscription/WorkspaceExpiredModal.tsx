import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Check, Loader2, LogOut, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceSubscription } from '@/hooks/useWorkspaceSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ActiveWorkspacesList } from '@/components/workspace/ActiveWorkspacesList';
import { 
  PLANS, 
  PLAN_ORDER, 
  getPriceId,
  getCurrencySymbol,
  type PlanId,
  type Currency,
} from '@/lib/plans';
import { cn } from '@/lib/utils';

interface WorkspaceExpiredModalProps {
  open: boolean;
}

export function WorkspaceExpiredModal({ open }: WorkspaceExpiredModalProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { currentWorkspace, activeWorkspaces, setCurrentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { isOwner, canManageSubscription, isTrial } = useWorkspaceSubscription();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [loading, setLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(isOwner);

  const handleUpgrade = async () => {
    if (!currentWorkspace || !canManageSubscription) return;

    setLoading(true);
    try {
      const currencyKey: Currency = (currentWorkspace.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur');
      const priceId = getPriceId(selectedPlan, currencyKey, 'monthly');

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

  const handleSwitchWorkspace = async (workspaceId: string) => {
    const success = await setCurrentWorkspace(workspaceId);
    if (success) {
      // Reload the page to fully reset state
      window.location.reload();
    } else {
      toast({
        title: 'Erro ao mudar de workspace',
        description: 'Não foi possível mudar para o workspace selecionado.',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    
    // Small delay to ensure state is fully cleared before navigation
    setTimeout(() => {
      navigate('/');
    }, 100);
  };

  const currencyKey: Currency = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur');
  const currencySymbol = getCurrencySymbol(currencyKey);

  // Determine modal title and description based on context
  const title = isTrial 
    ? 'O seu período de teste terminou' 
    : 'Workspace expirado';
  
  const description = isOwner
    ? 'Escolha um plano para continuar a usar o WillFlow ou mude para outro workspace ativo.'
    : 'Este workspace está expirado. Mude para outro workspace ativo para continuar a trabalhar.';

  const hasOtherWorkspaces = activeWorkspaces.length > 0;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Data safety message */}
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
          <p className="text-sm text-success font-medium">
            🔒 Os seus dados estão guardados em segurança
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isOwner 
              ? 'Ao subscrever, terá acesso imediato a todos os seus projetos e clientes.'
              : 'O administrador pode renovar a subscrição para restaurar o acesso.'}
          </p>
        </div>

        {/* Owner: Show upgrade options */}
        {isOwner && (
          <>
            {showPlans ? (
              <>
                <div className="grid grid-cols-3 gap-3 my-4">
                  {PLAN_ORDER.map((planId) => {
                    const plan = PLANS[planId];
                    const price = plan.prices[currencyKey].monthly;

                    return (
                      <motion.div
                        key={planId}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPlan(planId)}
                        className={cn(
                          'relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all',
                          selectedPlan === planId
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
                          <li className="flex items-center gap-1.5 text-xs">
                            <Check className="h-3 w-3 text-success flex-shrink-0" />
                            <span>{plan.limitsDisplay.workspaces}</span>
                          </li>
                          <li className="flex items-center gap-1.5 text-xs">
                            <Check className="h-3 w-3 text-success flex-shrink-0" />
                            <span>{plan.limitsDisplay.users}</span>
                          </li>
                          <li className="flex items-center gap-1.5 text-xs">
                            <Check className="h-3 w-3 text-success flex-shrink-0" />
                            <span>{plan.limitsDisplay.projects}</span>
                          </li>
                        </ul>

                        {selectedPlan === planId && (
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
                      Subscrever {PLANS[selectedPlan].name}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setShowPlans(true)} 
                variant="outline"
                className="w-full"
              >
                <Crown className="mr-2 h-4 w-4" />
                Ver planos e fazer upgrade
              </Button>
            )}
          </>
        )}

        {/* Separator if owner has both options */}
        {isOwner && hasOtherWorkspaces && (
          <div className="relative my-2">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
              ou
            </span>
          </div>
        )}

        {/* Switch workspace section - for everyone */}
        {hasOtherWorkspaces && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-center text-muted-foreground">
              Mudar para outro workspace
            </h3>
            <ActiveWorkspacesList
              workspaces={activeWorkspaces}
              currentWorkspaceId={currentWorkspace?.id || null}
              onSelectWorkspace={handleSwitchWorkspace}
              loading={workspaceLoading}
            />
          </div>
        )}

        {/* No other workspaces message for non-owners */}
        {!isOwner && !hasOtherWorkspaces && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">
              Não tem outros workspaces ativos. Contacte o administrador deste workspace para renovar a subscrição.
            </p>
          </div>
        )}

        {/* Sign out button */}
        <Separator className="my-2" />
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Terminar sessão
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-2">
          {isOwner 
            ? 'Pode cancelar a qualquer momento. Sem compromisso.'
            : 'Os seus dados permanecem seguros enquanto aguarda.'}
        </p>
      </DialogContent>
    </Dialog>
  );
}

// Re-export with old name for backward compatibility
export { WorkspaceExpiredModal as TrialExpiredModal };
