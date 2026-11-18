// Isolated orchestration. Caller MUST authenticate, resolve context, verify signed
// operation ticket and HEAD object facts before calling this module.
export async function processDurableUpload(client: any, operationId: string, userId: string, bucket: string, copy: () => Promise<string>) {
  const result = await client.rpc('persist_video_operation', { p_id: operationId, p_user: userId, p_bucket: bucket });
  if (result.error || !result.data) throw new Error('Upload persistence refused');
  const claim = await client.rpc('claim_video_submission', { p_id: operationId });
  if (claim.error) throw new Error('Submission claim failed');
  if (!claim.data) return result.data; // processing/uncertain owner never replayed
  let uid: string;
  try { uid = await copy(); }
  catch {
    const done = await client.rpc('finish_video_submission', { p_id: operationId, p_token: claim.data, p_uid: null });
    if (done.error) throw new Error('Submission uncertain; claim retained');
    throw new Error('Submission uncertain; automatic retry blocked');
  }
  const done = await client.rpc('finish_video_submission', { p_id: operationId, p_token: claim.data, p_uid: uid });
  if (done.error) throw new Error('Provider result not confirmed; claim retained');
  return { ...result.data, state: 'processing' };
}