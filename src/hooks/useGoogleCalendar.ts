import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

const AUTO_SYNC_INTERVAL_MS = 60000; // 1 minute

export interface GoogleCalendarConnection {
  id: string;
  is_connected: boolean;
  sync_shoots: boolean;
  sync_deliveries: boolean;
  sync_meetings: boolean;
  sync_events: boolean;
  import_from_google: boolean;
  last_sync_at: string | null;
  sync_error: string | null;
}

export interface SyncPreferences {
  sync_shoots: boolean;
  sync_deliveries: boolean;
  sync_meetings: boolean;
  sync_events: boolean;
  import_from_google: boolean;
}

export function useGoogleCalendar() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const autoSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoSyncingRef = useRef(false);

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ workspaceId: currentWorkspace.id }),
        }
      );

      const data = await response.json();

      if (data?.connection) {
        setConnection(data.connection);
      } else {
        setConnection(null);
      }
    } catch (error) {
      console.error('Failed to fetch Google Calendar status:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Check for callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      toast({
        title: 'Google Calendar conectado!',
        description: 'A sua conta está agora sincronizada.',
      });
      // Remove query param
      window.history.replaceState({}, '', window.location.pathname);
      fetchStatus();
    }
  }, [toast, fetchStatus]);

  // Start OAuth flow
  const connect = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Erro',
          description: 'Por favor faça login primeiro.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=authorize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            redirectUri: window.location.origin + window.location.pathname,
          }),
        }
      );

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to get OAuth URL');
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [currentWorkspace?.id, toast]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=disconnect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ workspaceId: currentWorkspace.id }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setConnection(null);
        toast({
          title: 'Desconectado',
          description: 'Google Calendar foi desconectado.',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [currentWorkspace?.id, toast]);

  // Update preferences
  const updatePreferences = useCallback(async (preferences: Partial<SyncPreferences>) => {
    if (!currentWorkspace?.id || !connection) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const newPrefs = {
        sync_shoots: preferences.sync_shoots ?? connection.sync_shoots,
        sync_deliveries: preferences.sync_deliveries ?? connection.sync_deliveries,
        sync_meetings: preferences.sync_meetings ?? connection.sync_meetings,
        sync_events: preferences.sync_events ?? connection.sync_events,
        import_from_google: preferences.import_from_google ?? connection.import_from_google,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=update-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            preferences: newPrefs,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setConnection(prev => prev ? { ...prev, ...newPrefs } : null);
        toast({
          title: 'Preferências atualizadas',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [currentWorkspace?.id, connection, toast]);

  // Silent sync for auto-sync (no toasts)
  const silentSync = useCallback(async () => {
    if (!currentWorkspace?.id || !connection?.is_connected) return;
    if (isAutoSyncingRef.current) return; // Prevent overlapping syncs

    isAutoSyncingRef.current = true;
    console.log('[Auto-sync] Starting periodic sync...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        isAutoSyncingRef.current = false;
        return;
      }

      // Export WillFlow → Google Calendar
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'sync',
            workspaceId: currentWorkspace.id,
          }),
        }
      );

      // Import Google Calendar → WillFlow (if enabled)
      if (connection.import_from_google) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              action: 'import',
              workspaceId: currentWorkspace.id,
            }),
          }
        );
      }

      console.log('[Auto-sync] Completed successfully');
      
      // Update last_sync_at silently
      fetchStatus();
    } catch (error) {
      console.error('[Auto-sync] Failed:', error);
    } finally {
      isAutoSyncingRef.current = false;
    }
  }, [currentWorkspace?.id, connection?.is_connected, connection?.import_from_google, fetchStatus]);

  // Auto-sync interval - runs every minute when connected
  useEffect(() => {
    // Clear any existing interval
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
    }

    // Only start auto-sync if connected
    if (connection?.is_connected) {
      console.log('[Auto-sync] Starting interval (every 1 minute)');
      
      // Run immediately on mount/connection
      silentSync();
      
      // Then run every minute
      autoSyncIntervalRef.current = setInterval(() => {
        silentSync();
      }, AUTO_SYNC_INTERVAL_MS);
    }

    return () => {
      if (autoSyncIntervalRef.current) {
        console.log('[Auto-sync] Stopping interval');
        clearInterval(autoSyncIntervalRef.current);
        autoSyncIntervalRef.current = null;
      }
    };
  }, [connection?.is_connected, silentSync]);

  // Trigger sync (bidirectional) - manual with toasts
  const sync = useCallback(async () => {
    if (!currentWorkspace?.id || !connection?.is_connected) return;

    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Step 1: Export WillFlow → Google Calendar
      const exportResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'sync',
            workspaceId: currentWorkspace.id,
          }),
        }
      );

      const exportData = await exportResponse.json();
      let exportedCount = exportData.synced || 0;
      let exportErrors = exportData.errors?.length || 0;

      // Step 2: Import Google Calendar → WillFlow (if enabled)
      let importedCount = 0;
      let updatedCount = 0;
      let importErrors = 0;

      if (connection.import_from_google) {
        const importResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              action: 'import',
              workspaceId: currentWorkspace.id,
            }),
          }
        );

        const importData = await importResponse.json();
        importedCount = importData.imported || 0;
        updatedCount = importData.updated || 0;
        importErrors = importData.errors?.length || 0;
      }

      // Build summary message
      const parts: string[] = [];
      if (exportedCount > 0) parts.push(`${exportedCount} exportados`);
      if (importedCount > 0) parts.push(`${importedCount} importados`);
      if (updatedCount > 0) parts.push(`${updatedCount} atualizados`);
      
      const totalErrors = exportErrors + importErrors;
      if (totalErrors > 0) parts.push(`${totalErrors} erros`);
      
      const description = parts.length > 0 ? parts.join(', ') : 'Nenhum evento para sincronizar';

      toast({
        title: 'Sincronização concluída',
        description,
      });
      
      fetchStatus();
    } catch (error: any) {
      toast({
        title: 'Erro ao sincronizar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  }, [currentWorkspace?.id, connection?.is_connected, connection?.import_from_google, toast, fetchStatus]);

  return {
    connection,
    loading,
    syncing,
    connect,
    disconnect,
    updatePreferences,
    sync,
    refresh: fetchStatus,
  };
}
