import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FullPageLoader } from '@/components/layout/FullPageLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { allWorkspaces, loading: workspaceLoading, currentWorkspace, fetchError } = useWorkspace();
  const location = useLocation();

  // Show branded loading while checking auth
  if (authLoading) {
    return <FullPageLoader />;
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // IMPORTANT: Wait for workspace data to fully load before making any navigation decisions
  // This prevents the flash of onboarding page when user has workspaces
  if (workspaceLoading) {
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

  return <>{children}</>;
}
