import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, MessageCircle, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { computeExtras, toPercentPoint } from '@/lib/photo/gallery';

interface Data {
  studio: { name: string; logo_url: string | null };
  gallery: { delete_after_download: boolean; delete_at: string | null; download_requested_at: string | null; download_confirmed_at: string | null; title: string; status: string; included_count: number; extra_price: number; selection_submitted_at: string | null; extras_count: number; extras_amount: number; has_delivery: boolean };
  photos: { id: string; file_name: string; is_favorite: boolean; url: string | null }[];
  comments: { id: string; photo_id: string; parent_id: string | null; x: number | null; y: number | null; body: string; is_client: boolean; author_name: string | null; status: string }[];
}
const eur = (n: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);

export default function PhotoGallery() {
  const { token = '' } = useParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState('');
  const [name, setName] = useState(() => localStorage.getItem('gallery-client-name') ?? '');
  const [note, setNote] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [received, setReceived] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('photo-gallery', { body: { token, ...body } });
    if (error) {
      let msg = 'Não foi possível carregar a galeria.';
      try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg; } catch { /* keep */ }
      throw new Error(msg);
    }
    return data;
  }, [token]);

  const load = useCallback(async () => {
    try { setData(await call({ action: 'get' })); setError(null); } catch (e) { setError((e as Error).message); }
  }, [call]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Shell><p className="py-24 text-center text-muted-foreground">{error}</p></Shell>;
  if (!data) return <Shell><div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></Shell>;

  const { gallery: g, photos, comments, studio } = data;
  const locked = g.status !== 'shared';
  const favCount = photos.filter(p => p.is_favorite).length;
  const summary = computeExtras(favCount, g.included_count, g.extra_price);
  const current = open != null ? photos[open] : null;

  const toggleFav = async (id: string, fav: boolean) => {
    if (locked) return;
    setData(d => d && { ...d, photos: d.photos.map(p => p.id === id ? { ...p, is_favorite: fav } : p) });
    try { await call({ action: 'favorite', photo_id: id, favorite: fav }); } catch (e) { toast.error((e as Error).message); load(); }
  };

  const sendComment = async () => {
    if (!current || !pin || !text.trim()) return;
    setBusy(true);
    try {
      localStorage.setItem('gallery-client-name', name);
      await call({ action: 'comment', photo_id: current.id, x: pin.x, y: pin.y, body: text, name });
      setText(''); setPin(null); await load(); toast.success('Comentário enviado');
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try { await call({ action: 'submit', name, note }); setSubmitOpen(false); await load(); toast.success('Seleção enviada ao estúdio'); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const download = async () => {
    setBusy(true);
    try {
      const { files } = await call({ action: 'download' });
      if (!files.length) throw new Error('Nenhuma foto final disponível');
      for (const f of files as { url: string; file_name: string }[]) {
        const a = document.createElement('a'); a.href = f.url; a.download = f.file_name; document.body.appendChild(a); a.click(); a.remove();
        await new Promise(r => setTimeout(r, 400));
      }
      setDownloadStarted(true);
      setReceived(false);
      setConfirmOpen(true);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const confirmDownload = async () => {
    if (!received) return;
    setBusy(true);
    try {
      const result = await call({ action: 'confirm-download', confirm: true });
      setConfirmOpen(false);
      if (result.closed) setError('Recebimento confirmado. Esta galeria foi encerrada pelo estúdio.');
      else { await load(); toast.success('Recebimento confirmado'); }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Shell studio={studio} title={g.title}>
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="text-sm">
          <span className="font-semibold">{favCount}{g.included_count ? ` de ${g.included_count}` : ''}</span> favoritas
          {summary.extras > 0 && <span className="ml-2 text-muted-foreground">· {summary.extras} extras × {eur(g.extra_price)} = <strong className="text-foreground">{eur(summary.amount)}</strong></span>}
        </div>
        {g.status === 'shared' && <Button onClick={() => setSubmitOpen(true)} disabled={!favCount}>Enviar seleção</Button>}
        {g.status === 'selection_submitted' && <p className="text-sm text-muted-foreground">Seleção enviada. O estúdio vai preparar as fotos finais.</p>}
        {g.status === 'delivered' && g.has_delivery && <Button onClick={download} disabled={busy}><Download className="mr-1 h-4 w-4" />Descarregar fotos</Button>}
      </div>

      {g.delete_at && <p className="mb-4 text-sm text-muted-foreground">Fotos disponíveis até {new Date(g.delete_at).toLocaleDateString('pt-BR')}. Depois serão excluídas pelo estúdio.</p>}
      {g.delete_after_download && <p className="mb-4 text-sm text-muted-foreground">Após confirmar que recebeu todas as fotos, esta galeria será encerrada e as fotos serão excluídas.</p>}
      {g.status === 'delivered' && !g.download_confirmed_at && (downloadStarted || g.download_requested_at) && <Button variant="outline" className="mb-4" onClick={() => { setReceived(false); setConfirmOpen(true); }}>Confirmar recebimento das fotos</Button>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recebeu todas as fotos?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Aguarde os downloads terminarem e confira os arquivos antes de confirmar.{g.delete_after_download ? ' Esta confirmação encerra o link e autoriza a exclusão definitiva das fotos.' : ''}</p>
          <div className="flex items-start gap-3"><Checkbox id="photos-received" checked={received} onCheckedChange={v => setReceived(v === true)} /><Label htmlFor="photos-received">Já guardei e conferi todas as fotos.</Label></div>
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>Ainda não</Button><Button onClick={confirmDownload} disabled={!received || busy}>Confirmar recebimento</Button></div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => {
          const n = comments.filter(c => c.photo_id === p.id && !c.parent_id).length;
          return (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
              <button className="h-full w-full" onClick={() => { setOpen(i); setPin(null); }} aria-label={`Abrir ${p.file_name}`}>
                {p.url && <img src={p.url} alt={p.file_name} loading="lazy" className="h-full w-full object-cover" onContextMenu={e => e.preventDefault()} />}
              </button>
              <button disabled={locked} onClick={() => toggleFav(p.id, !p.is_favorite)} aria-label={p.is_favorite ? 'Remover das favoritas' : 'Marcar como favorita'} className="absolute right-2 top-2 rounded-full bg-background/80 p-2">
                <Heart className={p.is_favorite ? 'h-5 w-5 fill-primary text-primary' : 'h-5 w-5'} />
              </button>
              {n > 0 && <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/80 px-2 text-xs"><MessageCircle className="h-3 w-3" />{n}</span>}
            </div>
          );
        })}
      </div>

      {current && (
        <Dialog open onOpenChange={o => !o && setOpen(null)}>
          <DialogContent className="max-h-[95vh] max-w-5xl overflow-y-auto">
            <DialogHeader><DialogTitle className="truncate">{current.file_name}</DialogTitle></DialogHeader>
            <div className="relative select-none">
              <img src={current.url ?? ''} alt={current.file_name} className="w-full cursor-crosshair rounded-md" onContextMenu={e => e.preventDefault()}
                onClick={e => setPin(toPercentPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()))} />
              {comments.filter(c => c.photo_id === current.id && !c.parent_id && c.x != null).map((c, i) => (
                <span key={c.id} style={{ left: `${c.x}%`, top: `${c.y}%` }} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">{i + 1}</span>
              ))}
              {pin && <span style={{ left: `${pin.x}%`, top: `${pin.y}%` }} className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/30" />}
              <button onClick={() => { setOpen(Math.max(0, (open ?? 0) - 1)); setPin(null); }} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => { setOpen(Math.min(photos.length - 1, (open ?? 0) + 1)); setPin(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2" aria-label="Seguinte"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="flex items-center justify-between">
              <Button variant={current.is_favorite ? 'default' : 'outline'} disabled={locked} onClick={() => toggleFav(current.id, !current.is_favorite)}>
                <Heart className="mr-1 h-4 w-4" />{current.is_favorite ? 'Favorita' : 'Marcar favorita'}
              </Button>
              <p className="text-xs text-muted-foreground">Toque na foto para marcar um ponto e comentar.</p>
            </div>
            {pin && (
              <div className="space-y-2">
                <Input placeholder="O seu nome" value={name} onChange={e => setName(e.target.value)} maxLength={80} />
                <Textarea placeholder="Ex.: tirar este reflexo" value={text} onChange={e => setText(e.target.value)} maxLength={2000} />
                <div className="flex gap-2"><Button onClick={sendComment} disabled={busy || !text.trim()}>Enviar comentário</Button><Button variant="ghost" onClick={() => setPin(null)}>Cancelar</Button></div>
              </div>
            )}
            {comments.filter(c => c.photo_id === current.id && !c.parent_id).map((c, i) => (
              <div key={c.id} className="rounded-md border border-border p-2 text-sm">
                <p><strong>{i + 1}. {c.is_client ? c.author_name || 'Cliente' : studio.name}:</strong> {c.body} {c.status === 'resolved' && <span className="text-xs text-muted-foreground">(resolvido)</span>}</p>
                {comments.filter(r => r.parent_id === c.id).map(r => <p key={r.id} className="pl-4 text-muted-foreground">↳ {r.is_client ? r.author_name || 'Cliente' : studio.name}: {r.body}</p>)}
              </div>
            ))}
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar seleção</DialogTitle></DialogHeader>
          <p className="text-sm">Escolheu <strong>{favCount}</strong> fotos{g.included_count ? ` (${g.included_count} incluídas)` : ''}.</p>
          {summary.extras > 0 && <p className="text-sm">{summary.extras} fotos extra × {eur(g.extra_price)} = <strong>{eur(summary.amount)}</strong>. O estúdio vai combinar o pagamento consigo.</p>}
          <Input placeholder="O seu nome" value={name} onChange={e => setName(e.target.value)} maxLength={80} />
          <Textarea placeholder="Nota para o estúdio (opcional)" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} />
          <p className="text-xs text-muted-foreground">Depois de enviar, já não pode alterar as favoritas.</p>
          <Button onClick={submit} disabled={busy}>{busy ? 'A enviar…' : 'Confirmar e enviar'}</Button>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Shell({ children, studio, title }: { children: React.ReactNode; studio?: { name: string; logo_url: string | null }; title?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet><title>{title ? `${title}${studio?.name ? ` · ${studio.name}` : ''}` : 'Galeria'}</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {studio?.logo_url ? <img src={studio.logo_url} alt={studio.name} className="h-9 max-w-[160px] object-contain" /> : studio?.name ? <span className="text-lg font-semibold">{studio.name}</span> : null}
          {title && <span className="ml-auto truncate text-sm text-muted-foreground">{title}</span>}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
    </div>
  );
}
