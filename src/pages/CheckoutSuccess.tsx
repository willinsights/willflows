import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { trackCheckoutSuccess } from "@/lib/google-ads";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const { subscription, refresh, loading: subscriptionLoading } = useUserSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const hasTrackedConversion = useRef(false);

  useEffect(() => {
    const verifySubscription = async () => {
      await refresh();
      // Small delay to ensure data is loaded
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    };
    verifySubscription();
  }, [refresh]);

  // Track conversion once subscription is loaded
  useEffect(() => {
    if (!isLoading && subscription?.plan && !hasTrackedConversion.current) {
      trackCheckoutSuccess(subscription.plan);
      hasTrackedConversion.current = true;
    }
  }, [isLoading, subscription?.plan]);

  useEffect(() => {
    if (!isLoading) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/app");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLoading, navigate]);

  const getPlanDisplayName = (plan: string | null) => {
    switch (plan) {
      case "starter":
        return "Starter";
      case "pro":
        return "Pro";
      case "studio":
        return "Studio";
      default:
        return "Premium";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">A verificar subscrição...</p>
        </div>
      </div>
    );
  }

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
                Bem-vindo ao plano{" "}
                <span className="font-semibold text-primary">
                  {getPlanDisplayName(subscription?.plan || null)}
                </span>
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-muted/50 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>O seu trial de 30 dias começou</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Explore todas as funcionalidades premium. Será cobrado
                automaticamente após o período de trial.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <Button
                onClick={() => navigate("/app")}
                className="w-full gap-2"
                size="lg"
              >
                Começar a usar
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">
                Redirecionando automaticamente em {countdown}s...
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccess;
