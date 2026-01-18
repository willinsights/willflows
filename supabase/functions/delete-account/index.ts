import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Starting account deletion for user: ${userId}`);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Get all workspaces where user is a member
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError);
      throw new Error('Failed to fetch workspace memberships');
    }

    // 2. For each workspace, handle accordingly
    for (const membership of memberships || []) {
      const { workspace_id, role } = membership;

      if (role === 'admin') {
        // Check if there are other admins in this workspace
        const { data: otherAdmins, error: adminError } = await supabaseAdmin
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('role', 'admin')
          .eq('is_active', true)
          .neq('user_id', userId);

        if (adminError) {
          console.error('Error checking other admins:', adminError);
          continue;
        }

        if (!otherAdmins || otherAdmins.length === 0) {
          // User is the only admin - delete the entire workspace
          console.log(`Deleting workspace ${workspace_id} (user is only admin)`);
          
          // Delete workspace data in order (respecting foreign keys)
          await supabaseAdmin.from('notifications').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('calendar_events').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('payments').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('project_comments').delete().match({ project_id: null }); // cleanup orphans
          await supabaseAdmin.from('tasks').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('project_team').delete().match({ project_id: null }); // cleanup orphans
          
          // Delete projects (this should cascade to project_comments, tasks, etc.)
          const { data: projects } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('workspace_id', workspace_id);
          
          for (const project of projects || []) {
            await supabaseAdmin.from('project_comments').delete().eq('project_id', project.id);
            await supabaseAdmin.from('project_media_links').delete().eq('project_id', project.id);
            await supabaseAdmin.from('project_team').delete().eq('project_id', project.id);
            await supabaseAdmin.from('tasks').delete().eq('project_id', project.id);
          }
          await supabaseAdmin.from('projects').delete().eq('workspace_id', workspace_id);
          
          // Delete clients and related data
          const { data: clients } = await supabaseAdmin
            .from('clients')
            .select('id')
            .eq('workspace_id', workspace_id);
          
          for (const client of clients || []) {
            await supabaseAdmin.from('client_notes').delete().eq('client_id', client.id);
            await supabaseAdmin.from('client_communications').delete().eq('client_id', client.id);
          }
          await supabaseAdmin.from('clients').delete().eq('workspace_id', workspace_id);
          
          // Delete other workspace data
          await supabaseAdmin.from('categories').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('kanban_columns').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('activity_log').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('workspace_invitations').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('workspace_role_permissions').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('google_calendar_connections').delete().eq('workspace_id', workspace_id);
          await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspace_id);
          
          // Finally delete the workspace
          await supabaseAdmin.from('workspaces').delete().eq('id', workspace_id);
        } else {
          // There are other admins - just remove user from workspace
          console.log(`Removing user from workspace ${workspace_id} (other admins exist)`);
          await supabaseAdmin
            .from('workspace_members')
            .update({ is_active: false })
            .eq('workspace_id', workspace_id)
            .eq('user_id', userId);
        }
      } else {
        // User is not admin - just remove from workspace
        console.log(`Removing user from workspace ${workspace_id}`);
        await supabaseAdmin
          .from('workspace_members')
          .update({ is_active: false })
          .eq('workspace_id', workspace_id)
          .eq('user_id', userId);
      }
    }

    // 3. Delete user's personal data
    console.log('Deleting user profile and preferences');
    await supabaseAdmin.from('user_preferences').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_subscriptions').delete().eq('user_id', userId);
    await supabaseAdmin.from('feedback').delete().eq('user_id', userId);
    
    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 4. Delete the auth user
    console.log('Deleting auth user');
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      throw new Error('Failed to delete user account');
    }

    console.log(`Account deletion completed for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in delete-account function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
