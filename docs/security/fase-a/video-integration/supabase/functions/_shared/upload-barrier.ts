// Issuance only: let previously issued requests finish during a controlled drain.
export async function uploadIssuanceOpen(db: { rpc: (name: string) => Promise<{ data: unknown; error: unknown }> }): Promise<boolean> {
  try {
    const result = await db.rpc('video_upload_issuance_open');
    return !result.error && result.data === true;
  } catch {
    return false;
  }
}