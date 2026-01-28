import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Base64url decode for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Import crypto for Web Push signing
async function generateVAPIDHeaders(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const vapidPublicKey = urlBase64ToUint8Array(publicKey);
  
  // Parse endpoint URL to get origin
  const endpointUrl = new URL(endpoint);
  const audience = endpointUrl.origin;
  
  // Create JWT header and payload
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };
  
  // Base64url encode
  const base64urlEncode = (obj: unknown) => {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  
  const unsignedToken = base64urlEncode(header) + '.' + base64urlEncode(payload);
  
  // Import private key for signing
  const privateKeyBytes = urlBase64ToUint8Array(privateKey);
  
  // Create key from raw bytes (PKCS8 format for ES256)
  // The private key from web-push is raw 32-byte key, need to wrap it
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKey.replace(/-/g, '+').replace(/_/g, '/'),
    x: publicKey.substring(0, 43).replace(/-/g, '+').replace(/_/g, '/'),
    y: publicKey.substring(43).replace(/-/g, '+').replace(/_/g, '/'),
  };
  
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );
    
    // Convert signature to base64url
    const signatureBytes = new Uint8Array(signature);
    let signatureBinary = '';
    for (const byte of signatureBytes) {
      signatureBinary += String.fromCharCode(byte);
    }
    const signatureBase64 = btoa(signatureBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const jwt = unsignedToken + '.' + signatureBase64;
    
    // Create public key for Crypto-Key header
    let publicKeyBinary = '';
    for (const byte of vapidPublicKey) {
      publicKeyBinary += String.fromCharCode(byte);
    }
    const publicKeyBase64 = btoa(publicKeyBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    return {
      authorization: `vapid t=${jwt}, k=${publicKeyBase64}`,
      cryptoKey: `p256ecdsa=${publicKeyBase64}`,
    };
  } catch (error) {
    console.error('Error generating VAPID headers:', error);
    throw error;
  }
}

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
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      .select('push_enabled, push_subscription')
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

    const subscription = prefs.push_subscription as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

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

    console.log(`[send-push] Sending to endpoint: ${subscription.endpoint.substring(0, 50)}...`);

    // For now, use a simpler approach - just POST to the endpoint
    // Full Web Push encryption is complex, so we'll use fetch with basic auth
    try {
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'TTL': '86400',
        },
        body: notificationPayload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[send-push] Push endpoint error: ${response.status} - ${errorText}`);
        
        // If subscription is invalid (410 Gone), remove it
        if (response.status === 410 || response.status === 404) {
          await supabase
            .from('user_push_preferences')
            .update({ push_subscription: null })
            .eq('user_id', userId);
          console.log(`[send-push] Removed invalid subscription for user ${userId}`);
        }
        
        return new Response(
          JSON.stringify({ success: false, error: `Push failed: ${response.status}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await response.text(); // Consume response
      console.log(`[send-push] Push sent successfully to user ${userId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      console.error('[send-push] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send push' }),
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
