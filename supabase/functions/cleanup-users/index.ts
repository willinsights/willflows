import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utilizadores a MANTER
const KEEP_EMAILS = [
  'willdesign7@gmail.com',
  'starter@test.willflow.local',
  'pro@test.willflow.local',
  'studio@test.willflow.local',
  'editor+starter@test.willflow.local',
  'editor+pro@test.willflow.local',
  'editor+studio@test.willflow.local',
];

// Workspaces a MANTER (por slug)
const KEEP_WORKSPACE_SLUGS = [
  'test-starter',
  'test-pro',
  'test-studio',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if system admin
    const { data: isAdmin } = await supabaseAdmin
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas super admins podem executar esta acção' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();

    if (action === 'preview') {
      // Preview mode - just count what would be deleted
      const { data: allUsers } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, is_internal_test');

      const usersToKeep = allUsers?.filter(u => KEEP_EMAILS.includes(u.email)) || [];
      const usersToDelete = allUsers?.filter(u => !KEEP_EMAILS.includes(u.email)) || [];

      const { data: allWorkspaces } = await supabaseAdmin
        .from('workspaces')
        .select('id, name, slug');

      const workspacesToKeep = allWorkspaces?.filter(w => KEEP_WORKSPACE_SLUGS.includes(w.slug)) || [];
      const workspacesToDelete = allWorkspaces?.filter(w => !KEEP_WORKSPACE_SLUGS.includes(w.slug)) || [];

      const { count: waitlistCount } = await supabaseAdmin
        .from('beta_waitlist')
        .select('*', { count: 'exact', head: true });

      const { count: betaTokensCount } = await supabaseAdmin
        .from('beta_invite_tokens')
        .select('*', { count: 'exact', head: true });

      const { count: invitationsCount } = await supabaseAdmin
        .from('workspace_invitations')
        .select('*', { count: 'exact', head: true });

      return new Response(JSON.stringify({
        preview: true,
        usersToKeep,
        usersToDelete,
        workspacesToKeep,
        workspacesToDelete,
        countsToDelete: {
          waitlist: waitlistCount || 0,
          betaTokens: betaTokensCount || 0,
          invitations: invitationsCount || 0,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'execute') {
      console.log('Starting cleanup...');
      const results = {
        deletedUsers: 0,
        deletedWorkspaces: 0,
        deletedWaitlist: 0,
        deletedBetaTokens: 0,
        deletedInvitations: 0,
        errors: [] as string[],
      };

      // 1. Clear beta_waitlist
      const { error: waitlistError } = await supabaseAdmin
        .from('beta_waitlist')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (!waitlistError) {
        console.log('Cleared waitlist');
      }

      // 2. Clear beta_invite_tokens
      const { error: tokensError } = await supabaseAdmin
        .from('beta_invite_tokens')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (!tokensError) {
        console.log('Cleared beta tokens');
      }

      // 3. Clear workspace_invitations
      const { error: invitationsError } = await supabaseAdmin
        .from('workspace_invitations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (!invitationsError) {
        console.log('Cleared invitations');
      }

      // 4. Get workspaces to delete
      const { data: allWorkspaces } = await supabaseAdmin
        .from('workspaces')
        .select('id, slug, name');

      const workspacesToDelete = allWorkspaces?.filter(w => !KEEP_WORKSPACE_SLUGS.includes(w.slug)) || [];
      console.log(`Found ${workspacesToDelete.length} workspaces to delete`);

      // 5. Delete workspaces (CASCADE handles related data)
      for (const ws of workspacesToDelete) {
        try {
          const { error } = await supabaseAdmin
            .from('workspaces')
            .delete()
            .eq('id', ws.id);

          if (error) {
            console.error(`Error deleting workspace ${ws.slug}:`, error);
            results.errors.push(`Workspace ${ws.slug}: ${error.message}`);
          } else {
            results.deletedWorkspaces++;
            console.log(`Deleted workspace: ${ws.slug}`);
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          results.errors.push(`Workspace ${ws.slug}: ${errorMessage}`);
        }
      }

      // 6. Get users to delete
      const { data: allUsers } = await supabaseAdmin
        .from('profiles')
        .select('id, email');

      const usersToDelete = allUsers?.filter(u => !KEEP_EMAILS.includes(u.email)) || [];
      console.log(`Found ${usersToDelete.length} users to delete`);

      // 7. Delete users via Auth Admin API
      for (const profile of usersToDelete) {
        try {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(profile.id);

          if (error) {
            console.error(`Error deleting user ${profile.email}:`, error);
            results.errors.push(`User ${profile.email}: ${error.message}`);
          } else {
            results.deletedUsers++;
            console.log(`Deleted user: ${profile.email}`);
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          results.errors.push(`User ${profile.email}: ${errorMessage}`);
        }
      }

      console.log('Cleanup complete:', results);

      return new Response(JSON.stringify({
        success: true,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Acção inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
