import { useWorkspace } from '@/contexts/WorkspaceContext';

// Re-export the type for backward compatibility
export interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  role: string;
  logo_url?: string | null;
}

// This hook now just wraps useWorkspace for backward compatibility
export function useUserWorkspaces() {
  const { allWorkspaces, loading, refreshWorkspace } = useWorkspace();

  // Map to the expected format
  const workspaces: UserWorkspace[] = allWorkspaces.map(w => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    subscription_plan: w.subscription_plan,
    role: w.role,
    logo_url: w.logo_url,
  }));

  return { workspaces, loading, refresh: refreshWorkspace };
}
