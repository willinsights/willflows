type Intent = "probe" | "run";

export async function handleSignedDispatch(
  request: Request,
  claim: (id: string, intent: Intent, signature: string) => Promise<boolean>,
  finish: (id: string, status: number) => Promise<boolean>,
  run: () => Promise<Response>,
): Promise<Response> {
  const id = request.headers.get("x-willflow-dispatch") ?? "";
  const intent = request.headers.get("x-willflow-intent");
  const signature = request.headers.get("x-willflow-signature") ?? "";
  if (request.method !== "POST" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) ||
      (intent !== "probe" && intent !== "run") || !/^[0-9a-f]{64}$/.test(signature)) {
    return new Response(null, { status: 401 });
  }
  try {
    if (!await claim(id, intent, signature)) return new Response(null, { status: 401 });
    const response = intent === "probe"
      ? new Response(null, { status: 204, headers: { "X-WillFlow-Worker-Probe": "1" } })
      : await run();
    if (!await finish(id, response.status)) return new Response(null, { status: 503 });
    // Signed messages may be relayed. Keep business data out of their responses.
    return new Response(null, { status: response.status, headers: intent === "probe" ? { "X-WillFlow-Worker-Probe": "1" } : {} });
  } catch {
    return new Response(null, { status: 503 });
  }
}
