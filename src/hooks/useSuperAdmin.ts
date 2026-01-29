import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fallback allowlist for primary system admins (prevents UI gates from breaking if RPC is slow/fails)
  const SUPER_ADMIN_EMAILS = ['geral@willflow.app'];

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      // Fast-path for known system admins
      const email = (user.email || '').toLowerCase();
      if (email && SUPER_ADMIN_EMAILS.includes(email)) {
        setIsSuperAdmin(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_system_admin');
        
        if (error) {
          console.error('Error checking super admin status:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data === true);
        }
      } catch (err) {
        console.error('Error checking super admin status:', err);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, [user]);

  return { isSuperAdmin, loading };
}
