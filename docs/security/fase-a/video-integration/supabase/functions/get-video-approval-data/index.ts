import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { approvalData } from './handler.ts';
import { providerPlayback } from '../_shared/private-playback.ts';

function connect() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing server configuration');
  return createClient(url, key);
}

Deno.serve(req => approvalData(req, connect, corsHeaders, async uid => {
  const account = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const credential = Deno.env.get('CLOUDFLARE_STREAM_TOKEN');
  if (!account || !credential) throw new Error('Playback configuration unavailable');
  return providerPlayback(account, credential)(uid);
}));
