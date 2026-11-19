import { describe, it, expect, vi } from "vitest";
import { handleWorkerRequest } from "../../../../../supabase/functions/_shared/webhook-worker-request.ts";
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
  it("allows a worker-only bearer to probe without processing a batch", async () => {
    const request = new Request("http://localhost/webhook-retry-worker", {
      method: "HEAD", headers: { authorization: "Bearer worker-fixture" },
    });
    const process = vi.fn();
    const authorize = (input: Request) =>
      workerAuthorization(input, { worker: "worker-fixture" }, unauthorized);
    const response = await handleWorkerRequest(request, {}, authorize, process);
    expect(response.status).toBe(204);
    expect(response.headers.get("X-WillFlow-Worker-Probe")).toBe("1");
    expect(process).not.toHaveBeenCalled();
  });
  it("rejects the scheduled public bearer before processing any work", async () => {
    const request = new Request("http://localhost/webhook-retry-worker", {
      method: "POST", headers: { authorization: "Bearer public-anon-fixture" },
    });
    const process = vi.fn();
    const authorize = (input: Request) =>
      workerAuthorization(input, { ...secrets, worker: "worker-fixture" }, unauthorized);
    expect((await handleWorkerRequest(request, {}, authorize, process)).status).toBe(401);
    expect(process).not.toHaveBeenCalled();
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

describe('authenticated worker health and method routing', () => {
  const probe = (method: string) => new Request('https://example.test/worker', { method });
  it('answers an authenticated HEAD without touching the queue', async () => {
    const process = vi.fn();
    const response = await handleWorkerRequest(probe('HEAD'), {}, () => null, process);
    expect(response.status).toBe(204);
    expect(response.headers.get('X-WillFlow-Worker-Probe')).toBe('1');
    expect(await response.text()).toBe('');
    expect(process).not.toHaveBeenCalled();
  });
  it.each([401, 500])('preserves an authentication failure %i on HEAD', async status => {
    const process = vi.fn();
    const response = await handleWorkerRequest(probe('HEAD'), {}, () => new Response(null, { status }), process);
    expect(response.status).toBe(status);
    expect(response.headers.get('X-WillFlow-Worker-Probe')).toBeNull();
    expect(process).not.toHaveBeenCalled();
  });
  it('only lets an authenticated POST execute a batch', async () => {
    const process = vi.fn(async () => new Response('processed'));
    expect((await handleWorkerRequest(probe('GET'), {}, () => null, process)).status).toBe(405);
    expect((await handleWorkerRequest(probe('POST'), {}, () => new Response(null, { status: 401 }), process)).status).toBe(401);
    const authorize = vi.fn();
    expect((await handleWorkerRequest(probe('OPTIONS'), {}, authorize, process)).status).toBe(200);
    expect(authorize).not.toHaveBeenCalled();
    expect(process).not.toHaveBeenCalled();
    expect(await (await handleWorkerRequest(probe('POST'), {}, () => null, process)).text()).toBe('processed');
    expect(process).toHaveBeenCalledTimes(1);
  });
});

describe("database-managed worker credential", () => {
  it("sends only the digest to the verifier and fails closed", async () => {
    const { vaultWorkerAuthorization } = await import("../../../../../supabase/functions/_shared/webhook-worker-vault.ts");
    const token = "wfworker_" + "f".repeat(64);
    const request = req({ authorization: "Bearer " + token });
    const verify = vi.fn(async () => true);
    expect(await vaultWorkerAuthorization(request, verify)).toBeNull();
    expect(verify.mock.calls).toHaveLength(1);
    expect(verify.mock.calls[0]).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/)]);
    expect((await vaultWorkerAuthorization(request, async () => false))?.status).toBe(401);
    expect((await vaultWorkerAuthorization(request, async () => { throw new Error(); }))?.status).toBe(503);
    expect((await vaultWorkerAuthorization(req({ authorization: "Bearer wfworker_short" }), verify))?.status).toBe(401);
    expect(verify).toHaveBeenCalledTimes(1);
  });
});
