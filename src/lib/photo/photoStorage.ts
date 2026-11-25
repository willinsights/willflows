import { supabase } from '@/integrations/supabase/client';

/** Error from the photo storage server; `stop` means retrying other files is pointless (plan, space, permission). */
export class PhotoStorageError extends Error {
  constructor(message: string, public stop = false) { super(message); }
}

export async function photoStorage<T = { ok: true }>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('photo-storage', { body });
  if (error) {
    let message = 'Não foi possível contactar o servidor';
    let status = 0;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      status = ctx.status;
      try { message = (await ctx.json()).error ?? message; } catch { /* keep default */ }
    }
    throw new PhotoStorageError(message, [402, 403, 413].includes(status));
  }
  return data as T;
}

/** Ask for an upload ticket, then send the file straight to Cloudflare. */
export async function putPhoto(ticket: Record<string, unknown>, file: Blob) {
  const { url, content_type } = await photoStorage<{ url: string; content_type: string }>({ action: 'upload-url', ...ticket });
  const res = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': content_type } });
  if (!res.ok) throw new PhotoStorageError('O envio para o armazenamento falhou');
}
