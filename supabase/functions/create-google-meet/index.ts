import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Refresh access token if expired (uses encrypted tokens)
 */
async function refreshTokenIfNeeded(connection: any, supabaseAdmin: any, userId: string): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  
  // Decrypt the access token
  const { data: decryptedAccessToken } = await supabaseAdmin.rpc('decrypt_oauth_token', {
    _encrypted_token: connection.access_token_encrypted,
    _user_id: userId
  });
  
  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return decryptedAccessToken;
  }

  console.log('Refreshing access token...');
  
  // Decrypt refresh token
  const { data: decryptedRefreshToken } = await supabaseAdmin.rpc('decrypt_oauth_token', {
    _encrypted_token: connection.refresh_token_encrypted,
    _user_id: userId
  });
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: decryptedRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${tokens.error_description || tokens.error}`);
  }

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Encrypt the new access token
  const { data: encryptedNewToken } = await supabaseAdmin.rpc('encrypt_oauth_token', {
    _token: tokens.access_token,
    _user_id: userId
  });

  await supabaseAdmin
    .from('google_calendar_connections')
    .update({
      access_token_encrypted: encryptedNewToken,
      access_token: null, // Clear any plain text
      token_expires_at: newExpiresAt,
    })
    .eq('id', connection.id);

  return tokens.access_token;
}

/**
 * Create a Google Calendar event with Google Meet conference
 */
async function createGoogleMeetEvent(
  accessToken: string,
  calendarId: string,
  eventData: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: { email: string }[];
  }
): Promise<{ meetUrl: string; googleEventId: string }> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`;

  const requestId = crypto.randomUUID();
  
  const event = {
    ...eventData,
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };

  console.log('Creating Google Calendar event with Meet:', event.summary);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Google Calendar API error (${response.status}):`, errorBody);
    
    let errorMessage = 'Unknown error';
    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson.error?.message || errorJson.error || errorMessage;
    } catch {
      errorMessage = errorBody.substring(0, 200);
    }
    
    throw new Error(`Google Calendar API error: ${errorMessage}`);
  }

  const result = await response.json();
  
  const meetUrl = result.hangoutLink || result.conferenceData?.entryPoints?.[0]?.uri;
  
  if (!meetUrl) {
    throw new Error('Google Meet link was not created');
  }

  console.log('Created event with Meet URL:', meetUrl);

  return {
    meetUrl,
    googleEventId: result.id,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { workspaceId, title, startAt, endAt, description, attendees } = await req.json();

    console.log('[create-google-meet] Received:', JSON.stringify({ workspaceId, title, startAt, endAt }));

    if (!workspaceId || !title || !startAt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate JWT
    const supabaseAuthed = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data, error: claimsError } = await supabaseAuthed.auth.getClaims(token);

    if (claimsError || !data?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = data.claims.sub as string;

    // Verify user is member of workspace
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .single();

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this workspace' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Google Calendar connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    if (connError || !connection || !connection.is_connected) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(connection, supabaseAdmin, userId);

    const calendarId = connection.calendar_id || 'primary';

    // Build start/end timestamps - use raw strings to avoid UTC/timezone conflicts
    // Frontend sends "2026-02-05T09:00:00" without Z suffix
    // We pass it directly with timeZone so Google interprets it correctly
    let startDateTime = startAt;
    let endDateTime = endAt;

    // If no endAt provided, calculate 1 hour after start
    if (!endDateTime) {
      const startDate = new Date(startAt);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      // Format without Z: YYYY-MM-DDTHH:mm:ss
      endDateTime = endDate.toISOString().replace('Z', '').replace(/\.\d{3}$/, '');
    }

    // Validate end > start using Date objects
    const startCheck = new Date(startDateTime);
    const endCheck = new Date(endDateTime);
    if (endCheck.getTime() <= startCheck.getTime()) {
      console.log('[create-google-meet] endDateTime <= startDateTime, auto-correcting +1h');
      const corrected = new Date(startCheck.getTime() + 60 * 60 * 1000);
      endDateTime = corrected.toISOString().replace('Z', '').replace(/\.\d{3}$/, '');
    }

    // Remove any trailing Z from frontend timestamps
    startDateTime = startDateTime.replace(/\.000Z$/, '').replace(/Z$/, '');
    endDateTime = endDateTime.replace(/\.000Z$/, '').replace(/Z$/, '');

    console.log('[create-google-meet] Final timestamps:', JSON.stringify({ startDateTime, endDateTime }));

    // Create event with Meet
    const result = await createGoogleMeetEvent(
      accessToken,
      calendarId,
      {
        summary: `📅 ${title}`,
        description: description || 'Reunião criada via WillFlow',
        start: {
          dateTime: startDateTime,
          timeZone: 'Europe/Lisbon',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Europe/Lisbon',
        },
        attendees: attendees?.map((email: string) => ({ email })),
      }
    );

    console.log('Successfully created Meet:', result);

    return new Response(JSON.stringify({
      success: true,
      meetUrl: result.meetUrl,
      googleEventId: result.googleEventId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error creating Google Meet:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to create Google Meet' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
