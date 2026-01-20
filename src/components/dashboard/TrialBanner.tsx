import { Sparkles, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceSubscription } from "@/hooks/useWorkspaceSubscription";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { 
    isTrial, 
    trialDaysRemaining, 
    shouldShowTrialUI, 
    loading,
    isSuperAdmin 
  } = useWorkspaceSubscription();
  const navigate = useNavigate();

  // Super Admin never sees trial banner
  if (isSuperAdmin) return null;
  
  // Don't show if:
  // - Loading
  // - User is not owner of the workspace (shouldShowTrialUI handles this)
  // - Not in trial
  // - More than 30 days remaining (BÓNUS DE LANÇAMENTO - 30 dias grátis)
  // - Trial already expired (handled by modal)
  if (loading) return null;
  if (!shouldShowTrialUI) return null;
  if (!isTrial) return null;
  if (trialDaysRemaining === null) return null;
  if (trialDaysRemaining > 30 || trialDaysRemaining < 0) return null;

  const isUrgent = trialDaysRemaining <= 2;

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
            {trialDaysRemaining === 0 ? (
              "O seu trial termina hoje!"
            ) : trialDaysRemaining === 1 ? (
              "Falta 1 dia para o fim do trial"
            ) : (
              <>
                Faltam <span className="font-bold">{trialDaysRemaining} dias</span>{" "}
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
        onClick={() => navigate("/app/planos")}
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
