import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useHlsPlayer } from '@/hooks/useHlsPlayer';
import { cn } from '@/lib/utils';
import { formatClock, groupDeliverables } from '@/lib/video-deliverables';
import type React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeftRight, Check, CheckCircle2, Film, Info, Lock, Send } from 'lucide-react';
import { CanonicalVideoComparison } from './CanonicalVideoComparison';
import { CommentsMenu } from './CommentsMenu';
import { useDetectedFps } from '@/hooks/useDetectedFps';
import { FpsLabel } from './FpsLabel';
import { CommentThread } from './CommentThread';
const KEYS = 'wf_review_comment_keys';
const keyHash = async (id: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('wfc:' + id))), x => x.toString(16).padStart(2, '0')).join('');
const loadKeys = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(KEYS) ?? '{}'); } catch { return {}; } };

const Tip = ({ text, children }: { text: string; children: React.ReactNode }) => <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><span className="inline-flex">{children}</span></TooltipTrigger><TooltipContent className="max-w-xs text-xs">{text}</TooltipContent></Tooltip></TooltipProvider>;
const RETENTION_INFO = 'Este link mostra todos os vídeos deste projeto e é válido 7 dias. Depois de aprovado, o vídeo fica disponível 7 dias e é eliminado. Ficam guardados os comentários da revisão, a versão aprovada, quem aprovou e quando.';

type Comment = { id: string; body: string; client_name: string; timestamp_seconds: number; parent_id?: string | null; resolved_at?: string | null; edited_at?: string | null; from_team?: boolean; key?: string | null };
type Review = { version: { id: string; file_name: string }; comments: Comment[]; approval: { client_name: string; notes: string; approved_at?: string } | null; playback: { url: string; thumbnail?: string; expiresAt: number } | null; branding?: { name: string; logo_url: string | null } | null; group_approval?: { version_id: string; name: string; approved_at: string } | null };
type Listed = { id: string; file_name: string; created_at: string; label?: string | null };
const RETENTION_DAYS = 7;

// Client-facing review page: shows only the studio's own name/logo, never WillFlow.
export function PrivateVideoApproval({ request, token }: { request: (body: Record<string, unknown>) => Promise<any>; token: string }) {
  const [versions, setVersions] = useState<Listed[]>([]), [selected, setSelected] = useState(''), [review, setReview] = useState<Review | null>(null);
  const [branding, setBranding] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [name, setName] = useState(''), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [now, setNow] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fps = useDetectedFps(videoRef, review?.playback?.url);
  const [keys, setKeys] = useState<Record<string, string>>(loadKeys);
  const remember = async (requestId: string) => { const next = { ...loadKeys(), [await keyHash(requestId)]: requestId }; localStorage.setItem(KEYS, JSON.stringify(next)); setKeys(next); };
  useHlsPlayer({ videoRef, url: review?.playback?.url ?? null, type: review?.playback?.url.includes('.m3u8') ? 'hls' : review?.playback ? 'native' : 'none' });
  const groups = useMemo(() => groupDeliverables(versions), [versions]);
  const group = groups.find(g => g.versions.some(v => v.id === selected)) ?? groups[0];
  const current = group?.versions.find(v => v.id === selected);
  const approved = !!review?.approval;
  const sibling = !approved ? review?.group_approval ?? null : null;
  const siblingNumber = sibling ? group?.versions.find(v => v.id === sibling.version_id)?.version_number : undefined;
  const locked = approved || !!sibling;
  const [approvedOf, setApprovedOf] = useState<Record<string, string>>({});
  const approvedId = group ? approvedOf[group.label] : undefined;
  const approvedVersion = group?.versions.find(v => v.id === approvedId);
  useEffect(() => {
    if (!group || !review || review.version.id !== selected) return;
    const id = review.approval ? selected : review.group_approval?.version_id;
    setApprovedOf(m => { const n = { ...m }; if (id) n[group.label] = id; else delete n[group.label]; return n[group.label] === m[group.label] ? m : n; });
    if (id && id !== selected) { setSelected(id); setComparing(false); }
  }, [review, selected, group]);
  const [comparing, setComparing] = useState(false);
  const ready = group?.versions ?? [];
  const reader = useCallback((versionId: string) => request({ action: 'read', versionId, token }), [request, token]);

  const load = useCallback(async (id: string) => {
    try { const data = await request({ action: 'read', versionId: id, token }); setReview(old => old?.version.id === data.version.id && old.playback && data.playback && old.playback.expiresAt > Date.now() / 1000 + 60 ? { ...data, playback: old.playback } : data); if (data.branding) setBranding(data.branding); setError(''); }
    catch { setReview(null); setError('Este vídeo não está disponível.'); }
  }, [request, token]);
  useEffect(() => { let active = true; request({ action: 'list', token }).then(data => { if (!Array.isArray(data?.versions)) throw Error('Invalid list'); if (active) { setVersions(data.versions); setSelected(groupDeliverables(data.versions as Listed[])[0]?.versions[0]?.id ?? ''); } }).catch(() => { if (active) setError('Este link não está disponível ou expirou.'); }); return () => { active = false; }; }, [request, token]);
  useEffect(() => { if (!selected) return; setReview(null); void load(selected); const timer = setInterval(() => void load(selected), 60000); return () => clearInterval(timer); }, [selected, load]);

  const feedback = async (action: 'comment' | 'approval') => {
    if (!selected || !name.trim() || busy || locked) return;
    if (action === 'approval' && !window.confirm(`Aprovar a V${current?.version_number} de «${group?.label}»? Depois de aprovar, deixa de poder comentar esta versão.`)) return;
    setBusy(true); setError('');
    try { const requestId = crypto.randomUUID(); if (action === 'comment') await remember(requestId); await request({ action, token, versionId: selected, requestId, name, body, timestamp: videoRef.current?.currentTime ?? 0 }); setBody(''); await load(selected); }
    catch { setError('Não foi possível guardar. Tente novamente.'); } finally { setBusy(false); }
  };
  const seek = (t: number) => { if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.pause(); } };
  const comments = [...(review?.comments ?? [])].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  const until = review?.approval?.approved_at ? new Date(new Date(review.approval.approved_at).getTime() + RETENTION_DAYS * 86400000) : null;
  const studio = branding?.name || 'Revisão de vídeo';

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-4 py-4"><div className="mx-auto flex max-w-6xl items-center gap-3">
      {branding?.logo_url && <img src={branding.logo_url} alt="" className="h-9 w-9 rounded-md object-contain" />}
      <div className="min-w-0"><h1 className="truncate text-lg font-semibold">{studio}</h1><p className="text-xs text-muted-foreground">Revisão e aprovação de vídeo</p></div>
    </div></header>
    <div className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 md:px-4">
      {groups.length > 1 && <div className="flex gap-3 overflow-x-auto pb-1">{groups.map(g => <button key={g.label} type="button" onClick={() => { setSelected(g.versions.find(v => v.id === approvedOf[g.label])?.id ?? g.versions[0].id); setComparing(false); }} className={cn('shrink-0 rounded-lg border px-3 py-2 text-left text-sm', g === group ? 'border-primary ring-2 ring-primary/30' : 'border-border')}><Film className="mr-1 inline h-4 w-4" />{g.label}<span className="ml-2 text-xs text-muted-foreground">{g.versions.length} {g.versions.length === 1 ? 'versão' : 'versões'}</span></button>)}</div>}
      {group && <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap"><span className="mr-1 font-medium">{group.label}</span>{(approvedVersion ? [approvedVersion] : group.versions).map(v => <Button key={v.id} size="sm" variant={v.id === selected ? 'default' : 'outline'} onClick={() => { setSelected(v.id); setComparing(false); }}>V{v.version_number}</Button>)}
            {approvedVersion && <span className="flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-2 py-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Versão aprovada</span>}{!approvedVersion && !comparing && <Tip text={ready.length < 2 ? 'Só existe uma versão deste vídeo; não há nada para comparar.' : 'Ver duas versões lado a lado, sincronizadas.'}><Button size="sm" variant="ghost" disabled={ready.length < 2} onClick={() => setComparing(true)}><ArrowLeftRight /> Comparar versões</Button></Tip>}
            <Tip text={RETENTION_INFO}><button type="button" aria-label="Como funciona este link" className="ml-auto text-muted-foreground hover:text-foreground"><Info className="h-4 w-4" /></button></Tip>
          </div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0 space-y-3">
          {comparing && ready.length > 1 && <CanonicalVideoComparison versions={ready} initialVersionId={selected} reader={reader} onClose={() => setComparing(false)} />}
          {approved && <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> V{current?.version_number} aprovada por {review?.approval?.client_name}{until && <span className="text-muted-foreground">· disponível até {until.toLocaleDateString('pt-PT')}</span>}
            <span className="basis-full text-xs text-muted-foreground">Após esta data o vídeo é eliminado; ficam guardados os comentários e o registo da aprovação.</span>
          </div>}
          {comparing && ready.length > 1 ? null : review?.playback ? <video aria-label="Vídeo para aprovação" ref={videoRef} controls playsInline poster={review.playback.thumbnail} onTimeUpdate={e => setNow(e.currentTarget.currentTime)} className="aspect-video max-h-[calc(100vh-9rem)] w-full rounded-lg bg-black" /> : <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />}
          {review?.playback && !comparing && <FpsLabel fps={fps} />}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </section>
        <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Comentários</h2><CommentsMenu comments={comments} detectedFps={fps} title={review?.version.file_name ?? group?.label ?? studio} /></div>
          {!approved && <p className="text-xs text-muted-foreground">{RETENTION_INFO}</p>}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">{comments.length === 0 && <p className="text-sm text-muted-foreground">Pause o vídeo no momento certo e escreva o seu comentário.</p>}
          <CommentThread comments={comments} locked={locked} onSeek={seek} canEdit={c => !!c.key && !!keys[c.key]} canDelete={c => !!c.key && !!keys[c.key]}
            onEdit={async (c, text) => { await request({ action: 'comment-edit', token, versionId: selected, requestId: keys[c.key!], body: text }); await load(selected); }}
            onDelete={async c => { await request({ action: 'comment-delete', token, versionId: selected, requestId: keys[c.key!] }); await load(selected); }} /></div>
          <div className="min-w-0 space-y-2 border-t border-border pt-3">
          {sibling ? <p role="note" className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4 shrink-0" /> A V{siblingNumber ?? '?'} deste vídeo já foi aprovada{sibling.name ? ` por ${sibling.name}` : ''}; as outras versões deixam de aceitar comentários. Pode comentar os outros vídeos deste cartão.</p> : (approved ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Esta versão foi aprovada; os comentários estão fechados.</p> : <>
            <label className="block text-sm">Nome<input className="mt-1 w-full rounded-md border border-input bg-background p-2" value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
            <label className="block text-sm">Comentário em {formatClock(now)}<textarea className="mt-1 w-full rounded-md border border-input bg-background p-2" rows={2} maxLength={5000} value={body} onFocus={() => videoRef.current?.pause()} onChange={e => setBody(e.target.value)} /></label>
            <div className="flex flex-wrap gap-2"><Tip text={!name.trim() ? 'Escreva o seu nome para comentar.' : 'Envia o comentário no tempo atual do vídeo.'}><Button onClick={() => void feedback('comment')} disabled={busy || !name.trim() || !body.trim()}><Send /> Enviar comentário</Button></Tip><Tip text={!name.trim() ? 'Escreva o seu nome para aprovar.' : 'Aprova esta versão e fecha os comentários. O vídeo fica disponível mais 7 dias.'}><Button variant="outline" onClick={() => void feedback('approval')} disabled={busy || !name.trim()}><Check /> Aprovar V{current?.version_number}</Button></Tip></div>
            {!name.trim() && <p role="note" className="text-xs text-warning">Escreva o seu nome acima para poder comentar ou aprovar.</p>}
          </>)}
          </div>
        </section>
      </div>
    </div>
  </main>;
}
