import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { AppBreadcrumbs } from './AppBreadcrumbs';
import { MobileAppLayout } from './MobileAppLayout';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useExportNotifications } from '@/hooks/useExportNotifications';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useGlobalBadge } from '@/hooks/useGlobalBadge';
import { HideValuesProvider } from '@/contexts/HideValuesContext';

const RETRY_COOLDOWN_MS = 5000; // 5 seconds cooldown between retries

type ClickDebugInfo = {
  route: string;
  tag?: string;
  id?: string;
  className?: string;
  zIndex?: string;
  position?: string;
  pointerEvents?: string;
};

export function AppLayout() {
  const isMobile = useIsMobile();

  // Wrap both layouts with HideValuesProvider for shared state
  return (
    <HideValuesProvider>
      {isMobile ? <MobileAppLayout /> : <DesktopAppLayout />}
    </HideValuesProvider>
  );
}

function DesktopAppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCooldown, setRetryCooldown] = useState(false);
  const { fetchError, refreshWorkspaces } = useWorkspace();
  const { isWorkspaceExpired } = useWorkspaceSubscription();
  const { isSuperAdmin } = useSuperAdmin();

  // Show expired modal for ALL users when workspace is expired (not just owners)
  // NEVER show for Super Admins
  const showExpiredModal = isWorkspaceExpired && !isSuperAdmin;

  // Hook to show trial warning notification when 2 days or less remain
  useTrialWarning();

  // Enable global chat notifications (sound + push)
  useChatNotifications();
  
  // Enable realtime notifications for projects, tasks, and events
  useRealtimeNotifications();

  // Enable push notifications for export completions
  useExportNotifications();

  // Enable PWA badge for unread notifications
  useGlobalBadge();

  // User preferences for sidebar behavior
  const { preferences } = useUserPreferences();

  const lastRetryTimeRef = useRef(0);

  // Debug opt-in via query param ?debug=1 (apenas em DEV)
  const debugEnabled = import.meta.env.DEV && new URLSearchParams(window.location.search).get('debug') === '1';

  const [clickDebug, setClickDebug] = useState<ClickDebugInfo | null>(null);
  const [debugPanelOpen, setDebugPanelOpen] = useState(true);

  useEffect(() => {
    if (!debugEnabled) return;

    const handler = (event: PointerEvent) => {
      const elAtPoint = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const cs = elAtPoint ? window.getComputedStyle(elAtPoint) : null;

      setClickDebug({
        route: window.location.pathname,
        tag: elAtPoint?.tagName,
        id: elAtPoint?.id,
        className: typeof elAtPoint?.className === 'string' ? elAtPoint.className : undefined,
        zIndex: cs?.zIndex,
        position: cs?.position,
        pointerEvents: cs?.pointerEvents,
      });
    };

    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [debugEnabled]);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const handleRetry = async () => {
    // Enforce cooldown
    const now = Date.now();
    if (now - lastRetryTimeRef.current < RETRY_COOLDOWN_MS) {
      return;
    }

    lastRetryTimeRef.current = now;
    setIsRetrying(true);
    setRetryCooldown(true);

    await refreshWorkspaces();

    setIsRetrying(false);

    // Reset cooldown after delay
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
    <div className="flex h-screen w-full overflow-hidden relative bg-[#f4f4f6] dark:bg-background">
      {/* Premium Background Effects - Purple gradient with blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Large purple gradient spot - top right */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 dark:bg-primary/20 rounded-full blur-[150px] translate-x-1/4 -translate-y-1/4" />
        
        {/* Secondary purple spot - bottom left */}
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/[0.03] dark:bg-primary/15 rounded-full blur-[120px] -translate-x-1/4 translate-y-1/4" />
        
        {/* Third purple spot - center for depth */}
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-primary/[0.02] dark:bg-primary/25 rounded-full blur-[100px]" />
      </div>

      {debugEnabled && debugPanelOpen && (
        <div className="fixed bottom-4 left-4 z-[200] w-[340px] rounded-lg border bg-card text-card-foreground shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-xs font-semibold">Debug cliques (debug=1)</div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDebugPanelOpen(false)}
              type="button"
              aria-label="Fechar debug"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-3 py-2 text-xs">
            <div className="text-muted-foreground">Clique num item do menu e veja qual elemento está por cima.</div>
            <div className="mt-2 space-y-1">
              <div><span className="text-muted-foreground">Rota:</span> {clickDebug?.route ?? '-'}</div>
              <div><span className="text-muted-foreground">Elemento:</span> {clickDebug?.tag ?? '-'}{clickDebug?.id ? `#${clickDebug.id}` : ''}</div>
              <div className="truncate"><span className="text-muted-foreground">Class:</span> {clickDebug?.className ?? '-'}</div>
              <div className="grid grid-cols-3 gap-2">
                <div><span className="text-muted-foreground">z:</span> {clickDebug?.zIndex ?? '-'}</div>
                <div><span className="text-muted-foreground">pos:</span> {clickDebug?.position ?? '-'}</div>
                <div><span className="text-muted-foreground">pe:</span> {clickDebug?.pointerEvents ?? '-'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      <AnimatePresence mode="wait">
        {fetchError && (
          <motion.div
            initial={{ opacity: 0, y: -56, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -56, scale: 0.98 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 30,
              mass: 0.8
            }}
            className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-3 shadow-lg"
          >
            <div className="container mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Erro de conexão. Por favor, verifique a sua ligação à internet.
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying || retryCooldown}
                className="shrink-0"
              >
                {isRetrying ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {retryCooldown && !isRetrying ? 'Aguarde...' : 'Tentar novamente'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden md:flex flex-col border-r border-sidebar-border bg-sidebar"
      >
        <AppSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={toggleSidebar}
          autoCollapseOnNav={preferences?.sidebar_auto_collapse ?? (localStorage.getItem('pref-sidebar-auto-collapse') !== 'false')}
        />
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader 
          onMenuClick={toggleSidebar} 
          sidebarCollapsed={sidebarCollapsed}
        />
        
        <main className={`flex-1 overflow-auto ${fetchError ? 'pt-14' : ''}`}>
          <div className="h-full">
            {/* Breadcrumbs - positioned at top of content */}
            <div className="px-6 pt-4 pb-2">
              <AppBreadcrumbs />
            </div>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Workspace Expired Modal - Shows for ALL users when workspace is expired */}
      <WorkspaceExpiredModal open={showExpiredModal} />

      {/* Feedback Button - Bottom right corner */}
      <FeedbackButton />
    </div>
  );
}
