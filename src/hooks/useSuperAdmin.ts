import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
export function useSuperAdmin() {
  const { user } = useAuth();

  const { data: isSuperAdmin = false, isLoading: loading } = useQuery({
    queryKey: ['super-admin-status', user?.id],
    queryFn: async () => {
      if (!user) return false;

      try {
        const { data, error } = await supabase.rpc('is_system_admin');
        
        if (error) {
          logger.error('Error checking super admin status:', error);
          return false;
        }
        
        return data === true;
      } catch (err) {
        logger.error('Error checking super admin status:', err);
        return false;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes - avoid duplicate RPC calls
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  return { isSuperAdmin, loading };
}
