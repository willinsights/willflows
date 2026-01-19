import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { logger } from '@/lib/logger';

interface PresenceState {
  user_id: string;
  online_at: string;
}

export function usePresence() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [isConnected, setIsConnected] = useState(false);

  const isOnline = useCallback((userId: string) => {
    return !!onlineUsers[userId];
  }, [onlineUsers]);

  useEffect(() => {
    if (!currentWorkspace?.id || !user?.id) {
      setOnlineUsers({});
      setIsConnected(false);
      return;
    }

    const channelName = `workspace-presence:${currentWorkspace.id}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const online: Record<string, boolean> = {};
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.user_id) {
              online[presence.user_id] = true;
            }
          });
        });
        
        setOnlineUsers(online);
        logger.debug('[Presence] Sync:', Object.keys(online).length, 'users online');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.debug('[Presence] Join:', key, newPresences);
        setOnlineUsers((prev) => {
          const updated = { ...prev };
          newPresences.forEach((p) => {
            const userId = (p as unknown as PresenceState).user_id;
            if (userId) updated[userId] = true;
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.debug('[Presence] Leave:', key, leftPresences);
        setOnlineUsers((prev) => {
          const updated = { ...prev };
          leftPresences.forEach((p) => {
            const userId = (p as unknown as PresenceState).user_id;
            if (userId) delete updated[userId];
          });
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Track this user's presence
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
          logger.debug('[Presence] Tracking user:', user.id);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    // Update presence periodically (heartbeat)
    const heartbeatInterval = setInterval(() => {
      if (channel && isConnected) {
        channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, user?.id]);

  return { 
    onlineUsers, 
    isOnline, 
    isConnected,
    onlineCount: Object.keys(onlineUsers).length,
  };
}
