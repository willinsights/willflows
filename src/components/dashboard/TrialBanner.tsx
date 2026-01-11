import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Sparkles, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { subscription, loading } = useUserSubscription();
  const navigate = useNavigate();

  const daysRemaining = useMemo(() => {
    if (!subscription?.trialEndsAt) return null;
    try {
      return differenceInDays(parseISO(subscription.trialEndsAt), new Date());
    } catch {
      return null;
    }
  }, [subscription?.trialEndsAt]);

  // Don't show if:
  // - Loading
  // - No subscription data
  // - Subscription is active (not trialing)
  // - No trial end date
  // - More than 7 days remaining (trial is 7 days max)
  // - Trial already expired (handled by modal)
  if (loading) return null;
  if (!subscription) return null;
  if (subscription.status === 'active') return null;
  if (daysRemaining === null) return null;
  if (daysRemaining > 7 || daysRemaining < 0) return null;

  const isUrgent = daysRemaining <= 2;

  return (
    <div
      className={cn(
        "rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        isUrgent
          ? "bg-destructive/10 border border-destructive/20"
          : "bg-primary/10 border border-primary/20"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-full",
            isUrgent ? "bg-destructive/20" : "bg-primary/20"
          )}
        >
          {isUrgent ? (
            <Clock className={cn("h-5 w-5", "text-destructive")} />
          ) : (
            <Sparkles className={cn("h-5 w-5", "text-primary")} />
          )}
        </div>
        <div>
          <p className="font-medium">
            {daysRemaining === 0 ? (
              "O seu trial termina hoje!"
            ) : daysRemaining === 1 ? (
              "Falta 1 dia para o fim do trial"
            ) : (
              <>
                Faltam <span className="font-bold">{daysRemaining} dias</span>{" "}
                para o fim do trial
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {isUrgent
              ? "Faça upgrade agora para não perder o acesso às funcionalidades premium."
              : "Aproveite todas as funcionalidades premium durante o período de trial."}
          </p>
        </div>
      </div>
      <Button
        onClick={() => navigate("/app/configuracoes?tab=plano")}
        className={cn(
          "shrink-0 gap-2",
          isUrgent && "bg-destructive hover:bg-destructive/90"
        )}
      >
        Ver planos
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
