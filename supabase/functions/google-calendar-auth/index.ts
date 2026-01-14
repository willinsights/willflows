import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper function to get user from auth header
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  
  // Create a client with the user's token to validate it
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  
  if (error) {
    console.error('Auth error:', error.message);
    return null;
  }
  
  return user;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const authHeader = req.headers.get('Authorization');

    // Create admin client for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Action: Handle OAuth callback (no auth required)
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        return new Response(`<html><body><script>window.close();</script>Erro: ${error}</body></html>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (!code || !state) {
        return new Response('<html><body>Missing code or state</body></html>', {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Decode state
      let stateData;
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        return new Response('<html><body>Invalid state</body></html>', {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      const { userId, workspaceId, redirectUri } = stateData;

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      console.log('Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        console.error('Token error:', tokens);
        return new Response(`<html><body>Erro ao obter tokens: ${tokens.error_description || tokens.error}</body></html>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Upsert connection
      const { error: upsertError } = await supabaseAdmin
        .from('google_calendar_connections')
        .upsert({
          user_id: userId,
          workspace_id: workspaceId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          is_connected: true,
          sync_error: null,
        }, {
          onConflict: 'user_id,workspace_id',
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return new Response(`<html><body>Erro ao guardar conexão: ${upsertError.message}</body></html>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Redirect back to app
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${redirectUri}?google_connected=true`,
        },
      });
    }

    // All other actions require authentication
    const user = await getUserFromToken(authHeader);
    
    if (!user) {
      console.log('No valid user found for action:', action);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Get OAuth URL
    if (action === 'authorize') {
      const { workspaceId, redirectUri } = await req.json();
      
      if (!workspaceId || !redirectUri) {
        return new Response(JSON.stringify({ error: 'Missing workspaceId or redirectUri' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build state with user info
      const state = btoa(JSON.stringify({
        userId: user.id,
        workspaceId,
        redirectUri,
      }));

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ].join(' ');

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', scopes);
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');
      oauthUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ url: oauthUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Disconnect
    if (action === 'disconnect') {
      const { workspaceId } = await req.json();

      // Get connection to revoke token
      const { data: connection } = await supabaseAdmin
        .from('google_calendar_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .single();

      if (connection?.access_token) {
        // Revoke token
        await fetch(`https://oauth2.googleapis.com/revoke?token=${connection.access_token}`, {
          method: 'POST',
        });
      }

      // Delete connection
      const { error: deleteError } = await supabaseAdmin
        .from('google_calendar_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Get connection status
    if (action === 'status') {
      const { workspaceId } = await req.json();

      const { data: connection } = await supabaseAdmin
        .from('google_calendar_connections')
        .select('id, is_connected, sync_shoots, sync_deliveries, sync_meetings, sync_events, import_from_google, last_sync_at, sync_error')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .single();

      return new Response(JSON.stringify({ connection }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Update preferences
    if (action === 'update-preferences') {
      const { workspaceId, preferences } = await req.json();

      const { error: updateError } = await supabaseAdmin
        .from('google_calendar_connections')
        .update({
          sync_shoots: preferences.sync_shoots,
          sync_deliveries: preferences.sync_deliveries,
          sync_meetings: preferences.sync_meetings,
          sync_events: preferences.sync_events,
          import_from_google: preferences.import_from_google,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
