// Studio-side photo storage: upload tickets, server-measured confirmation, signed reads and deletion.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { deleteObject, looksLikeImage, objectHead, objectSize, photoKey, presign, readUrl } from '../_shared/photo-r2.ts';
import { removeStoredPhoto } from '../_shared/photo-retention.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT = /^(jpg|jpeg|png|webp|heic|heif|tif|tiff)$/;
const MAX_FILE = 200 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não suportado' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Sessão inválida' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'Serviço indisponível' }, 503);
  const userDb = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: claims } = await userDb.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub;
  if (!uid || !UUID.test(uid)) return json({ error: 'Sessão inválida' }, 401);
  const db = createClient(url, serviceKey);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  const action = String(body.action ?? '');
  const galleryId = String(body.gallery_id ?? '');
  if (!UUID.test(galleryId)) return json({ error: 'Galeria inválida' }, 400);

  const { data: g } = await db.from('photo_galleries').select('id, workspace_id, project_id, cleanup_started_at, cleanup_after').eq('id', galleryId).maybeSingle();
  if (!g) return json({ error: 'Galeria não encontrada' }, 404);

  if (g.cleanup_started_at && action !== 'delete-gallery') return json({ error: 'Esta galeria está aguardando exclusão.' }, 410);

  if (action !== 'delete-gallery') {
    const { data: allowed } = await userDb.rpc('can_access_feature', { p_workspace_id: g.workspace_id, p_feature: 'photoGalleries' });
    if (!allowed) return json({ error: 'As galerias de fotografia fazem parte do plano Studio.' }, 402);
  }

  if (action === 'sign') {
    const { data: member } = await userDb.rpc('is_workspace_member', { _user_id: uid, _workspace_id: g.workspace_id });
    if (!member) return json({ error: 'Sem acesso' }, 403);
    const { data: rows } = await db.from('gallery_photos').select('id, preview_path, storage_provider').eq('gallery_id', g.id);
    const urls: Record<string, string | null> = {};
    for (const r of rows ?? []) urls[r.id] = await readUrl(db, r.storage_provider, r.preview_path, 3600);
    return json({ urls });
  }

  const { data: canEdit } = await userDb.rpc('can_edit_project', { _user_id: uid, _project_id: g.project_id });
  if (!canEdit) return json({ error: 'Sem permissão para editar este projeto' }, 403);

  if (action === 'delete-gallery') {
    if (body.confirm !== true) return json({ error: 'Confirme a exclusão da galeria' }, 400);
    const { error } = await db.rpc('queue_gallery_cleanup', { p_gallery_id: g.id });
    if (error) return json({ error: 'Não foi possível agendar a exclusão' }, 500);
    return json({ ok: true, pending: true });
  }

  const photoId = String(body.photo_id ?? '');
  if (!UUID.test(photoId)) return json({ error: 'Foto inválida' }, 400);

  if (action === 'delete') {
    const { data: p } = await db.from('gallery_photos').select('id, preview_path, original_path, storage_provider').eq('id', photoId).eq('gallery_id', g.id).maybeSingle();
    if (!p) return json({ ok: true });
    try {
      await removeStoredPhoto(p, deleteObject, async paths => {
        const { error } = await db.storage.from('gallery-photos').remove(paths);
        if (error) throw error;
      }, async id => {
        const { error } = await db.from('gallery_photos').delete().eq('id', id);
        if (error) throw error;
      });
    } catch { return json({ error: 'Não foi possível remover os arquivos. Tente novamente.' }, 502); }
    return json({ ok: true });
  }

  const kind = body.kind === 'original' ? 'original' : 'preview';
  const ext = kind === 'preview' ? 'jpg' : String(body.ext ?? '').toLowerCase();
  if (!EXT.test(ext)) return json({ error: 'Formato de imagem não suportado' }, 400);
  const key = photoKey(g.workspace_id, g.id, photoId, kind, ext);

  if (action === 'upload-url') {
    const size = Number(body.size);
    if (!(size > 0 && size <= MAX_FILE)) return json({ error: 'Ficheiro demasiado grande (máx. 200 MB)' }, 400);
    const { data: quota } = await db.rpc('check_storage_quota', { p_workspace_id: g.workspace_id, p_file_size_bytes: size });
    if (!quota?.allowed) return json({ error: 'O espaço do estúdio está cheio. Liberte espaço ou aumente o armazenamento.' }, 413);
    const contentType = kind === 'preview' ? 'image/jpeg' : String(body.content_type || 'application/octet-stream').slice(0, 100);
    const { data: reserved, error } = await db.rpc('reserve_gallery_upload', { p_gallery_id: g.id });
    if (error || !reserved) return json({ error: 'A galeria já não aceita envios' }, 409);
    return json({ url: await presign(key, 'PUT', 900, { contentType }), content_type: contentType });
  }

  if (action === 'confirm') {
    const size = await objectSize(key);
    if (size == null) return json({ error: 'Ficheiro não recebido' }, 409);
    // The PUT ticket cannot bind byte length: verify the stored object's real size, type and quota.
    const head = await objectHead(key);
    const okType = kind === 'preview' ? head?.type === 'image/jpeg' : /^image\//.test(head?.type ?? '');
    const { data: q } = await db.rpc('check_storage_quota', { p_workspace_id: g.workspace_id, p_file_size_bytes: size });
    if (!(size > 0 && size <= MAX_FILE) || !okType || !(await looksLikeImage(key)) || !q?.allowed) {
      await deleteObject(key);
      return json({ error: 'Ficheiro inválido, demasiado grande ou sem espaço disponível' }, 413);
    }
    if (kind === 'preview') {
      const { error } = await db.from('gallery_photos').insert({
        id: photoId, gallery_id: g.id, workspace_id: g.workspace_id, storage_provider: 'r2', preview_path: key, size_bytes: size,
        file_name: String(body.file_name ?? 'foto.jpg').slice(0, 255),
        width: Number(body.width) || null, height: Number(body.height) || null, position: Math.max(0, Number(body.position) || 0),
      });
      if (error) { await deleteObject(key); return json({ error: 'Não foi possível guardar a foto' }, 500); }
      return json({ ok: true });
    }
    const { data: p } = await db.from('gallery_photos').select('id, size_bytes, original_path, storage_provider').eq('id', photoId).eq('gallery_id', g.id).maybeSingle();
    if (!p) { await deleteObject(key); return json({ error: 'Foto não encontrada' }, 404); }
    if (p.storage_provider !== 'r2') { await deleteObject(key); return json({ error: 'Envie de novo a pré-visualização desta foto' }, 409); }
    if (p.original_path && p.original_path !== key) await deleteObject(p.original_path);
    const { data: pv } = await db.from('gallery_photos').select('preview_path').eq('id', p.id).single();
    const previewBytes = pv?.preview_path ? (await objectSize(pv.preview_path)) ?? 0 : 0;
    await db.from('gallery_photos').update({ original_path: key, size_bytes: previewBytes + size }).eq('id', p.id);
    return json({ ok: true });
  }

  return json({ error: 'Ação desconhecida' }, 400);
});
