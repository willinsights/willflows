// Offline tests for the staged cleanup-expired-videos auth. Fictitious secrets only.
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

let handler: (req: Request) => Promise<Response> | Response;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: typeof handler) => { handler = h; return {} as unknown; };
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) Deno.env.delete(k);
Deno.env.set("LOVABLE_CRON_SECRET", "managed-fake-current");
Deno.env.set("LOVABLE_CRON_SECRET_PREVIOUS", "managed-fake-previous");
Deno.env.set("CRON_SECRET", "legacy-fake");
Deno.env.set("AUTOMATION_CRON_SECRET", "automation-fake");
await import("../supabase/functions/cleanup-expired-videos/index.ts");

const call = async (headers: Record<string, string>) => {
  const r = await handler(new Request("http://local/cleanup", { method: "POST", headers }));
  await r.text();
  return r.status;
};
// Authorized requests pass the gate and stop at missing (fictitious) backend config → not 401.
Deno.test("managed token valid", async () => assertNotEquals(await call({ authorization: "Bearer managed-fake-current" }), 401));
Deno.test("managed previous token valid (rotation)", async () => assertNotEquals(await call({ authorization: "Bearer managed-fake-previous" }), 401));
Deno.test("legacy x-cron-secret still valid", async () => assertNotEquals(await call({ "x-cron-secret": "legacy-fake" }), 401));
Deno.test("AUTOMATION_CRON_SECRET still valid", async () => assertNotEquals(await call({ "x-cron-secret": "automation-fake" }), 401));
Deno.test("invalid managed token rejected", async () => assertEquals(await call({ authorization: "Bearer wrong" }), 401));
Deno.test("invalid legacy secret rejected", async () => assertEquals(await call({ "x-cron-secret": "wrong" }), 401));
Deno.test("missing credentials rejected", async () => assertEquals(await call({}), 401));
Deno.test("malformed bearer rejected", async () => assertEquals(await call({ authorization: "Bearer a b" }), 401));
Deno.test("missing managed config fails closed", async () => {
  Deno.env.delete("LOVABLE_CRON_SECRET");
  assertEquals(await call({ authorization: "Bearer managed-fake-current" }), 401);
  Deno.env.set("LOVABLE_CRON_SECRET", "managed-fake-current");
});
