import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { deleteObject, listGalleryObjects } from '../_shared/photo-r2.ts';
import { removeStoredPhoto } from '../_shared/photo-retention.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const refused = authenticateCronRequest(req);
  if (refused) return refused;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Configuration error', { status: 500 });
  const db = createClient(url, key);
  const now = new Date().toISOString();
  let removed = 0, failed = 0;
  try {
    // Explicit opt-in only; link expiry by itself never deletes existing galleries.
    const { data: due, error } = await db.from('photo_galleries').select('id')
      .is('cleanup_started_at', null)
      .or(`delete_at.lte.${now},and(delete_after_download.eq.true,download_confirmed_at.not.is.null)`)
      .limit(50);
    if (error) throw error;
    for (const g of due ?? []) {
      const { error } = await db.rpc('queue_gallery_cleanup', { p_gallery_id: g.id });
      if (error) throw error;
    }
    const { data: pending, error: pendingError } = await db.from('photo_galleries')
      .select('id, workspace_id').not('cleanup_started_at', 'is', null).lte('cleanup_after', now).limit(20);
    if (pendingError) throw pendingError;
    for (const g of pending ?? []) {
      try {
        const { data: photos, error } = await db.from('gallery_photos').select('*').eq('gallery_id', g.id);
        if (error) throw error;
        for (const p of photos ?? []) {
          await removeStoredPhoto(p, deleteObject, async paths => {
            const { error } = await db.storage.from('gallery-photos').remove(paths);
            if (error) throw error;
          }, async id => {
            const { error } = await db.from('gallery_photos').delete().eq('id', id).eq('gallery_id', g.id);
            if (error) throw error;
          });
        }
        for (const key of await listGalleryObjects(g.workspace_id, g.id)) await deleteObject(key);
        const { error: deleteError } = await db.from('photo_galleries').delete().eq('id', g.id).not('cleanup_started_at', 'is', null);
        if (deleteError) throw deleteError;
        removed++;
      } catch { failed++; }
    }
    return Response.json({ removed, failed }, { status: failed ? 500 : 200 });
  } catch {
    return Response.json({ error: 'Gallery cleanup failed' }, { status: 500 });
  }
});