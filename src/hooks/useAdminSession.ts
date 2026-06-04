import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

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

        // Always verify admin status against the authoritative system_admins table
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

    // Always check admin status via DB
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
