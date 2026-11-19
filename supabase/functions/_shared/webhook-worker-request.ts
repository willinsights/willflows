type WorkerAction = (request: Request) => Promise<Response>;

export async function handleWorkerRequest(
  request: Request,
  headers: Record<string, string>,
  authorize: (request: Request) => Response | null | Promise<Response | null>,
  run: WorkerAction,
): Promise<Response> {
  const allow = "POST, HEAD, OPTIONS";
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: { ...headers, "Access-Control-Allow-Methods": allow, "X-WillFlow-Worker-Version": "vault-1", "X-WillFlow-Dispatch-Version": "1" } });
  }

  const authError = await authorize(request);
  if (authError) {
    const message = authError.status >= 500 ? "Server configuration error" : "Unauthorized";
    return new Response(request.method === "HEAD" ? null : JSON.stringify({ error: message }), {
      status: authError.status,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 204, headers: { ...headers, "Cache-Control": "no-store", "X-WillFlow-Worker-Probe": "1" } });
  }
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { ...headers, Allow: allow } });
  }
  return run(request);
}
