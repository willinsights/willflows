import { createClient } from '@supabase/supabase-js';
import type { ToolContext } from '@lovable.dev/mcp-js';

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};
function runtimeEnv(name: string) {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}
function configuredEnv(names: readonly string[]) {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
}
function supabaseProjectUrl() {
  const url = configuredEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  if (!url) throw new Error('Database URL is not configured');
  return url;
}
function supabasePublishableKey() {
  const direct = configuredEnv(['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY']);
  if (direct) return direct;
  const keyset = runtimeEnv('SUPABASE_PUBLISHABLE_KEYS');
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)].find((v): v is string => typeof v === 'string' && v.trim().startsWith('sb_publishable_'))?.trim();
        if (key) return key;
      }
    } catch { /* legacy fallback */ }
  }
  const legacy = configuredEnv(['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']);
  if (legacy) return legacy;
  throw new Error('Database publishable key is not configured');
}
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!ctx.isAuthenticated() || !token || !ctx.getUserId()) throw new Error('Sign in through OAuth first');
  return createClient(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireWorkspaceAccess(ctx: ToolContext, workspaceId: string) {
  const db = supabaseForUser(ctx);
  const { data, error } = await db.from('workspace_members').select('workspace_id').eq('user_id', ctx.getUserId()).eq('workspace_id', workspaceId).eq('is_active', true).maybeSingle();
  if (error || !data) throw new Error('No active membership in this workspace');
  return db;
}