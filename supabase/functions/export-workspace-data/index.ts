import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TABLES: Array<{ key: string; table: string }> = [
  { key: "members", table: "workspace_members" },
  { key: "clients", table: "clients" },
  { key: "projects", table: "projects" },
  { key: "invoices", table: "invoices" },
  { key: "invoice_items", table: "invoice_items" },
  { key: "project_team", table: "project_team" },
  { key: "project_cost_lines", table: "project_cost_lines" },
  { key: "project_comments", table: "project_comments" },
  { key: "tasks", table: "tasks" },
  { key: "payments", table: "payments" },
  { key: "kanban_columns", table: "kanban_columns" },
  { key: "calendar_events", table: "calendar_events" },
  { key: "client_notes", table: "client_notes" },
  { key: "client_communications", table: "client_communications" },
  { key: "contracts", table: "contracts" },
  { key: "followups", table: "followups" },
  { key: "workspace_goals", table: "workspace_goals" },
  { key: "files_metadata", table: "project_media_links" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const { workspace_id } = await req.json().catch(() => ({}));
    if (!workspace_id || typeof workspace_id !== "string") {
      return json({ error: "workspace_id is required" }, 400);
    }

    // Validate user via anon client + their JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Invalid token" }, 401);
    }
    const userId = userData.user.id;

    // Service role for membership + data fetches
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: membership, error: memErr } = await admin
      .from("workspace_members")
      .select("role, status")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (memErr || !membership) {
      return json({ error: "Not a workspace member" }, 403);
    }
    if (membership.status && membership.status !== "active") {
      return json({ error: "Membership not active" }, 403);
    }
    if (membership.role !== "admin") {
      return json({ error: "Admin role required" }, 403);
    }

    // Workspace row
    const { data: workspace } = await admin
      .from("workspaces")
      .select("*")
      .eq("id", workspace_id)
      .maybeSingle();

    const result: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      workspace_id,
      exported_by: userId,
      workspace: workspace ?? null,
    };

    // Fetch each table in parallel; tolerate missing tables / errors
    await Promise.all(
      TABLES.map(async ({ key, table }) => {
        try {
          const { data, error } = await admin
            .from(table)
            .select("*")
            .eq("workspace_id", workspace_id);
          if (error) {
            console.warn(`[export] ${table}:`, error.message);
            result[key] = [];
          } else {
            result[key] = data ?? [];
          }
        } catch (e) {
          console.warn(`[export] ${table} threw:`, (e as Error).message);
          result[key] = [];
        }
      }),
    );

    const date = new Date().toISOString().slice(0, 10);
    const filename = `willflow-export-${date}.json`;

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[export-workspace-data] error", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
