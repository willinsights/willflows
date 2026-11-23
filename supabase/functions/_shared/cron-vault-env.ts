// A1: Vault cron check using the function's own service credentials.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isVaultCronRequest } from "./cron-vault-auth.ts";

export async function isVaultCronFromEnv(req: Request): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return false;
  const db = createClient(url, key, { auth: { persistSession: false } });
  return await isVaultCronRequest(req, (name, args) => db.rpc(name, args));
}
