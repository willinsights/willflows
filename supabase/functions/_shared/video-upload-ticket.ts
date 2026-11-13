import { isUuid, safeObjectKey, sameVideoContext, validateUploadFile, VideoContextError, type VideoContext } from './video-context.ts';

export interface UploadTicket extends VideoContext {
  user_id: string; key: string; file_name: string; file_size: number; expires_at: number; replace_version_id: string | null;
}
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
async function signingKey(secret: string) {
  if (!secret) throw new VideoContextError('Comprovante de upload indisponível');
  return crypto.subtle.importKey('raw', encoder.encode(`willflow:video-upload:v1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function issueUploadTicket(ticket: UploadTicket, secret: string): Promise<string> {
  const body = btoa(JSON.stringify(ticket));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(body));
  return `${body}.${hex(signature)}`;
}
export async function verifyUploadTicket(value: unknown, expected: Omit<UploadTicket, 'expires_at'>, secret: string, now = Date.now()): Promise<UploadTicket> {
  const fail = (): never => { throw new VideoContextError('Upload não confirmado; envie o arquivo novamente'); };
  if (typeof value !== 'string' || value.length > 8192) return fail();
  const [body, signature, extra] = value.split('.');
  if (!body || !signature || extra || !/^[a-f0-9]{64}$/.test(signature)) return fail();
  const bytes = new Uint8Array(signature.match(/../g)?.map(byte => parseInt(byte, 16)) || []);
  if (!await crypto.subtle.verify('HMAC', await signingKey(secret), bytes, encoder.encode(body))) return fail();
  let ticket: UploadTicket;
  try { ticket = JSON.parse(atob(body)); } catch { return fail(); }
  validateUploadFile(ticket.file_name, ticket.file_size);
  if (!sameVideoContext(ticket, expected) || ticket.user_id !== expected.user_id || !isUuid(ticket.user_id) || ticket.key !== expected.key || !safeObjectKey(ticket.key) || ticket.file_name !== expected.file_name || ticket.file_size !== expected.file_size || ticket.replace_version_id !== expected.replace_version_id || !Number.isFinite(ticket.expires_at) || ticket.expires_at <= now) return fail();
  const parts = ticket.key.split('/');
  if (parts.length !== 5 || parts[0] !== ticket.workspace_id || parts[1] !== ticket.project_id || parts[2] !== (ticket.task_id || 'project') || parts[3] !== ticket.user_id) return fail();
  return ticket;
}