import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowlist of redirect origins to prevent open-redirect/account-takeover attacks
const ALLOWED_REDIRECT_ORIGINS = [
  'https://willflow.app',
  'https://www.willflow.app',
  'https://willflows.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const isAllowedRedirect = (uri: string): boolean => {
  try {
    const u = new URL(uri);
    const origin = `${u.protocol}//${u.host}`;
    if (ALLOWED_REDIRECT_ORIGINS.includes(origin)) return true;
    // Allow lovable preview subdomains
    if (u.protocol === 'https:' && u.host.endsWith('.lovable.app')) return true;
    return false;
  } catch {
    return false;
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    console.log(`[google-oauth] Action: ${action}`);

    // ============================================
    // ACTION: INITIATE - Redirect to Google OAuth
    // ============================================
    if (action === 'initiate') {
      const redirectUri = url.searchParams.get('redirect_uri') || 'https://willflow.app/auth';

      if (!isAllowedRedirect(redirectUri)) {
        console.error(`[google-oauth] Rejected redirect_uri: ${redirectUri}`);
        return new Response(
          JSON.stringify({ error: 'invalid_redirect_uri' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[google-oauth] Initiating OAuth flow, redirect_uri: ${redirectUri}`);
      
      const scopes = [
        'openid',
        'email',
        'profile',
      ].join(' ');
      
      // Encode state with redirect URI for callback
      const state = btoa(JSON.stringify({ 
        redirectUri, 
        timestamp: Date.now() 
      }));
      
      // Build Google OAuth URL
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', `${SUPABASE_URL}/functions/v1/google-oauth?action=callback`);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', scopes);
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'select_account');
      oauthUrl.searchParams.set('state', state);
      
      console.log(`[google-oauth] Redirecting to Google OAuth`);
      
      return new Response(null, {
        status: 302,
        headers: { 
          'Location': oauthUrl.toString(),
          ...corsHeaders 
        },
      });
    }

    // ============================================
    // ACTION: CALLBACK - Handle Google response
    // ============================================
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      
      console.log(`[google-oauth] Callback received, code: ${code ? 'present' : 'missing'}, error: ${error || 'none'}`);
      
      // Handle errors from Google
      if (error) {
        console.error(`[google-oauth] Google OAuth error: ${error}`);
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': `https://willflow.app/auth?error=${encodeURIComponent(error)}`,
            ...corsHeaders 
          },
        });
      }
      
      if (!code || !stateParam) {
        console.error(`[google-oauth] Missing code or state`);
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': 'https://willflow.app/auth?error=missing_params',
            ...corsHeaders 
          },
        });
      }
      
      // Decode state
      let state: { redirectUri: string; timestamp: number };
      try {
        state = JSON.parse(atob(stateParam));
      } catch (e) {
        console.error(`[google-oauth] Invalid state parameter`);
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': 'https://willflow.app/auth?error=invalid_state',
            ...corsHeaders 
          },
        });
      }
      
      console.log(`[google-oauth] Exchanging code for tokens`);
      
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${SUPABASE_URL}/functions/v1/google-oauth?action=callback`,
        }),
      });
      
      if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.text();
        console.error(`[google-oauth] Token exchange failed: ${tokenError}`);
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': `${state.redirectUri}?error=token_exchange_failed`,
            ...corsHeaders 
          },
        });
      }
      
      const tokens = await tokenResponse.json();
      console.log(`[google-oauth] Got tokens, fetching user info`);
      
      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });
      
      if (!userInfoResponse.ok) {
        console.error(`[google-oauth] Failed to get user info`);
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': `${state.redirectUri}?error=user_info_failed`,
            ...corsHeaders 
          },
        });
      }
      
      const googleUser = await userInfoResponse.json();
      console.log(`[google-oauth] Got user info for: ${googleUser.email}`);
      
      // Create Supabase admin client
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      // Check if user exists
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      let userId: string;
      let isNewUser = false;
      
      const existingUser = existingUsers?.users?.find(u => u.email === googleUser.email);
      
      if (existingUser) {
        userId = existingUser.id;
        console.log(`[google-oauth] Existing user found: ${userId}`);
        
        // Update user metadata
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            full_name: googleUser.name,
            avatar_url: googleUser.picture,
            provider: 'google',
          },
        });
      } else {
        // Create new user
        console.log(`[google-oauth] Creating new user for: ${googleUser.email}`);
        isNewUser = true;
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: googleUser.email,
          email_confirm: true,
          user_metadata: {
            full_name: googleUser.name,
            avatar_url: googleUser.picture,
            provider: 'google',
          },
        });
        
        if (createError || !newUser.user) {
          console.error(`[google-oauth] Failed to create user: ${createError?.message}`);
          return new Response(null, {
            status: 302,
            headers: { 
              'Location': `${state.redirectUri}?error=user_creation_failed`,
              ...corsHeaders 
            },
          });
        }
        
        userId = newUser.user.id;
      }
      
      // Generate a magic link / session for the user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: googleUser.email,
        options: {
          redirectTo: state.redirectUri,
        },
      });
      
      if (linkError || !linkData.properties?.hashed_token) {
        console.error(`[google-oauth] Failed to generate link: ${linkError?.message}`);
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': `${state.redirectUri}?error=session_creation_failed`,
            ...corsHeaders 
          },
        });
      }
      
      // Extract token from magic link
      const magicLinkUrl = new URL(linkData.properties.action_link);
      const token = magicLinkUrl.searchParams.get('token');
      const type = magicLinkUrl.searchParams.get('type');
      
      console.log(`[google-oauth] Redirecting to app with session`);
      
      // Redirect to the app with the verification parameters
      // The app will handle the token verification
      const finalRedirect = new URL(state.redirectUri);
      finalRedirect.searchParams.set('token_hash', linkData.properties.hashed_token);
      finalRedirect.searchParams.set('type', type || 'magiclink');
      if (isNewUser) {
        finalRedirect.searchParams.set('new_user', 'true');
      }
      
      return new Response(null, {
        status: 302,
        headers: { 
          'Location': finalRedirect.toString(),
          ...corsHeaders 
        },
      });
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[google-oauth] Error: ${errorMessage}`);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
