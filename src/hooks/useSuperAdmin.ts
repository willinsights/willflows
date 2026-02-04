import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Fallback allowlist for primary system admins (prevents UI gates from breaking if RPC is slow/fails)
const SUPER_ADMIN_EMAILS = ['geral@willflow.app'];

export function useSuperAdmin() {
  const { user } = useAuth();

  const { data: isSuperAdmin = false, isLoading: loading } = useQuery({
    queryKey: ['super-admin-status', user?.id],
    queryFn: async () => {
      if (!user) return false;

      // Fast-path for known system admins
      const email = (user.email || '').toLowerCase();
      if (email && SUPER_ADMIN_EMAILS.includes(email)) {
        return true;
      }

      try {
        const { data, error } = await supabase.rpc('is_system_admin');
        
        if (error) {
          console.error('Error checking super admin status:', error);
          return false;
        }
        
        return data === true;
      } catch (err) {
        console.error('Error checking super admin status:', err);
        return false;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes - avoid duplicate RPC calls
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  return { isSuperAdmin, loading };
}
