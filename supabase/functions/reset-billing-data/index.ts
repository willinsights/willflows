import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Protected emails that won't be affected (only Super Admins)
const PROTECTED_EMAILS = [
  'geral@willflow.app',      // Super Admin principal - plano Studio permanente
  'willdesign7@gmail.com',   // Super Admin secundário
];

interface PreviewResult {
  subscriptionsToReset: number;
  protectedSubscriptions: number;
  invoicesToDelete: number;
  webhookLogsToDelete: number;
  protectedEmails: string[];
}

interface ExecuteResult {
  subscriptionsReset: number;
  invoicesDeleted: number;
  webhookLogsDeleted: number;
  success: boolean;
}

function logStep(step: string, details?: unknown) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting reset-billing-data function');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      logStep('Auth failed', { error: authError?.message });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('User authenticated', { userId: user.id, email: user.email });

    // Check if user is system admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('system_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminCheck) {
      logStep('User is not a system admin', { userId: user.id });
      return new Response(
        JSON.stringify({ error: 'Access denied - Super Admin required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Super admin verified');

    const { action } = await req.json();

    if (action === 'preview') {
      logStep('Generating preview');

      // Get protected user IDs
      const { data: protectedProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .or(
          `email.in.(${PROTECTED_EMAILS.join(',')}),email.like.%@test.willflow.local`
        );

      const protectedUserIds = (protectedProfiles || []).map(p => p.id);
      const protectedEmailsList = (protectedProfiles || []).map(p => p.email);

      logStep('Protected users found', { count: protectedUserIds.length });

      // Count subscriptions to reset
      const { count: totalSubs } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true });

      const { count: protectedSubs } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('user_id', protectedUserIds.length > 0 ? protectedUserIds : ['00000000-0000-0000-0000-000000000000']);

      // Count invoices
      const { count: invoicesCount } = await supabaseAdmin
        .from('subscription_invoices')
        .select('*', { count: 'exact', head: true });

      // Count webhook logs
      const { count: webhooksCount } = await supabaseAdmin
        .from('stripe_webhook_log')
        .select('*', { count: 'exact', head: true });

      const preview: PreviewResult = {
        subscriptionsToReset: (totalSubs || 0) - (protectedSubs || 0),
        protectedSubscriptions: protectedSubs || 0,
        invoicesToDelete: invoicesCount || 0,
        webhookLogsToDelete: webhooksCount || 0,
        protectedEmails: protectedEmailsList,
      };

      logStep('Preview generated', preview);

      return new Response(
        JSON.stringify({ success: true, preview }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'execute') {
      logStep('Executing billing reset');

      // Get protected user IDs
      const { data: protectedProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .or(
          `email.in.(${PROTECTED_EMAILS.join(',')}),email.like.%@test.willflow.local`
        );

      const protectedUserIds = (protectedProfiles || []).map(p => p.id);
      logStep('Protected users', { ids: protectedUserIds });

      // 1. Delete all invoices
      const { count: invoicesDeleted } = await supabaseAdmin
        .from('subscription_invoices')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Trick to delete all

      logStep('Invoices deleted', { count: invoicesDeleted });

      // 2. Delete all webhook logs
      const { count: webhooksDeleted } = await supabaseAdmin
        .from('stripe_webhook_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      logStep('Webhook logs deleted', { count: webhooksDeleted });

      // 3. Reset non-protected subscriptions to trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      let subscriptionsReset = 0;

      if (protectedUserIds.length > 0) {
        // Reset all except protected
        const { count } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            subscription_status: 'trialing',
            subscription_plan: 'essencial',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            trial_ends_at: trialEndsAt.toISOString(),
            current_period_end: null,
          })
          .not('user_id', 'in', `(${protectedUserIds.join(',')})`);
        
        subscriptionsReset = count || 0;
      } else {
        // No protected users, reset all
        const { count } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            subscription_status: 'trialing',
            subscription_plan: 'essencial',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            trial_ends_at: trialEndsAt.toISOString(),
            current_period_end: null,
          })
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        subscriptionsReset = count || 0;
      }

      logStep('Subscriptions reset', { count: subscriptionsReset });

      // Log admin action
      await supabaseAdmin.from('admin_audit_log').insert({
        admin_user_id: user.id,
        action: 'reset_billing_data',
        target_type: 'billing',
        target_id: 'all',
        details: {
          subscriptionsReset,
          invoicesDeleted: invoicesDeleted || 0,
          webhooksDeleted: webhooksDeleted || 0,
          protectedUsers: protectedUserIds.length,
        },
      });

      const result: ExecuteResult = {
        subscriptionsReset,
        invoicesDeleted: invoicesDeleted || 0,
        webhookLogsDeleted: webhooksDeleted || 0,
        success: true,
      };

      logStep('Reset completed', result);

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "preview" or "execute".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Error in reset-billing-data', { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
