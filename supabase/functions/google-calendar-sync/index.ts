import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Refresh access token if expired
async function refreshTokenIfNeeded(connection: any, supabaseAdmin: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  
  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

  console.log('Refreshing access token...');
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${tokens.error_description || tokens.error}`);
  }

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from('google_calendar_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt,
    })
    .eq('id', connection.id);

  return tokens.access_token;
}

// Create or update Google Calendar event
async function upsertGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: {
    id?: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    location?: string;
  },
  existingEventId?: string
): Promise<{ id: string }> {
  const url = existingEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingEventId}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const response = await fetch(url, {
    method: existingEventId ? 'PUT' : 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Calendar API error: ${error.error?.message || 'Unknown error'}`);
  }

  return await response.json();
}

// Delete Google Calendar event
async function deleteGoogleEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
  
  await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

// Fetch events from Google Calendar
async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<any[]> {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch events: ${error.error?.message}`);
  }

  const data = await response.json();
  return data.items || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, workspaceId } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (connError || !connection || !connection.is_connected) {
      return new Response(JSON.stringify({ error: 'Not connected to Google Calendar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(connection, supabaseAdmin);

    // Action: Full sync
    if (action === 'sync') {
      const results = { synced: 0, errors: [] as string[] };
      const calendarId = connection.calendar_id || 'primary';

      // Get projects to sync
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id, name, shoot_date, shoot_start_time, shoot_end_time, delivery_date, clients(name), google_meet_url')
        .eq('workspace_id', workspaceId)
        .eq('is_delivered', false);

      // Get existing sync logs
      const { data: syncLogs } = await supabaseAdmin
        .from('google_calendar_sync_log')
        .select('entity_type, entity_id, google_event_id')
        .eq('connection_id', connection.id);

      const syncLogMap = new Map(
        syncLogs?.map(log => [`${log.entity_type}:${log.entity_id}`, log.google_event_id]) || []
      );

      for (const project of projects || []) {
        const clientName = Array.isArray(project.clients) 
          ? project.clients[0]?.name 
          : (project.clients as any)?.name;

        // Sync shoot dates
        if (connection.sync_shoots && project.shoot_date) {
          try {
            const startDate = project.shoot_date;
            const startTime = project.shoot_start_time || '09:00';
            const endTime = project.shoot_end_time || '18:00';
            
            const event = {
              summary: `📸 ${project.name}`,
              description: `Captação para ${clientName || 'Cliente'}\n\nGerido por WillFlow`,
              start: {
                dateTime: `${startDate}T${startTime}:00`,
                timeZone: 'Europe/Lisbon',
              },
              end: {
                dateTime: `${startDate}T${endTime}:00`,
                timeZone: 'Europe/Lisbon',
              },
            };

            const existingEventId = syncLogMap.get(`project_shoot:${project.id}`);
            const result = await upsertGoogleEvent(accessToken, calendarId, event, existingEventId);

            // Update sync log
            await supabaseAdmin
              .from('google_calendar_sync_log')
              .upsert({
                connection_id: connection.id,
                entity_type: 'project_shoot',
                entity_id: project.id,
                google_event_id: result.id,
                last_synced_at: new Date().toISOString(),
              }, {
                onConflict: 'connection_id,entity_type,entity_id',
              });

            results.synced++;
          } catch (e: any) {
            results.errors.push(`Shoot ${project.name}: ${e.message}`);
          }
        }

        // Sync delivery dates
        if (connection.sync_deliveries && project.delivery_date) {
          try {
            const event = {
              summary: `🎬 Entrega: ${project.name}`,
              description: `Entrega para ${clientName || 'Cliente'}\n\nGerido por WillFlow`,
              start: {
                date: project.delivery_date,
              },
              end: {
                date: project.delivery_date,
              },
            };

            const existingEventId = syncLogMap.get(`project_delivery:${project.id}`);
            const result = await upsertGoogleEvent(accessToken, calendarId, event, existingEventId);

            await supabaseAdmin
              .from('google_calendar_sync_log')
              .upsert({
                connection_id: connection.id,
                entity_type: 'project_delivery',
                entity_id: project.id,
                google_event_id: result.id,
                last_synced_at: new Date().toISOString(),
              }, {
                onConflict: 'connection_id,entity_type,entity_id',
              });

            results.synced++;
          } catch (e: any) {
            results.errors.push(`Delivery ${project.name}: ${e.message}`);
          }
        }
      }

      // Sync calendar events
      if (connection.sync_events || connection.sync_meetings) {
        const { data: calendarEvents } = await supabaseAdmin
          .from('calendar_events')
          .select('*')
          .eq('workspace_id', workspaceId);

        for (const calEvent of calendarEvents || []) {
          if (calEvent.event_type === 'meeting' && !connection.sync_meetings) continue;
          if (calEvent.event_type !== 'meeting' && !connection.sync_events) continue;

          try {
            const event: any = {
              summary: `${calEvent.event_type === 'meeting' ? '📅' : '📌'} ${calEvent.title}`,
              description: calEvent.description || 'Gerido por WillFlow',
            };

            if (calEvent.all_day) {
              const dateStr = calEvent.start_at.split('T')[0];
              event.start = { date: dateStr };
              event.end = { date: dateStr };
            } else {
              event.start = { dateTime: calEvent.start_at, timeZone: 'Europe/Lisbon' };
              event.end = { dateTime: calEvent.end_at || calEvent.start_at, timeZone: 'Europe/Lisbon' };
            }

            if (calEvent.location) {
              event.location = calEvent.location;
            }

            const existingEventId = syncLogMap.get(`calendar_event:${calEvent.id}`);
            const result = await upsertGoogleEvent(accessToken, calendarId, event, existingEventId);

            await supabaseAdmin
              .from('google_calendar_sync_log')
              .upsert({
                connection_id: connection.id,
                entity_type: 'calendar_event',
                entity_id: calEvent.id,
                google_event_id: result.id,
                last_synced_at: new Date().toISOString(),
              }, {
                onConflict: 'connection_id,entity_type,entity_id',
              });

            results.synced++;
          } catch (e: any) {
            results.errors.push(`Event ${calEvent.title}: ${e.message}`);
          }
        }
      }

      // Update last sync time
      await supabaseAdmin
        .from('google_calendar_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_error: results.errors.length > 0 ? results.errors.join('; ') : null,
        })
        .eq('id', connection.id);

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Import from Google
    if (action === 'import') {
      if (!connection.import_from_google) {
        return new Response(JSON.stringify({ error: 'Import from Google is disabled' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const calendarId = connection.calendar_id || 'primary';
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

      const googleEvents = await fetchGoogleEvents(accessToken, calendarId, timeMin, timeMax);
      
      // Filter out events already synced from WillFlow
      const externalEvents = googleEvents.filter(e => 
        !e.description?.includes('Gerido por WillFlow')
      );

      return new Response(JSON.stringify({ 
        events: externalEvents.map(e => ({
          id: e.id,
          title: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          allDay: !!e.start?.date,
          location: e.location,
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
