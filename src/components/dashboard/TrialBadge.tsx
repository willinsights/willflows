import { differenceInDays, parseISO } from "date-fns";
import { Sparkles, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrialBadgeProps {
  variant?: "compact" | "full";
  className?: string;
}

export function TrialBadge({ variant = "full", className }: TrialBadgeProps) {
  const { subscription } = useAuth();
  const navigate = useNavigate();

  // Don't show if not subscribed or no end date
  if (!subscription.subscribed || !subscription.subscriptionEnd) {
    return null;
  }

  const endDate = parseISO(subscription.subscriptionEnd);
  const today = new Date();
  const daysRemaining = differenceInDays(endDate, today);

  // Don't show badge if trial has ended or not in trial period
  if (daysRemaining > 7 || daysRemaining < 0) {
    return null;
  }

  const isUrgent = daysRemaining <= 2;

  const handleClick = () => {
    navigate("/app/configuracoes?tab=plano");
  };

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
