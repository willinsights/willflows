import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authorizedPlayback, privateHeaders, providerPlayback } from '../_shared/private-playback.ts';
import { VideoContextError } from '../_shared/video-context.ts';
Deno.serve(async req => {
  const headers = { ...corsHeaders, ...privateHeaders, 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers });
  try {
    const env = (name: string) => { const value = Deno.env.get(name); if (!value) throw Error('CONFIGURATION'); return value; };
    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || (body.replacement !== undefined && typeof body.replacement !== 'boolean') || (body.approvalToken !== undefined && (typeof body.approvalToken !== 'string' || !body.approvalToken || body.approvalToken.length > 512))) return new Response(null, { status: 400, headers });
    const bearer = /^Bearer ([^\s,]+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
    const auth = bearer ? await db.auth.getUser(bearer) : null;
    const result = await authorizedPlayback(db, body, auth?.error ? null : auth?.data.user?.id ?? null, providerPlayback(env('CLOUDFLARE_ACCOUNT_ID'), env('CLOUDFLARE_STREAM_TOKEN')));
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ code: error instanceof VideoContextError ? 'FORBIDDEN' : 'PLAYBACK_UNCONFIRMED' }), { status: error instanceof VideoContextError ? 403 : 503, headers });
  }
});