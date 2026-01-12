import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface BetaInvite {
  id: string;
  token: string;
  email: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
}

export function useBetaInvite(token: string | null) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [invite, setInvite] = useState<BetaInvite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsValid(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: queryError } = await supabase
          .from('beta_invite_tokens')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (queryError) {
          logger.error('Error verifying beta token:', queryError);
          setError('Erro ao verificar convite');
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        if (!data) {
          setError('Convite inválido ou não encontrado');
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        // Check if already used
        if (data.used_by) {
          setError('Este convite já foi utilizado');
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('Este convite expirou');
          setIsValid(false);
          setIsLoading(false);
          return;
        }

        setInvite(data as BetaInvite);
        setIsValid(true);
        setIsLoading(false);
      } catch (err) {
        logger.error('Error verifying beta token:', err);
        setError('Erro ao verificar convite');
        setIsValid(false);
        setIsLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const markAsUsed = async (userId: string) => {
    if (!token) return { error: 'No token' };

    const { error: updateError } = await supabase
      .from('beta_invite_tokens')
      .update({ 
        used_by: userId, 
        used_at: new Date().toISOString() 
      })
      .eq('token', token);

    if (updateError) {
      logger.error('Error marking invite as used:', updateError);
      return { error: updateError.message };
    }

    return { error: null };
  };

  return { isValid, invite, isLoading, error, markAsUsed };
}
