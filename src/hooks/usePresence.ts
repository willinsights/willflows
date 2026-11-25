import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface PresenceState {
  user_id: string;
  online_at: string;
}

type PresenceSnapshot = { onlineUsers: Record<string, boolean>; isConnected: boolean };
type PresenceListener = (snapshot: PresenceSnapshot) => void;
interface PresenceSession {
  listeners: Set<PresenceListener>;
  snapshot: PresenceSnapshot;
  channel: ReturnType<typeof supabase.channel>;
  heartbeat?: ReturnType<typeof setInterval>;
  teardown?: ReturnType<typeof setTimeout>;
  closing?: Promise<unknown>;
}

// Presence topics must stay shared across users. Subscribe once per local
// workspace/user, rather than giving each panel a different presence room.
const sessions = new Map<string, PresenceSession>();

function observePresence(workspaceId: string, userId: string, listener: PresenceListener) {
  const key = `${workspaceId}:${userId}`;
  let session = sessions.get(key);
  if (session?.closing) {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void session.closing.then(() => {
      if (!cancelled) cleanup = observePresence(workspaceId, userId, listener);
    });
    return () => { cancelled = true; cleanup?.(); };
  }
  if (!session) {
    const channel = supabase.channel(`workspace-presence:${workspaceId}`, {
      config: { presence: { key: userId } },
    });
    session = { channel, listeners: new Set(), snapshot: { onlineUsers: {}, isConnected: false } };
    const shared = session;
    sessions.set(key, shared);
    const publish = () => shared.listeners.forEach(callback => callback(shared.snapshot));
    const track = () => channel.track({ user_id: userId, online_at: new Date().toISOString() });
    channel.on('presence', { event: 'sync' }, () => {
      const onlineUsers: Record<string, boolean> = {};
      Object.values(channel.presenceState<PresenceState>()).forEach(presences => {
        presences.forEach(presence => { if (presence.user_id) onlineUsers[presence.user_id] = true; });
      });
      shared.snapshot = { ...shared.snapshot, onlineUsers };
      publish();
    }).subscribe(async status => {
      shared.snapshot = { ...shared.snapshot, isConnected: status === 'SUBSCRIBED' };
      publish();
      if (status === 'SUBSCRIBED') await track();
    });
    shared.heartbeat = setInterval(() => {
      if (shared.snapshot.isConnected) void track();
    }, 30000);
  }
  const shared = session;
  if (shared.teardown) clearTimeout(shared.teardown);
  shared.listeners.add(listener);
  listener(shared.snapshot);
  return () => {
    shared.listeners.delete(listener);
    if (shared.listeners.size) return;
    shared.teardown = setTimeout(() => {
      if (shared.listeners.size) return;
      clearInterval(shared.heartbeat);
      shared.closing = supabase.removeChannel(shared.channel).finally(() => sessions.delete(key));
    }, 0);
  };
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

    setOnlineUsers({});
    setIsConnected(false);
    return observePresence(currentWorkspace.id, user.id, snapshot => {
      setOnlineUsers(snapshot.onlineUsers);
      setIsConnected(snapshot.isConnected);
    });
  }, [currentWorkspace?.id, user?.id]);

  return { 
    onlineUsers, 
    isOnline, 
    isConnected,
    onlineCount: Object.keys(onlineUsers).length,
  };
}
