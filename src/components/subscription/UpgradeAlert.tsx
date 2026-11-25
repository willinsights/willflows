import { CONTACT_OWNER_MESSAGE, LEAVING_PAGE_WARNING } from '@/lib/billing/accountPlan';
import { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlanCheckout } from '@/hooks/usePlanCheckout';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getPriceId, getTaxSuffix, PLANS as PLAN_INFO } from '@/lib/plans';
import type { SubscriptionPlan } from '@/hooks/useUserSubscription';
import type { FeatureInfo } from '@/hooks/usePlanFeatures';

interface UpgradeAlertProps {
  isOpen: boolean;
  onClose: () => void;
  feature: FeatureInfo | null;
  requiredPlan: SubscriptionPlan | null;
  currentPlan?: SubscriptionPlan;
  isLimitReached?: boolean;
  currentUsage?: number;
  limit?: number;
  alternativeAction?: {
    label: string;
    description: string;
  };
}

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  studio: 'Studio',
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  starter: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/20 text-primary',
  studio: 'bg-gradient-to-r from-accent/20 to-pink-500/20 text-accent',
};

export const UpgradeAlert = forwardRef<HTMLDivElement, UpgradeAlertProps>(function UpgradeAlert({
  isOpen,
  onClose,
  feature,
  requiredPlan,
  currentPlan = 'starter',
  isLimitReached = false,
  currentUsage,
  limit,
  alternativeAction,
}, ref) {
  const navigate = useNavigate();
  const { checkout } = usePlanCheckout();
  // Só o dono do workspace (primeiro administrador) compra a partir daqui
  const { currentWorkspace, isWorkspaceOwner, checkoutWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const [loading, setLoading] = useState(false);

  if (!feature || !requiredPlan) return null;

  const planInfo = PLAN_INFO[requiredPlan];
  const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
  const price = planInfo?.prices?.[currencyKey]?.monthly;
  const currencySymbol = currencyKey === 'eur' ? '€' : 'R$';

  const handleViewPlans = () => {
    onClose();
    navigate('/app/planos');
  };

  const handleUpgrade = async () => {
    if (!currentWorkspace || !isWorkspaceOwner || !checkoutWorkspaceId) return;

    setLoading(true);
    try {
      const result = await checkout({
        priceId: getPriceId(requiredPlan, currencyKey, 'monthly'),
        workspaceId: checkoutWorkspaceId,
      });
      // Fecha-se o diálogo para a ação «Gerir subscrição» do aviso ficar acessível
      if (
        result.status === 'redirected' ||
        result.status === 'already_subscribed' ||
        result.status === 'payment_pending'
      ) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {isLimitReached ? 'Limite Atingido' : 'Feature Premium'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isLimitReached ? (
              <>
                Atingiu o limite de <strong>{limit}</strong> {feature.name.toLowerCase()} do seu plano.
                {currentUsage !== undefined && (
                  <span className="block mt-1 text-sm">
                    Utilização atual: {currentUsage}/{limit}
                  </span>
                )}
              </>
            ) : (
              <>
                <strong>{feature.name}</strong> está disponível a partir do plano{' '}
                <Badge className={PLAN_COLORS[requiredPlan]}>
                  {PLAN_LABELS[requiredPlan]}
                </Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feature description */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{feature.name}</p>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </div>

          {/* Alternative action hint */}
          {alternativeAction && (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 bg-background">
              <p className="text-sm font-medium text-foreground">{alternativeAction.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{alternativeAction.description}</p>
            </div>
          )}

          {/* Current vs Required plan */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Plano Atual</p>
              <Badge variant="secondary" className="text-sm">
                {PLAN_LABELS[currentPlan]}
              </Badge>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Recomendado</p>
              <Badge className={`text-sm ${PLAN_COLORS[requiredPlan]}`}>
                <Crown className="h-3 w-3 mr-1" />
                {PLAN_LABELS[requiredPlan]}
              </Badge>
            </div>
          </div>

          {/* Price preview */}
          {price && (
            <div className="text-center">
              <p className="text-2xl font-bold">
                {currencySymbol}{price}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
                <span className="ml-1 text-xs font-normal text-muted-foreground">{getTaxSuffix(currencyKey)}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {isWorkspaceOwner ? (
            <>
              <Button 
                onClick={handleUpgrade} 
                disabled={loading}
                className="w-full gap-2"
              >
                <Crown className="h-4 w-4" />
                {loading ? 'A processar...' : `Fazer Upgrade para ${PLAN_LABELS[requiredPlan]}`}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {LEAVING_PAGE_WARNING}
              </p>
            </>
          ) : workspaceLoading ? null : (
            <p className="text-sm text-center text-muted-foreground">
              {CONTACT_OWNER_MESSAGE}.
            </p>
          )}
          <Button variant="ghost" onClick={handleViewPlans} className="w-full">
            Ver todos os planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
