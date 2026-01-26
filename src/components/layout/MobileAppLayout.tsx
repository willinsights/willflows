import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileAppHeader } from './MobileAppHeader';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceSubscription } from '@/hooks/useWorkspaceSubscription';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { WorkspaceExpiredModal } from '@/components/subscription/WorkspaceExpiredModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTrialWarning } from '@/hooks/useTrialWarning';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useRef, useState } from 'react';

const RETRY_COOLDOWN_MS = 5000;

export function MobileAppLayout() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCooldown, setRetryCooldown] = useState(false);
  const { fetchError, refreshWorkspaces } = useWorkspace();
  const { isWorkspaceExpired } = useWorkspaceSubscription();
  const { isSuperAdmin } = useSuperAdmin();
  const lastRetryTimeRef = useRef(0);

  const showExpiredModal = isWorkspaceExpired && !isSuperAdmin;

  useTrialWarning();
  useChatNotifications();

  const handleRetry = async () => {
    const now = Date.now();
    if (now - lastRetryTimeRef.current < RETRY_COOLDOWN_MS) {
      return;
    }

    lastRetryTimeRef.current = now;
    setIsRetrying(true);
    setRetryCooldown(true);

    await refreshWorkspaces();

    setIsRetrying(false);

    setTimeout(() => {
      setRetryCooldown(false);
    }, RETRY_COOLDOWN_MS);

    if (!fetchError) {
      toast({
        title: 'Conexão restabelecida',
        description: 'A ligação ao servidor foi restaurada com sucesso.',
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f4f4f6] dark:bg-background">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 dark:bg-primary/20 rounded-full blur-[100px] translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/[0.03] dark:bg-primary/15 rounded-full blur-[80px] -translate-x-1/4 translate-y-1/4" />
      </div>

      {/* Error Banner */}
      <AnimatePresence mode="wait">
        {fetchError && (
          <motion.div
            initial={{ opacity: 0, y: -56 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -56 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium truncate">
                  Erro de conexão
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying || retryCooldown}
                className="shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <MobileAppHeader />

      {/* Main Content with bottom padding for nav bar */}
      <main className={`flex-1 overflow-auto pb-20 ${fetchError ? 'pt-14' : ''}`}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Workspace Expired Modal */}
      <WorkspaceExpiredModal open={showExpiredModal} />

      {/* Feedback Button - positioned above bottom nav */}
      <div className="fixed bottom-20 right-4 z-40">
        <FeedbackButton />
      </div>
    </div>
  );
}
