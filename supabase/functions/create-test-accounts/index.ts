import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TEST-ACCOUNTS] ${step}${detailsStr}`);
};

// Test account configurations
const TEST_ACCOUNTS = [
  {
    email: 'starter@test.willflow.local',
    password: 'Teste1234!',
    plan: 'starter',
    workspaceName: 'Test Starter',
    workspaceSlug: 'test-starter',
  },
  {
    email: 'pro@test.willflow.local',
    password: 'Teste1234!',
    plan: 'pro',
    workspaceName: 'Test Pro',
    workspaceSlug: 'test-pro',
  },
  {
    email: 'studio@test.willflow.local',
    password: 'Teste1234!',
    plan: 'studio',
    workspaceName: 'Test Studio',
    workspaceSlug: 'test-studio',
  },
];

const EDITOR_ACCOUNTS = [
  {
    email: 'editor+starter@test.willflow.local',
    password: 'Teste1234!',
    workspaceSlug: 'test-starter',
    role: 'editor',
  },
  {
    email: 'editor+pro@test.willflow.local',
    password: 'Teste1234!',
    workspaceSlug: 'test-pro',
    role: 'editor',
  },
  {
    email: 'editor+studio@test.willflow.local',
    password: 'Teste1234!',
    workspaceSlug: 'test-studio',
    role: 'editor',
  },
];

interface TestAccountRequest {
  action: 'create' | 'reset' | 'delete' | 'list';
  includeEditors?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client for user management
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user is authenticated
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("ERROR: Invalid token");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    logStep("User authenticated", { userId });

    // Check if user is system admin using admin client
    const { data: isAdmin, error: adminError } = await supabaseAdmin
      .from('system_admins')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (adminError || !isAdmin) {
      logStep("ERROR: User is not a system admin");
      return new Response(
        JSON.stringify({ error: "Forbidden - Only system admins can manage test accounts" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("User is system admin, proceeding");

    const { action, includeEditors = false }: TestAccountRequest = await req.json();
    logStep("Action requested", { action, includeEditors });

    if (action === 'list') {
      return await listTestAccounts(supabaseAdmin);
    }

    if (action === 'delete' || action === 'reset') {
      await deleteTestAccounts(supabaseAdmin);
      if (action === 'delete') {
        return new Response(
          JSON.stringify({ success: true, message: 'Test accounts deleted' }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    if (action === 'create' || action === 'reset') {
      const result = await createTestAccounts(supabaseAdmin, includeEditors);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function listTestAccounts(supabaseAdmin: any) {
  logStep("Listing test accounts");

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      is_internal_test,
      created_at
    `)
    .eq('is_internal_test', true);

  if (error) {
    logStep("ERROR listing accounts", { error: error.message });
    throw error;
  }

  // Get workspace memberships for these users
  const userIds = profiles?.map((p: any) => p.id) || [];
  
  const { data: memberships } = await supabaseAdmin
    .from('workspace_members')
    .select(`
      user_id,
      role,
      workspace:workspaces(
        id,
        name,
        slug,
        subscription_plan,
        subscription_status
      )
    `)
    .in('user_id', userIds);

  // Combine data
  const accounts = profiles?.map((profile: any) => {
    const membership = memberships?.find((m: any) => m.user_id === profile.id);
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      createdAt: profile.created_at,
      workspace: membership?.workspace,
      role: membership?.role,
    };
  }) || [];

  logStep("Found test accounts", { count: accounts.length });

  return new Response(
    JSON.stringify({ accounts }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function deleteTestAccounts(supabaseAdmin: any) {
  logStep("Deleting test accounts");

  // Get all test accounts
  const { data: testProfiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('is_internal_test', true);

  if (profilesError) {
    logStep("ERROR fetching test profiles", { error: profilesError.message });
    throw profilesError;
  }

  if (!testProfiles || testProfiles.length === 0) {
    logStep("No test accounts to delete");
    return;
  }

  logStep("Found test accounts to delete", { count: testProfiles.length });

  // Get test workspaces
  const testWorkspaceSlugs = TEST_ACCOUNTS.map(a => a.workspaceSlug);
  const { data: workspaces } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .in('slug', testWorkspaceSlugs);

  // Delete workspaces (cascade will handle members)
  if (workspaces && workspaces.length > 0) {
    const workspaceIds = workspaces.map((w: any) => w.id);
    await supabaseAdmin
      .from('workspaces')
      .delete()
      .in('id', workspaceIds);
    logStep("Deleted test workspaces", { count: workspaceIds.length });
  }

  // Delete users from auth
  for (const profile of testProfiles) {
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
      if (error) {
        logStep("Warning: Could not delete auth user", { id: profile.id, error: error.message });
      } else {
        logStep("Deleted auth user", { id: profile.id, email: profile.email });
      }
    } catch (e: any) {
      logStep("Warning: Error deleting auth user", { id: profile.id, error: e.message });
    }
  }

  logStep("Test accounts deletion complete");
}

async function createTestAccounts(supabaseAdmin: any, includeEditors: boolean) {
  logStep("Creating test accounts", { includeEditors });

  const createdAccounts: any[] = [];
  const workspaceMap: Record<string, string> = {};

  // Calculate subscription end date (30 days from now)
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  // Create main test accounts (admins of their workspaces)
  for (const account of TEST_ACCOUNTS) {
    try {
      logStep("Creating main account", { email: account.email, plan: account.plan });

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: `Test ${account.plan.charAt(0).toUpperCase() + account.plan.slice(1)}`,
        },
      });

      if (authError) {
        logStep("ERROR creating auth user", { email: account.email, error: authError.message });
        throw authError;
      }

      const userId = authData.user.id;
      logStep("Auth user created", { userId, email: account.email });

      // Update profile to mark as internal test
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_internal_test: true,
          full_name: `Test ${account.plan.charAt(0).toUpperCase() + account.plan.slice(1)}`,
        })
        .eq('id', userId);

      if (profileError) {
        logStep("Warning: Could not update profile", { error: profileError.message });
      }

      // Map subscription_plan to the correct enum value
      let subscriptionPlan = 'essencial';
      if (account.plan === 'pro') subscriptionPlan = 'pro';
      if (account.plan === 'studio') subscriptionPlan = 'studio';

      // Create workspace with active subscription
      const { data: workspace, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .insert({
          name: account.workspaceName,
          slug: account.workspaceSlug,
          subscription_plan: subscriptionPlan,
          subscription_status: 'active',
          trial_ends_at: null, // No trial - active subscription
          stripe_customer_id: null,
          stripe_subscription_id: null,
        })
        .select()
        .single();

      if (workspaceError) {
        logStep("ERROR creating workspace", { error: workspaceError.message });
        throw workspaceError;
      }

      logStep("Workspace created", { id: workspace.id, name: workspace.name });
      workspaceMap[account.workspaceSlug] = workspace.id;

      // Add user as admin of workspace
      const { error: memberError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: userId,
          role: 'admin',
          is_active: true,
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        logStep("ERROR adding workspace member", { error: memberError.message });
        throw memberError;
      }

      logStep("Workspace member added", { userId, role: 'admin' });

      createdAccounts.push({
        email: account.email,
        password: account.password,
        plan: account.plan,
        workspace: account.workspaceName,
        role: 'admin',
        userId,
        workspaceId: workspace.id,
      });

    } catch (error: any) {
      logStep("ERROR creating account", { email: account.email, error: error.message });
      throw error;
    }
  }

  // Create editor accounts if requested
  if (includeEditors) {
    for (const editor of EDITOR_ACCOUNTS) {
      try {
        logStep("Creating editor account", { email: editor.email });

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: editor.email,
          password: editor.password,
          email_confirm: true,
          user_metadata: {
            full_name: `Editor ${editor.workspaceSlug.replace('test-', '')}`,
          },
        });

        if (authError) {
          logStep("ERROR creating editor auth user", { email: editor.email, error: authError.message });
          throw authError;
        }

        const userId = authData.user.id;

        // Update profile to mark as internal test
        await supabaseAdmin
          .from('profiles')
          .update({
            is_internal_test: true,
            full_name: `Editor ${editor.workspaceSlug.replace('test-', '').charAt(0).toUpperCase() + editor.workspaceSlug.replace('test-', '').slice(1)}`,
          })
          .eq('id', userId);

        // Add as editor to corresponding workspace
        const workspaceId = workspaceMap[editor.workspaceSlug];
        if (workspaceId) {
          await supabaseAdmin
            .from('workspace_members')
            .insert({
              workspace_id: workspaceId,
              user_id: userId,
              role: 'editor',
              is_active: true,
              joined_at: new Date().toISOString(),
            });

          createdAccounts.push({
            email: editor.email,
            password: editor.password,
            plan: editor.workspaceSlug.replace('test-', ''),
            workspace: `Test ${editor.workspaceSlug.replace('test-', '').charAt(0).toUpperCase() + editor.workspaceSlug.replace('test-', '').slice(1)}`,
            role: 'editor',
            userId,
            workspaceId,
          });
        }

        logStep("Editor account created", { email: editor.email });
      } catch (error: any) {
        logStep("ERROR creating editor", { email: editor.email, error: error.message });
        // Continue with other editors
      }
    }
  }

  logStep("Test accounts creation complete", { count: createdAccounts.length });

  return {
    success: true,
    message: `Created ${createdAccounts.length} test accounts`,
    accounts: createdAccounts,
  };
}

serve(handler);
