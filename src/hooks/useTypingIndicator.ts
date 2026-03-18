import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingUser {
  user_id: string;
  full_name: string;
}

export function useTypingIndicator(conversationId: string | undefined) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const channelRef = useRef<ReturnType<typeof supabase.channel>>();

  // Broadcast typing status
  const setTyping = useCallback((isTyping: boolean, fullName?: string) => {
    if (!conversationId || !user?.id || !channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { 
        user_id: user.id, 
        full_name: fullName || 'Utilizador',
        is_typing: isTyping 
      }
    });
  }, [conversationId, user?.id]);

  // Start typing (with auto-stop after 3 seconds)
  const startTyping = useCallback((fullName?: string) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    setTyping(true, fullName);
    
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping(false);
  }, [setTyping]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`typing:${conversationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id === user?.id) return; // Ignore self
        
        if (payload.is_typing) {
          setTypingUsers(prev => {
            const exists = prev.some(u => u.user_id === payload.user_id);
            if (exists) return prev;
            return [...prev, { user_id: payload.user_id, full_name: payload.full_name }];
          });
          
          // Auto-remove after 4 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_id !== payload.user_id));
          }, 4000);
        } else {
          setTypingUsers(prev => prev.filter(u => u.user_id !== payload.user_id));
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  return { typingUsers, startTyping, stopTyping };
}
