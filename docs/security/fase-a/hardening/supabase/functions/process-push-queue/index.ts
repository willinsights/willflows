import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import webpush from 'npm:web-push@3.6.7';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { secretEquals } from '../_shared/timing-safe.ts';
import { deliverPush } from '../_shared/push-delivery.ts';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretEquals(Deno.env.get('CRON_SECRET'), req.headers.get('x-cron-secret')) && !secretEquals(key, req.headers.get('authorization')?.replace(/^Bearer /, '')) && authenticateCronRequest(req) !== null) return reply({ error: 'Unauthorized' }, 401);
  if (Deno.env.get('PUSH_DELIVERY_ENABLED') !== 'true') return reply({ paused: true }, 503);
  try {
    const url = Deno.env.get('SUPABASE_URL'), pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!url || !key || !pub || !priv) throw new Error('Missing configuration');
    const client = createClient(url, key);
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:geral@willflow.app', pub, priv);
    const { data, error } = await client.rpc('list_ready_push', { p_limit: 50 });
    if (error) throw new Error('Queue read failed');
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const state = await deliverPush(client, row, (sub, payload) => webpush.sendNotification(sub, payload, { TTL: 86400 }));
      counts[state] = (counts[state] || 0) + 1;
    }
    return reply(counts, counts.uncertain ? 500 : 200);
  } catch { return reply({ error: 'Push processing incomplete' }, 500); }
});