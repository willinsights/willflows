import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trackCheckoutSuccess } from "@/lib/google-ads";
import {
  getAccountPlanLabel,
  hasActivePaidPlan,
  hasOwnWorkspace,
  waitForPlanConfirmation,
} from "@/lib/billing/accountPlan";

type Phase = "checking" | "confirmed" | "pending";

const APP_PATH = "/app";
const CREATE_WORKSPACE_PATH = "/onboarding?new=true";

// Navegação com recarregamento: o estado da conta e dos workspaces em memória
// é anterior ao pagamento e tem de ser lido de novo.
const goTo = (path: string) => {
  globalThis.location.assign(path);
};

const CheckoutSuccess = () => {
  const { user } = useAuth();
  const { allWorkspaces } = useWorkspace();
  const [phase, setPhase] = useState<Phase>("checking");
  const [plan, setPlan] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const hasTrackedConversion = useRef(false);
  const userId = user?.id ?? null;

  const ownsWorkspace = hasOwnWorkspace(allWorkspaces);

  // Relê o plano da conta; o servidor grava-o depois de receber o pagamento.
  const readAccountPlan = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("subscription_plan, subscription_status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return false;
    if (!hasActivePaidPlan(data.subscription_status)) return false;
    setPlan(data.subscription_plan ?? null);
    return true;
  }, [userId]);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setPhase("checking");
    waitForPlanConfirmation({
      check: readAccountPlan,
      isCancelled: () => cancelled,
    }).then((confirmed) => {
      if (!cancelled) setPhase(confirmed ? "confirmed" : "pending");
    });
    return () => {
      cancelled = true;
    };
  }, [userId, readAccountPlan, attempt]);

  // Conversão registada uma única vez, só depois de o plano estar confirmado
  useEffect(() => {
    if (phase === "confirmed" && plan && !hasTrackedConversion.current) {
      trackCheckoutSuccess(plan);
      hasTrackedConversion.current = true;
    }
  }, [phase, plan]);

  // Redireciona sozinho só quando já existe workspace próprio para onde ir
  const autoRedirect = phase === "confirmed" && ownsWorkspace;
  useEffect(() => {
    if (!autoRedirect) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRedirect]);

  useEffect(() => {
    if (autoRedirect && countdown === 0) goTo(APP_PATH);
  }, [autoRedirect, countdown]);

  if (phase === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">A confirmar o pagamento...</p>
        </div>
      </div>
    );
  }

  if (phase === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-xl">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2" role="status" aria-live="polite">
              <h1 className="text-2xl font-bold">Pagamento recebido</h1>
              <p className="text-muted-foreground">
                Pagamento recebido; a ativação pode demorar alguns instantes.
              </p>
            </div>
            <Button onClick={() => setAttempt((n) => n + 1)} className="w-full gap-2" size="lg">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planLabel = getAccountPlanLabel(plan);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/20 shadow-xl">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative mx-auto w-20 h-20"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-primary rounded-full w-20 h-20 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-primary-foreground" />
              </div>
            </motion.div>

            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold"
              >
                Subscrição Ativada!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                {planLabel ? (
                  <>
                    Bem-vindo ao plano{" "}
                    <span className="font-semibold text-primary">{planLabel}</span>
                  </>
                ) : (
                  "O plano da sua conta está ativo."
                )}
              </motion.p>
            </div>

            {!ownsWorkspace && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground"
              >
                O plano pertence à sua conta. Falta criar o seu workspace para começar a usá-lo.
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              {ownsWorkspace ? (
                <>
                  <Button onClick={() => goTo(APP_PATH)} className="w-full gap-2" size="lg">
                    Começar a usar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Redirecionando automaticamente em {countdown}s...
                  </p>
                </>
              ) : (
                <>
                  <Button onClick={() => goTo(CREATE_WORKSPACE_PATH)} className="w-full gap-2" size="lg">
                    Criar o meu workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {allWorkspaces.length > 0 && (
                    <Button variant="ghost" onClick={() => goTo(APP_PATH)} className="w-full">
                      Ir para a aplicação
                    </Button>
                  )}
                </>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccess;
