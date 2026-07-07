import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize web-push with VAPID details
let webPushInitialized = false;

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Require either service-role auth or shared CRON_SECRET
    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    const isCron = !!cronSecret && providedSecret === cronSecret;
    const isServiceRole = bearer && bearer === serviceRoleKey;
    if (!isCron && !isServiceRole) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:geral@willflow.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[process-push] VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize web-push once
    if (!webPushInitialized) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      webPushInitialized = true;
      console.log('[process-push] Web Push initialized with VAPID');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get pending notifications from queue
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[process-push] Error fetching queue:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('[process-push] No pending notifications');
      return new Response(
        JSON.stringify({ processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-push] Processing ${pendingNotifications.length} notifications`);

    let successCount = 0;
    let failCount = 0;

    for (const notification of pendingNotifications) {
      try {
        // Get user's push subscription
        const { data: prefs } = await supabase
          .from('user_push_preferences')
          .select('push_enabled, push_subscription, messages_enabled')
          .eq('user_id', notification.user_id)
          .maybeSingle();

        if (!prefs?.push_enabled || !prefs?.push_subscription) {
          // Mark as processed (no subscription)
          await supabase
            .from('push_notification_queue')
            .update({
              status: 'skipped',
              error: 'No subscription or push disabled',
              processed_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          continue;
        }

        // Check if messages notifications are enabled
        if (notification.data?.type === 'message' && prefs.messages_enabled === false) {
          await supabase
            .from('push_notification_queue')
            .update({
              status: 'skipped',
              error: 'Messages disabled',
              processed_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          continue;
        }

        const subscription = prefs.push_subscription as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
          await supabase
            .from('push_notification_queue')
            .update({
              status: 'failed',
              error: 'Invalid subscription format',
              processed_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          failCount++;
          continue;
        }

        // Prepare notification payload
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: '/pwa-icon.png',
          badge: '/favicon.ico',
          tag: notification.tag || 'willflow-notification',
          data: notification.data || {},
          timestamp: Date.now(),
        });

        // Send push notification
        await webpush.sendNotification(subscription, payload, {
          TTL: 86400,
          urgency: 'high',
        });

        // Mark as sent
        await supabase
          .from('push_notification_queue')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        successCount++;
        console.log(`[process-push] Sent to user ${notification.user_id}`);

      } catch (pushError: any) {
        console.error(`[process-push] Error for ${notification.id}:`, pushError.message);

        // Check if subscription expired
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          // Remove invalid subscription
          await supabase
            .from('user_push_preferences')
            .update({ push_subscription: null })
            .eq('user_id', notification.user_id);

          await supabase
            .from('push_notification_queue')
            .update({
              status: 'failed',
              error: 'Subscription expired',
              processed_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
        } else {
          // Increment attempts
          await supabase
            .from('push_notification_queue')
            .update({
              attempts: notification.attempts + 1,
              last_attempt_at: new Date().toISOString(),
              error: pushError.message || 'Unknown error',
            })
            .eq('id', notification.id);
        }

        failCount++;
      }
    }

    console.log(`[process-push] Done: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ processed: pendingNotifications.length, success: successCount, failed: failCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-push] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});