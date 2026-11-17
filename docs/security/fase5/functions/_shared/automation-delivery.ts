// Exact per-job identity: separate legitimate events never share delivery keys.
export async function deliveryId(workspaceId: string, jobId: string, automationId: string, channel: string, recipient: string): Promise<string> {
  const input = JSON.stringify([workspaceId, jobId, automationId, channel, recipient.trim().toLowerCase()]);
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}