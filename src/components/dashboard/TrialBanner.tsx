import { differenceInDays, parseISO } from "date-fns";
import { Sparkles, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { subscription } = useAuth();
  const navigate = useNavigate();

  // Don't show if not subscribed or no end date
  if (!subscription.subscribed || !subscription.subscriptionEnd) {
    return null;
  }

  const endDate = parseISO(subscription.subscriptionEnd);
  const today = new Date();
  const daysRemaining = differenceInDays(endDate, today);

  // Don't show banner if trial has ended (more than 7 days since start means not in trial)
  // Trial is 7 days, so if more than 7 days remaining, user is in normal subscription
  if (daysRemaining > 7 || daysRemaining < 0) {
    return null;
  }

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
