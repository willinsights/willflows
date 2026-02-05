import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

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
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:geral@willflow.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[send-push] VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize web-push once
    if (!webPushInitialized) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      webPushInitialized = true;
      console.log('[send-push] Web Push initialized with VAPID');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { userId, title, body, icon, badge, tag, data } = await req.json() as PushPayload;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Sending push to user ${userId}: ${title}`);

    // Get user's push subscription
    const { data: prefs, error: prefsError } = await supabase
      .from('user_push_preferences')
      .select('push_enabled, push_subscription, messages_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      console.error('[send-push] Error fetching preferences:', prefsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user preferences' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prefs?.push_enabled || !prefs?.push_subscription) {
      console.log(`[send-push] User ${userId} has push disabled or no subscription`);
      return new Response(
        JSON.stringify({ success: false, reason: 'Push not enabled or no subscription' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if messages notifications are enabled (for chat notifications)
    if (data?.type === 'message' && prefs.messages_enabled === false) {
      console.log(`[send-push] User ${userId} has message notifications disabled`);
      return new Response(
        JSON.stringify({ success: false, reason: 'Message notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscription = prefs.push_subscription as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    // Validate subscription has required keys
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.error('[send-push] Invalid subscription format:', JSON.stringify(subscription));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid subscription format' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/pwa-icon.png',
      badge: badge || '/favicon.ico',
      tag: tag || 'willflow-notification',
      data: data || {},
      timestamp: Date.now(),
    });

    console.log(`[send-push] Sending to endpoint: ${subscription.endpoint.substring(0, 60)}...`);

    try {
      // Use web-push library for proper VAPID/ECDH encryption
      await webpush.sendNotification(subscription, notificationPayload, {
        TTL: 86400, // 24 hours
        urgency: 'high',
      });
      
      console.log(`[send-push] Push sent successfully to user ${userId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (pushError: any) {
      console.error('[send-push] Push error:', pushError.message || pushError);
      
      // Check if subscription is expired or invalid
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        // Remove invalid subscription
        await supabase
          .from('user_push_preferences')
          .update({ push_subscription: null })
          .eq('user_id', userId);
        console.log(`[send-push] Removed invalid subscription for user ${userId}`);
        
        return new Response(
          JSON.stringify({ success: false, error: 'Subscription expired', removed: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: pushError.message || 'Failed to send push' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[send-push] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});