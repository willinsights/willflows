// Fail closed, no expiring lease: a crashed owner requires authorised reconciliation.
export async function withSafeCron(client: any, handler: string, work: () => Promise<Response>): Promise<Response> {
  const { data: token, error } = await client.rpc('claim_safe_cron', { p_handler: handler });
  if (error) throw new Error('Cron claim failed');
  if (!token) return Response.json({ skipped: true, reason: 'running_or_uncertain' }, { status: 409 });
  let response: Response;
  try { response = await work(); }
  catch {
    await client.rpc('finish_safe_cron', { p_handler: handler, p_token: token, p_uncertain: true });
    throw new Error('Cron uncertain; automatic recovery blocked');
  }
  const finished = await client.rpc('finish_safe_cron', { p_handler: handler, p_token: token, p_uncertain: !response.ok });
  if (finished.error) throw new Error('Cron completion failed; claim retained');
  return response;
}