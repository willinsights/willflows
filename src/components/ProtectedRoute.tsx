import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FullPageLoader } from '@/components/layout/FullPageLoader';
import { useState, useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes that are always accessible even with expired trial
const ALWAYS_ACCESSIBLE_ROUTES = [
  '/app/conta',
  '/app/configuracoes',
];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading, subscription } = useAuth();
  const { allWorkspaces, loading: workspaceLoading, currentWorkspace, fetchError } = useWorkspace();
  const location = useLocation();
  
  // State to ensure initial data load is complete before any navigation decisions
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Only mark initial check as done when ALL loading is complete
  useEffect(() => {
    if (!authLoading && !workspaceLoading && !subscription.loading) {
      // Small delay to ensure state is fully propagated
      const timer = setTimeout(() => {
        setInitialCheckDone(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [authLoading, workspaceLoading, subscription.loading]);

  // Show branded loading while checking auth
  if (authLoading) {
    return <FullPageLoader />;
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // IMPORTANT: Wait for ALL data to fully load before making any navigation decisions
  // This prevents the flash of onboarding page when user has workspaces
  if (workspaceLoading || subscription.loading || !initialCheckDone) {
    return <FullPageLoader />;
  }

  // Don't redirect to onboarding if there was a fetch error (network issues)
  // Only redirect if we successfully fetched and found no workspaces
  // IMPORTANT: If user has ANY workspace (admin or member), don't redirect to onboarding
  const hasAnyWorkspace = allWorkspaces.length > 0 || currentWorkspace !== null;
  
  if (!fetchError && !hasAnyWorkspace && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding with ?new=true requires being admin of at least one workspace
  // OR having no workspaces at all (first time user)
  if (location.pathname === '/onboarding') {
    const isCreatingNew = new URLSearchParams(location.search).get('new') === 'true';
    const hasAdminWorkspace = allWorkspaces.some(w => w.role === 'admin');
    
    // If creating new and user has no admin workspaces but has member workspaces,
    // they shouldn't be here - redirect to app
    if (isCreatingNew && !hasAdminWorkspace && allWorkspaces.length > 0) {
      return <Navigate to="/app" replace />;
    }
  }

  // Check if trial expired - allow access to account/settings pages
  // The TrialExpiredModal in AppLayout will handle blocking the UI
  // This allows users to navigate to account page to upgrade
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );

  // If trial expired and trying to access restricted route, still render
  // The modal will block interaction - but we could also redirect here if needed
  // For now, we let the modal handle it to preserve URL

  return <>{children}</>;
}
