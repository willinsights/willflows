import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// Fast-path allowlist for known system admins
const SUPER_ADMIN_EMAILS = ['geral@willflow.app'];

interface AdminSession {
  user: User | null;
  session: Session | null;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useAdminSession() {
  const [state, setState] = useState<AdminSession>({
    user: null,
    session: null,
    isSuperAdmin: false,
    loading: true,
    error: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          if (mounted) {
            setState(prev => ({ ...prev, loading: false, error: sessionError.message }));
          }
          return;
        }

        if (!session) {
          if (mounted) {
            setState(prev => ({ ...prev, loading: false }));
          }
          return;
        }

        // Fast-path for known system admins - skip RPC call
        const email = (session.user.email || '').toLowerCase();
        if (SUPER_ADMIN_EMAILS.includes(email)) {
          if (mounted) {
            setState({
              user: session.user,
              session,
              isSuperAdmin: true,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // Only call RPC if not in fast-path
        const { data: isAdmin, error: adminError } = await supabase.rpc('is_system_admin');
        
        if (adminError) {
          if (mounted) {
            setState({
              user: session.user,
              session,
              isSuperAdmin: false,
              loading: false,
              error: 'Erro ao verificar permissões',
            });
          }
          return;
        }

        if (mounted) {
          setState({
            user: session.user,
            session,
            isSuperAdmin: !!isAdmin,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Erro ao verificar sessão' 
          }));
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setState({
            user: null,
            session: null,
            isSuperAdmin: false,
            loading: false,
            error: null,
          });
        }
        navigate('/admin');
      } else if (session) {
        // Fast-path check on auth state change
        const email = (session.user.email || '').toLowerCase();
        if (SUPER_ADMIN_EMAILS.includes(email)) {
          if (mounted) {
            setState({
              user: session.user,
              session,
              isSuperAdmin: true,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // Re-check admin status on session change
        const { data: isAdmin } = await supabase.rpc('is_system_admin');
        if (mounted) {
          setState({
            user: session.user,
            session,
            isSuperAdmin: !!isAdmin,
            loading: false,
            error: null,
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Credenciais inválidas' 
      }));
      return { success: false, error: error.message };
    }

    // Fast-path for known admins
    const userEmail = (data.user?.email || '').toLowerCase();
    if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
      setState({
        user: data.user,
        session: data.session,
        isSuperAdmin: true,
        loading: false,
        error: null,
      });
      return { success: true };
    }

    // Check if user is super admin via RPC
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_system_admin');

    if (adminError || !isAdmin) {
      await supabase.auth.signOut();
      setState({
        user: null,
        session: null,
        isSuperAdmin: false,
        loading: false,
        error: 'Acesso restrito a administradores',
      });
      return { success: false, error: 'Acesso restrito a administradores' };
    }

    setState({
      user: data.user,
      session: data.session,
      isSuperAdmin: true,
      loading: false,
      error: null,
    });

    return { success: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      isSuperAdmin: false,
      loading: false,
      error: null,
    });
    navigate('/admin');
  };

  return {
    ...state,
    signIn,
    signOut,
  };
}
