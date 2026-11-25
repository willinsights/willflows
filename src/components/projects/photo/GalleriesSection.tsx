import { getPublicShareOrigin } from '@/lib/publicShareOrigin';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Upload, Heart, MessageCircle, Plus, Send, CheckCircle2, PackageCheck, Euro, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildPreview } from '@/lib/photo/gallery';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { photoStorage, putPhoto, PhotoStorageError } from '@/lib/photo/photoStorage';
import type { Tables } from '@/integrations/supabase/types';

type Gallery = Tables<'photo_galleries'>;
type Photo = Tables<'gallery_photos'>;
type Comment = Tables<'photo_comments'>;

const STATUS: Record<string, string> = {
  draft: 'Rascunho', shared: 'Partilhada', selection_submitted: 'Seleção recebida', delivered: 'Entregue',
};
const eur = (n: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);

export function GalleriesSection({ projectId, workspaceId }: { projectId: string; workspaceId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { canUseFeature, loading: planLoading } = usePlanFeatures();
  const { data: galleries = [], isLoading, error } = useQuery({
    queryKey: ['photo-galleries', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('photo_galleries').select('*').eq('project_id', projectId).order('created_at');
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  const create = async () => {
    const { error } = await supabase.from('photo_galleries').insert({ project_id: projectId, workspace_id: workspaceId, title: `Galeria ${galleries.length + 1}`, created_by: user?.id });
    if (error) return toast.error('Não foi possível criar a galeria. Verifique se pode editar este projeto.');
    qc.invalidateQueries({ queryKey: ['photo-galleries', projectId] });
  };

  if (error) return <p className="text-sm text-destructive">Não foi possível carregar as galerias.</p>;
  if (!planLoading && !canUseFeature('photoGalleries') && !galleries.length) return (
    <section className="space-y-2 rounded-lg border border-dashed border-border p-6 text-center">
      <h3 className="font-semibold">Galerias para o cliente</h3>
      <p className="text-sm text-muted-foreground">As galerias de fotografia fazem parte do plano Studio.{galleries.length ? ' As galerias já partilhadas continuam acessíveis aos clientes.' : ''}</p>
      <Button size="sm" variant="outline" asChild><a href="/app/planos">Ver planos</a></Button>
    </section>
  );
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Galerias para o cliente</h3>
        <Button size="sm" disabled={!canUseFeature('photoGalleries')} onClick={create}><Plus className="mr-1 h-4 w-4" />Nova galeria</Button>
      </div>
      {isLoading ? <div className="h-24 animate-pulse rounded-lg bg-muted" /> :
        galleries.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Ainda não há galerias. Crie uma para enviar fotos ao cliente.</p> :
        galleries.map(g => <GalleryCard key={g.id} gallery={g} projectId={projectId} />)}
    </section>
  );
}

function GalleryCard({ gallery: g, projectId }: { gallery: Gallery; projectId: string }) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const previewInput = useRef<HTMLInputElement>(null);
  const finalInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<Photo | null>(null);
  const [form, setForm] = useState({
    delete_after_download: g.delete_after_download,
    delete_at: g.delete_at ? g.delete_at.slice(0, 10) : '',
    title: g.title, included_count: String(g.included_count), extra_price: String(g.extra_price),
    watermark_enabled: g.watermark_enabled, watermark_text: g.watermark_text ?? '',
    token_expires_at: g.token_expires_at ? g.token_expires_at.slice(0, 10) : '',
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['photo-galleries', projectId] });
    qc.invalidateQueries({ queryKey: ['gallery-photos', g.id] });
  };

  const { data } = useQuery({
    queryKey: ['gallery-photos', g.id],
    queryFn: async () => {
      const [{ data: photos, error }, { data: comments }] = await Promise.all([
        supabase.from('gallery_photos').select('*').eq('gallery_id', g.id).order('position'),
        supabase.from('photo_comments').select('*').eq('gallery_id', g.id).order('created_at'),
      ]);
      if (error) throw error;
      const signed = photos?.length ? await photoStorage<{ urls: Record<string, string | null> }>({ action: 'sign', gallery_id: g.id }) : { urls: {} };
      const urls = new Map((photos ?? []).map(p => [p.preview_path, signed.urls[p.id] ?? '']));
      return { photos: photos ?? [], comments: comments ?? [], urls };
    },
    refetchInterval: 30_000,
  });
  const photos = data?.photos ?? [];
  const comments = data?.comments ?? [];
  const favorites = photos.filter(p => p.is_favorite).length;
  const openComments = comments.filter(c => c.is_client && c.status === 'open' && !c.parent_id).length;
  const link = `${getPublicShareOrigin()}/galeria/${g.share_token}`;

  const save = async (extra: Partial<Gallery> = {}) => {
    const { error } = await supabase.from('photo_galleries').update({
      delete_after_download: form.delete_after_download,
      delete_at: form.delete_at ? new Date(`${form.delete_at}T23:59:59`).toISOString() : null,
      title: form.title.trim() || 'Galeria',
      included_count: Math.max(0, parseInt(form.included_count) || 0),
      extra_price: Math.max(0, parseFloat(form.extra_price.replace(',', '.')) || 0),
      watermark_enabled: form.watermark_enabled,
      watermark_text: form.watermark_text.trim() || null,
      token_expires_at: form.token_expires_at ? new Date(`${form.token_expires_at}T23:59:59`).toISOString() : null,
      updated_at: new Date().toISOString(),
      ...extra,
    }).eq('id', g.id);
    if (error) { toast.error('Não foi possível guardar'); return false; }
    invalidate();
    return true;
  };

  const uploadPreviews = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(`A enviar 0 de ${files.length}`);
    const wm = form.watermark_enabled ? (form.watermark_text.trim() || currentWorkspace?.name || '') : null;
    let pos = photos.length, ok = 0;
    for (const file of Array.from(files)) {
      try {
        const id = crypto.randomUUID();
        const { blob, width, height } = await buildPreview(file, { watermark: wm });
        await putPhoto({ gallery_id: g.id, photo_id: id, kind: 'preview', size: blob.size }, blob);
        await photoStorage({ action: 'confirm', gallery_id: g.id, photo_id: id, kind: 'preview', file_name: file.name, width, height, position: pos++ });
        ok++;
        setBusy(`A enviar ${ok} de ${files.length}`);
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof Error ? e.message : 'falhou'}`);
        if (e instanceof PhotoStorageError && e.stop) break;
      }
    }
    setBusy(null);
    qc.invalidateQueries({ queryKey: ['workspace-storage'] });
    if (ok) toast.success(`${ok} foto(s) enviadas`);
    invalidate();
  };

  const uploadFinals = async (files: FileList | null) => {
    if (!files?.length) return;
    const byName = new Map(photos.map(p => [p.file_name.toLowerCase(), p]));
    const favNames = new Set(photos.filter(p => p.is_favorite).map(p => p.file_name.toLowerCase()));
    let ok = 0, skipped = 0;
    setBusy('A enviar finais');
    for (const file of Array.from(files)) {
      const match = byName.get(file.name.toLowerCase());
      if (!match) { skipped++; continue; }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      try {
        await putPhoto({ gallery_id: g.id, photo_id: match.id, kind: 'original', ext, size: file.size, content_type: file.type || 'image/jpeg' }, file);
        await photoStorage({ action: 'confirm', gallery_id: g.id, photo_id: match.id, kind: 'original', ext });
        ok++;
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof Error ? e.message : 'falhou'}`);
        if (e instanceof PhotoStorageError && e.stop) break;
      }
    }
    setBusy(null);
    qc.invalidateQueries({ queryKey: ['workspace-storage'] });
    toast.success(`${ok} foto(s) finais enviadas${skipped ? ` · ${skipped} sem correspondência pelo nome` : ''}`);
    if (favNames.size && ok < favNames.size) toast.message('Dica: envie as finais com o mesmo nome dos ficheiros originais.');
    invalidate();
  };

  const removePhoto = async (p: Photo) => {
    try { await photoStorage({ action: 'delete', gallery_id: g.id, photo_id: p.id }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível remover'); }
    invalidate();
    qc.invalidateQueries({ queryKey: ['workspace-storage'] });
  };

  const removeGallery = async () => {
    setDeleting(true);
    try {
      await photoStorage({ action: 'delete-gallery', gallery_id: g.id, confirm: true });
      setDeleteOpen(false);
      invalidate();
      toast.success('Galeria encerrada. A exclusão dos arquivos será processada automaticamente.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível excluir'); }
    finally { setDeleting(false); }
  };

  const share = async () => {
    if (!photos.length) return toast.error('Envie fotos antes de partilhar');
    if (await save({ status: g.status === 'draft' ? 'shared' : g.status })) {
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success('Link copiado');
    }
  };

  const addExtrasToProject = async () => {
    const { error } = await supabase.rpc('add_gallery_extras_to_project', { p_gallery_id: g.id });
    if (error) return toast.error('Não foi possível somar ao valor do projeto');
    toast.success(`${eur(Number(g.extras_amount))} somados ao valor do projeto`);
    invalidate();
    qc.invalidateQueries({ queryKey: ['projects'] });
  };

  if (g.cleanup_started_at) return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <h4 className="font-semibold">{g.title}</h4>
      <Badge variant="secondary">Exclusão pendente</Badge>
      <p className="text-sm text-muted-foreground">O link foi encerrado. O espaço será liberado após a remoção dos arquivos, geralmente em até 2 horas.</p>
    </div>
  );

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{g.title}</h4>
          <Badge variant="secondary">{STATUS[g.status]}</Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{favorites}{g.included_count ? ` de ${g.included_count}` : ''}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{openComments} por resolver</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label>Nome</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={120} /></div>
        <div className="space-y-1"><Label>Link válido até (opcional)</Label><Input type="date" value={form.token_expires_at} onChange={e => setForm(f => ({ ...f, token_expires_at: e.target.value }))} /></div>
        <div className="space-y-1"><Label>Fotos incluídas (0 = sem limite)</Label><Input inputMode="numeric" value={form.included_count} onChange={e => setForm(f => ({ ...f, included_count: e.target.value }))} /></div>
        <div className="space-y-1"><Label>Preço por foto extra (€)</Label><Input inputMode="decimal" value={form.extra_price} onChange={e => setForm(f => ({ ...f, extra_price: e.target.value }))} /></div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch checked={form.watermark_enabled} onCheckedChange={v => setForm(f => ({ ...f, watermark_enabled: v }))} id={`wm-${g.id}`} />
          <Label htmlFor={`wm-${g.id}`}>Marca de água nas pré-visualizações</Label>
          {form.watermark_enabled && <Input className="max-w-[220px]" placeholder={currentWorkspace?.name ?? 'Texto'} value={form.watermark_text} onChange={e => setForm(f => ({ ...f, watermark_text: e.target.value }))} maxLength={60} />}
        </div>
        {form.watermark_enabled && <p className="text-xs text-muted-foreground sm:col-span-2">A marca de água é aplicada às fotos enviadas a partir de agora. As fotos finais são entregues sem marca de água.</p>}
      </div>

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor={`delete-at-${g.id}`}>Excluir automaticamente em (opcional)</Label><Input id={`delete-at-${g.id}`} type="date" value={form.delete_at} onChange={e => setForm(f => ({ ...f, delete_at: e.target.value }))} /></div>
        <div className="flex items-center gap-3"><Switch id={`delete-download-${g.id}`} checked={form.delete_after_download} onCheckedChange={v => setForm(f => ({ ...f, delete_after_download: v }))} /><Label htmlFor={`delete-download-${g.id}`}>Excluir após o cliente confirmar o download</Label></div>
        <p className="text-xs text-muted-foreground sm:col-span-2">A exclusão é definitiva e encerra o link. O espaço é liberado após remover as fotos. Se as duas opções estiverem ativas, vale a primeira que acontecer.</p>
        <p className="text-sm text-muted-foreground sm:col-span-2">Espaço desta galeria: {(photos.reduce((total, p) => total + Number(p.size_bytes), 0) / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB{g.download_confirmed_at ? ` · Recebimento confirmado em ${new Date(g.download_confirmed_at).toLocaleDateString('pt-BR')}` : ''}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => save()}>Guardar</Button>
        <Button size="sm" variant="destructive" disabled={!!busy} onClick={() => setDeleteOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Excluir galeria</Button>
        <input ref={previewInput} type="file" accept="image/*" multiple hidden onChange={e => { uploadPreviews(e.target.files); e.target.value = ''; }} />
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => previewInput.current?.click()}><Upload className="mr-1 h-4 w-4" />{busy ?? 'Enviar fotos'}</Button>
        <Button size="sm" onClick={share}><Copy className="mr-1 h-4 w-4" />{g.status === 'draft' ? 'Partilhar e copiar link' : 'Copiar link'}</Button>
        {g.status === 'selection_submitted' && (
          <Button size="sm" variant="outline" onClick={() => save({ status: 'shared', selection_submitted_at: null })}>Reabrir seleção</Button>
        )}
        {g.status !== 'draft' && (
          <>
            <input ref={finalInput} type="file" accept="image/*" multiple hidden onChange={e => { uploadFinals(e.target.files); e.target.value = ''; }} />
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => finalInput.current?.click()}><Upload className="mr-1 h-4 w-4" />Enviar fotos finais</Button>
          </>
        )}
        {g.status === 'selection_submitted' && photos.some(p => p.original_path) && (
          <Button size="sm" onClick={() => save({ status: 'delivered', delivered_at: new Date().toISOString() })}><PackageCheck className="mr-1 h-4 w-4" />Libertar entrega</Button>
        )}
      </div>

      {g.selection_submitted_at && (
        <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
          <p><strong>{g.client_name || 'Cliente'}</strong> enviou {favorites} favoritas em {new Date(g.selection_submitted_at).toLocaleDateString('pt-PT')}.</p>
          {g.client_note && <p className="text-muted-foreground">“{g.client_note}”</p>}
          {g.extras_count > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span>{g.extras_count} extras × {eur(Number(g.extra_price))} = <strong>{eur(Number(g.extras_amount))}</strong></span>
              {g.extras_paid_at ? <Badge>Pago</Badge> : <Button size="sm" variant="outline" onClick={() => save({ extras_paid_at: new Date().toISOString() })}><Euro className="mr-1 h-4 w-4" />Marcar como pago</Button>}
              {g.extras_added_to_project_at ? <Badge variant="secondary">Somado ao valor do projeto</Badge> : <Button size="sm" variant="outline" onClick={addExtrasToProject}>Somar ao valor do projeto</Button>}
            </div>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map(p => {
            const n = comments.filter(c => c.photo_id === p.id && c.is_client && c.status === 'open' && !c.parent_id).length;
            return (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
                <button className="h-full w-full" onClick={() => setOpenPhoto(p)} aria-label={`Abrir ${p.file_name}`}>
                  {data?.urls.get(p.preview_path) && <img src={data.urls.get(p.preview_path)} alt={p.file_name} loading="lazy" className="h-full w-full object-cover" />}
                </button>
                {p.is_favorite && <Heart className="absolute left-1 top-1 h-4 w-4 fill-primary text-primary" />}
                {n > 0 && <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{n}</span>}
                {p.original_path && <CheckCircle2 className="absolute bottom-1 left-1 h-4 w-4 text-primary" />}
                <button onClick={() => removePhoto(p)} className="absolute bottom-1 right-1 hidden rounded bg-background/80 p-1 group-hover:block" aria-label="Remover foto"><Trash2 className="h-3 w-3" /></button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir {g.title}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Todas as fotos, favoritas e comentários serão excluídos definitivamente. O link do cliente será encerrado agora; o espaço será liberado após a remoção dos arquivos, geralmente em até 2 horas. Guarde uma cópia antes de continuar.</p>
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={deleting} onClick={removeGallery}>{deleting ? 'Aguarde…' : 'Confirmar exclusão'}</Button></div>
        </DialogContent>
      </Dialog>

      {openPhoto && (
        <StudioPhotoDialog photo={openPhoto} url={data?.urls.get(openPhoto.preview_path) ?? ''} comments={comments.filter(c => c.photo_id === openPhoto.id)} onClose={() => setOpenPhoto(null)} onChange={invalidate} />
      )}
    </div>
  );
}

function StudioPhotoDialog({ photo, url, comments, onClose, onChange }: { photo: Photo; url: string; comments: Comment[]; onClose: () => void; onChange: () => void }) {
  const { user } = useAuth();
  const [reply, setReply] = useState<Record<string, string>>({});
  const roots = comments.filter(c => !c.parent_id);

  const sendReply = async (c: Comment) => {
    const body = reply[c.id]?.trim();
    if (!body) return;
    const { error } = await supabase.from('photo_comments').insert({ photo_id: photo.id, gallery_id: photo.gallery_id, workspace_id: photo.workspace_id, parent_id: c.id, body, is_client: false, created_by: user?.id });
    if (error) return toast.error('Não foi possível responder');
    setReply(r => ({ ...r, [c.id]: '' }));
    onChange();
  };
  const resolve = async (c: Comment) => {
    await supabase.from('photo_comments').update({ status: c.status === 'open' ? 'resolved' : 'open' }).eq('id', c.id);
    onChange();
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle className="truncate">{photo.file_name}</DialogTitle></DialogHeader>
        <div className="relative">
          <img src={url} alt={photo.file_name} className="w-full rounded-md" />
          {roots.filter(c => c.x != null).map((c, i) => (
            <span key={c.id} style={{ left: `${c.x}%`, top: `${c.y}%` }} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 text-xs font-semibold ${c.status === 'open' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
          ))}
        </div>
        <div className="space-y-3">
          {roots.length === 0 && <p className="text-sm text-muted-foreground">Sem comentários nesta foto.</p>}
          {roots.map((c, i) => (
            <div key={c.id} className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p><strong>{i + 1}. {c.is_client ? c.author_name || 'Cliente' : 'Estúdio'}:</strong> {c.body}</p>
                <Button size="sm" variant="ghost" onClick={() => resolve(c)}>{c.status === 'open' ? 'Resolver' : 'Reabrir'}</Button>
              </div>
              {comments.filter(r => r.parent_id === c.id).map(r => <p key={r.id} className="pl-4 text-muted-foreground">↳ {r.is_client ? r.author_name || 'Cliente' : 'Estúdio'}: {r.body}</p>)}
              <div className="flex gap-2">
                <Textarea rows={1} value={reply[c.id] ?? ''} onChange={e => setReply(r => ({ ...r, [c.id]: e.target.value }))} placeholder="Responder" />
                <Button size="icon" onClick={() => sendReply(c)} aria-label="Enviar resposta"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
