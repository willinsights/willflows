import { describe, it, expect } from "vitest";
import { workerAuthorization } from "../../../../../supabase/functions/_shared/webhook-worker-auth.ts";

const secrets = { service: "service-fixture", legacy: "legacy-fixture" };
const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/webhook-retry-worker", { headers });
const authorized = () => null;
const unauthorized = () => new Response("Unauthorized", { status: 401 });
const missingConfiguration = () => new Response("Server configuration error", { status: 500 });

describe("webhook-retry-worker authorization (no network / no job execution)", () => {
  it("accepts configured service bearer", () => {
    expect(workerAuthorization(req({ authorization: "Bearer service-fixture" }), secrets, unauthorized)).toBeNull();
  });
  it("accepts configured legacy cron secret", () => {
    expect(workerAuthorization(req({ "x-cron-secret": "legacy-fixture" }), secrets, unauthorized)).toBeNull();
  });
  it("accepts a managed token only when managed auth approves", () => {
    expect(workerAuthorization(req({ authorization: "Bearer managed-fixture" }), secrets, authorized)).toBeNull();
  });
  it("rejects missing, invalid and malformed credentials", () => {
    for (const headers of [
      {},
      { authorization: "Bearer invalid" },
      { "x-cron-secret": "invalid" },
      { authorization: "Bearer service-fixture trailing" },
    ]) expect(workerAuthorization(req(headers), secrets, unauthorized)?.status).toBe(401);
  });
  it("preserves missing managed configuration status as 500", () => {
    expect(workerAuthorization(req(), secrets, missingConfiguration)?.status).toBe(500);
  });
  it("never treats blank environment secrets as valid", () => {
    expect(workerAuthorization(req({ authorization: "Bearer " }), { service: "", legacy: "" }, unauthorized)?.status).toBe(401);
  });
});
