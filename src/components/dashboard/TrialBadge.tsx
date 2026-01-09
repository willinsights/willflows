import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Sparkles, Clock, AlertTriangle } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  const { currentWorkspace } = useWorkspace();

  const trialEndsAt = (currentWorkspace as any)?.trial_ends_at as string | null | undefined;
  const subscriptionStatus = (currentWorkspace as any)?.subscription_status as string | undefined;

  const daysRemaining = useMemo(() => {
    if (!trialEndsAt) return null;
    try {
      return differenceInDays(parseISO(trialEndsAt), new Date());
    } catch {
      return null;
    }
  }, [trialEndsAt]);

  // Don't show if:
  // - No workspace
  // - Subscription is active (not trialing)
  // - No trial end date
  // - More than 14 days remaining (shouldn't happen with 7-day trial)
  // - Trial already expired (handled by modal)
  if (!currentWorkspace) return null;
  if (subscriptionStatus === 'active') return null;
  if (daysRemaining === null) return null;
  if (daysRemaining > 14 || daysRemaining < 0) return null;

  const isUrgent = daysRemaining <= 2;
  const isWarning = daysRemaining <= 5 && daysRemaining > 2;

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
          <span className="font-bold">{daysRemaining}</span>
          <span>
            {daysRemaining === 0
              ? "dias - Trial termina hoje!"
              : daysRemaining === 1
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
            <span>{daysRemaining}d</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>
            {daysRemaining === 0
              ? "O trial termina hoje!"
              : daysRemaining === 1
              ? "Falta 1 dia de trial"
              : `Faltam ${daysRemaining} dias de trial`}
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
        {daysRemaining === 0
          ? "Trial termina hoje"
          : daysRemaining === 1
          ? "1 dia de trial"
          : `${daysRemaining} dias de trial`}
      </span>
    </Button>
  );
}
