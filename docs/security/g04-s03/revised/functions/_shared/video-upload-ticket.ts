import { isUuid, safeObjectKey, storedKeyMatchesVersion, sameVideoContext, validateUploadFile, VideoContextError, type VideoContext } from './video-context.ts';

export interface UploadTicket extends VideoContext {
  user_id: string; key: string; file_name: string; file_size: number; expires_at: number; replace_version_id: string | null;
}
export const UPLOAD_URL_SECONDS = 2 * 60 * 60;
export const UPLOAD_TICKET_SECONDS = 4 * 60 * 60;
export class UploadTicketExpiredError extends VideoContextError {}
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
async function signingKey(secret: string) {
  if (!secret) throw new VideoContextError('Comprovante de upload indisponível');
  return crypto.subtle.importKey('raw', encoder.encode(`willflow:video-upload:v1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function issueUploadTicket(ticket: UploadTicket, secret: string): Promise<string> {
  const body = btoa(Array.from(encoder.encode(JSON.stringify(ticket)), byte => String.fromCharCode(byte)).join(''));
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
  try { ticket = JSON.parse(decoder.decode(Uint8Array.from(atob(body), char => char.charCodeAt(0)))); } catch { return fail(); }
  validateUploadFile(ticket.file_name, ticket.file_size);
  if (!sameVideoContext(ticket, expected) || ticket.user_id !== expected.user_id || !isUuid(ticket.user_id) || ticket.key !== expected.key || !safeObjectKey(ticket.key) || ticket.file_name !== expected.file_name || ticket.file_size !== expected.file_size || ticket.replace_version_id !== expected.replace_version_id || !Number.isFinite(ticket.expires_at)) return fail();
  if (!storedKeyMatchesVersion(ticket.key, { ...expected, uploaded_by: expected.user_id })) return fail();
  if (ticket.expires_at <= now) throw new UploadTicketExpiredError('Prazo do upload encerrado; selecione o arquivo novamente para iniciar um novo envio');
  return ticket;
}