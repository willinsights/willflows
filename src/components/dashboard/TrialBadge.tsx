import { Sparkles, Clock, AlertTriangle } from "lucide-react";
import { useWorkspaceSubscription } from "@/hooks/useWorkspaceSubscription";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrialBadgeProps {
  variant?: "compact" | "full" | "header";
  className?: string;
  onUpgradeClick?: () => void;
}

export function TrialBadge({ variant = "full", className, onUpgradeClick }: TrialBadgeProps) {
  const { 
    isTrial, 
    trialDaysRemaining, 
    shouldShowTrialUI, 
    loading,
    isSuperAdmin 
  } = useWorkspaceSubscription();

  // Super Admin never sees trial badge
  if (isSuperAdmin) return null;

  // Don't show if:
  // - Loading
  // - User is not owner of the workspace (shouldShowTrialUI handles this)
  // - Not in trial
  // - Trial already expired (handled by modal)
  if (loading) return null;
  if (!shouldShowTrialUI) return null;
  if (!isTrial) return null;
  if (trialDaysRemaining === null) return null;
  if (trialDaysRemaining < 0) return null; // Trial expired, modal handles this

  const isUrgent = trialDaysRemaining <= 2;
  const isWarning = trialDaysRemaining <= 5 && trialDaysRemaining > 2;

  const handleClick = () => {
    onUpgradeClick?.();
  };

  // Header variant - More prominent, always visible during trial
  if (variant === "header") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={cn(
          "gap-2 text-xs font-medium px-3 py-1.5 h-auto relative overflow-hidden rounded-full",
          isUrgent
            ? "text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            : isWarning
            ? "text-orange-900 dark:text-orange-100 bg-gradient-to-r from-orange-200 to-amber-200 dark:from-orange-900/50 dark:to-amber-900/50 hover:from-orange-300 hover:to-amber-300 dark:hover:from-orange-800/50 dark:hover:to-amber-800/50"
            : "text-primary bg-primary/10 hover:bg-primary/20",
          isUrgent && "animate-pulse",
          className
        )}
      >
        {isUrgent ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : isWarning ? (
          <Clock className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        <span className="flex items-center gap-1.5">
          <span className="font-bold">{trialDaysRemaining}</span>
          <span>
            {trialDaysRemaining === 0
              ? "dias - Trial termina hoje!"
              : trialDaysRemaining === 1
              ? "dia restante"
              : "dias restantes"}
          </span>
          <span className="hidden sm:inline text-[10px] opacity-70 ml-1">• Fazer upgrade</span>
        </span>
      </Button>
    );
  }

  // Compact variant for sidebar
  if (variant === "compact") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            className={cn(
              "w-full justify-center gap-2 text-xs font-medium",
              isUrgent
                ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                : "text-primary hover:text-primary hover:bg-primary/10",
              className
            )}
          >
            {isUrgent ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{trialDaysRemaining}d</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>
            {trialDaysRemaining === 0
              ? "O trial termina hoje!"
              : trialDaysRemaining === 1
              ? "Falta 1 dia de trial"
              : `Faltam ${trialDaysRemaining} dias de trial`}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full variant for header/sidebar expanded
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "gap-2 text-xs font-medium px-3 py-1.5 h-auto",
        isUrgent
          ? "text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive"
          : "text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary",
        className
      )}
    >
      {isUrgent ? (
        <Clock className="h-3.5 w-3.5" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      <span>
        {trialDaysRemaining === 0
          ? "Trial termina hoje"
          : trialDaysRemaining === 1
          ? "1 dia de trial"
          : `${trialDaysRemaining} dias de trial`}
      </span>
    </Button>
  );
}
