import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const isMobile = useIsMobile();
  const { fetchError, refreshWorkspaces } = useWorkspace();

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await refreshWorkspaces();
    setIsRetrying(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
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
                disabled={isRetrying}
                className="shrink-0"
              >
                {isRetrying ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Tentar novamente
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 72 : 260 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="hidden md:flex flex-col border-r border-sidebar-border bg-sidebar"
        >
          <AppSidebar 
            collapsed={sidebarCollapsed} 
            onToggle={toggleSidebar}
          />
        </motion.aside>
      )}

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col border-r border-sidebar-border bg-sidebar"
            >
              <AppSidebar 
                collapsed={false} 
                onToggle={() => setMobileSidebarOpen(false)}
                isMobile
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader 
          onMenuClick={toggleSidebar} 
          sidebarCollapsed={sidebarCollapsed}
        />
        
        <main className={`flex-1 overflow-auto ${fetchError ? 'pt-14' : ''}`}>
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
