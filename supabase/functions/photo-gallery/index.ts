// Public client access to a photo gallery via its private share token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { clientIdentifier, isRateLimited, logAttempt, rateLimitResponse } from '../_shared/rate-limit.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const UUID = /^[0-9a-f-]{36}$/i;
const TOKEN = /^[0-9a-f]{48}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não suportado' }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  const token = String(body.token ?? '');
  const action = String(body.action ?? 'get');
  if (!TOKEN.test(token)) return json({ error: 'Link inválido' }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const ident = clientIdentifier(req, token);
  if (await isRateLimited(db, ident, 'photo_gallery')) return rateLimitResponse(corsHeaders);

  const { data: g } = await db.from('photo_galleries').select('*').eq('share_token', token).maybeSingle();
  if (!g || g.status === 'draft') { await logAttempt(db, ident, 'photo_gallery', false); return json({ error: 'Galeria não encontrada' }, 404); }
  if (g.token_expires_at && new Date(g.token_expires_at) <= new Date()) return json({ error: 'Este link expirou. Peça um novo ao estúdio.' }, 410);

  const { data: ws } = await db.from('workspaces').select('name, logo_url').eq('id', g.workspace_id).maybeSingle();
  const locked = g.status !== 'shared';

  const photoOf = async (id: unknown) => {
    if (typeof id !== 'string' || !UUID.test(id)) return null;
    const { data } = await db.from('gallery_photos').select('id, gallery_id, original_path').eq('id', id).eq('gallery_id', g.id).maybeSingle();
    return data;
  };

  if (action === 'favorite') {
    if (locked) return json({ error: 'A seleção já foi enviada' }, 409);
    const p = await photoOf(body.photo_id);
    if (!p) return json({ error: 'Foto não encontrada' }, 404);
    const fav = body.favorite === true;
    await db.from('gallery_photos').update({ is_favorite: fav, favorited_at: fav ? new Date().toISOString() : null }).eq('id', p.id);
    return json({ ok: true });
  }

  if (action === 'comment') {
    const p = await photoOf(body.photo_id);
    if (!p) return json({ error: 'Foto não encontrada' }, 404);
    const text = String(body.body ?? '').trim();
    const name = String(body.name ?? '').trim().slice(0, 80) || null;
    const x = Number(body.x), y = Number(body.y);
    if (!text || text.length > 2000) return json({ error: 'Escreva um comentário (até 2000 caracteres)' }, 400);
    if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) return json({ error: 'Ponto inválido' }, 400);
    const { error } = await db.from('photo_comments').insert({ photo_id: p.id, gallery_id: g.id, workspace_id: g.workspace_id, x, y, body: text, is_client: true, author_name: name });
    if (error) return json({ error: 'Não foi possível guardar o comentário' }, 500);
    return json({ ok: true });
  }

  if (action === 'submit') {
    if (locked) return json({ error: 'A seleção já foi enviada' }, 409);
    const { count } = await db.from('gallery_photos').select('id', { count: 'exact', head: true }).eq('gallery_id', g.id).eq('is_favorite', true);
    const favorites = count ?? 0;
    if (favorites === 0) return json({ error: 'Escolha pelo menos uma foto' }, 400);
    const extras = g.included_count > 0 ? Math.max(0, favorites - g.included_count) : 0;
    const amount = Math.round(extras * Number(g.extra_price) * 100) / 100;
    await db.from('photo_galleries').update({
      status: 'selection_submitted', selection_submitted_at: new Date().toISOString(),
      extras_count: extras, extras_amount: amount,
      client_name: String(body.name ?? '').trim().slice(0, 80) || null,
      client_note: String(body.note ?? '').trim().slice(0, 2000) || null,
    }).eq('id', g.id).eq('status', 'shared');
    return json({ ok: true, extras, amount });
  }

  if (action === 'download') {
    if (g.status !== 'delivered') return json({ error: 'A entrega ainda não está disponível' }, 409);
    const { data: rows } = await db.from('gallery_photos').select('id, file_name, original_path').eq('gallery_id', g.id).not('original_path', 'is', null).order('position');
    const urls = [];
    for (const r of rows ?? []) {
      const { data } = await db.storage.from('gallery-photos').createSignedUrl(r.original_path!, 600, { download: r.file_name });
      if (data) urls.push({ id: r.id, file_name: r.file_name, url: data.signedUrl });
    }
    return json({ files: urls });
  }

  // get
  const { data: photos } = await db.from('gallery_photos').select('id, file_name, preview_path, width, height, is_favorite, position, original_path').eq('gallery_id', g.id).order('position');
  const paths = (photos ?? []).map(p => p.preview_path);
  const signed = paths.length ? (await db.storage.from('gallery-photos').createSignedUrls(paths, 3600)).data ?? [] : [];
  const urlBy = new Map(signed.map(s => [s.path, s.signedUrl]));
  const { data: comments } = await db.from('photo_comments').select('id, photo_id, parent_id, x, y, body, is_client, author_name, status, created_at').eq('gallery_id', g.id).order('created_at');
  await logAttempt(db, ident, 'photo_gallery', true);
  return json({
    studio: { name: ws?.name ?? '', logo_url: ws?.logo_url ?? null },
    gallery: {
      title: g.title, status: g.status, included_count: g.included_count, extra_price: Number(g.extra_price),
      selection_submitted_at: g.selection_submitted_at, extras_count: g.extras_count, extras_amount: Number(g.extras_amount),
      has_delivery: g.status === 'delivered' && (photos ?? []).some(p => p.original_path),
    },
    photos: (photos ?? []).map(p => ({ id: p.id, file_name: p.file_name, width: p.width, height: p.height, is_favorite: p.is_favorite, url: urlBy.get(p.preview_path) ?? null })),
    comments: comments ?? [],
  });
});
