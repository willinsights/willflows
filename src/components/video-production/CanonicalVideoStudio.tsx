import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useHlsPlayer } from '@/hooks/useHlsPlayer';
import { privateVideoRequest, uploadPrivateVideo, PRIVATE_VIDEO_CLIENT_REVISION, PrivateVideoError } from '@/lib/private-video-client';
import { fileStem, formatClock, groupDeliverables } from '@/lib/video-deliverables';
import { ArrowLeftRight, Check, CheckCircle2, Copy, Download, Film, Link, Lock, MessageSquare, Plus, RefreshCw, Send, Trash2, Upload, X } from 'lucide-react';
import { CanonicalVideoComparison } from './CanonicalVideoComparison';

type Version = { id: string; file_name: string; bytes: number; state: string; created_at: string; label?: string | null };
type Comment = { id: string; client_name: string; body: string; timestamp_seconds: number; created_at?: string };
type Review = { version: { id: string }; comments: Comment[]; approval: { client_name: string; approved_at?: string } | null; playback: { url: string; thumbnail?: string; expiresAt: number } | null };
type Meta = { thumbnail?: string; approved: boolean };

export function CanonicalVideoStudio({ workspaceId, projectId, taskId, onContext, onVersions }: { workspaceId: string; projectId: string; taskId: string | null; onContext?: (enabled: boolean) => void; onVersions?: (count: number) => void }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selected, setSelected] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [meta, setMeta] = useState<Record<string, Meta>>({});
  const [context, setContext] = useState<{ enabled: boolean; canEdit: boolean; legacyBytes: number; privateBytes: number; limitBytes: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<string>('__new');
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [now, setNow] = useState(0);
  const [link, setLink] = useState<{ token: string; url: string } | null>(null);
  const [comparing, setComparing] = useState(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const operation = useRef<string | null>(null), input = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null), query = useQueryClient();

  const groups = useMemo(() => groupDeliverables(versions), [versions]);
  const group = groups.find(g => g.versions.some(v => v.id === selected)) ?? groups[0];
  const current = group?.versions.find(v => v.id === selected);
  const comparable = (group?.versions ?? []).filter(v => v.state === 'ready');
  const showComparison = comparing && comparable.length > 1;
  const playback = showComparison || review?.version.id !== selected ? null : review.playback;
  const approved = !!review?.approval;
  useHlsPlayer({ videoRef: video, url: playback?.url ?? null, type: playback ? 'hls' : 'none' });

  const refresh = useCallback(async () => {
    const [c, list] = await Promise.all([
      privateVideoRequest({ action: 'context', workspaceId, projectId, taskId }),
      privateVideoRequest({ action: 'client-list', workspaceId, projectId, taskId }),
    ]);
    setContext(c); onContext?.(c.enabled); onVersions?.(list.versions.length);
    setVersions(list.versions);
    setSelected(old => list.versions.some((v: Version) => v.id === old) ? old : list.versions[0]?.id ?? '');
    // Thumbnails and approval badges for every ready version.
    const ready = (list.versions as Version[]).filter(v => v.state === 'ready').slice(0, 20);
    const entries = await Promise.all(ready.map(async v => {
      try { const r = await privateVideoRequest({ action: 'read', versionId: v.id }); return [v.id, { thumbnail: r.playback?.thumbnail, approved: !!r.approval }] as const; }
      catch { return [v.id, { approved: false }] as const; }
    }));
    setMeta(Object.fromEntries(entries));
  }, [workspaceId, projectId, taskId, onContext, onVersions]);
  useEffect(() => { setVersions([]); setSelected(''); setReview(null); setContext(null); void refresh().catch(() => setError('Não foi possível carregar os vídeos.')); }, [refresh]);

  const read = useCallback(async () => {
    if (!selected) return;
    try {
      const next = await privateVideoRequest({ action: 'read', versionId: selected });
      if (selectedRef.current !== selected || next.version.id !== selected) return;
      setReview(old => old?.version.id === next.version.id && old?.playback && next.playback && old.playback.expiresAt > Date.now() / 1000 + 60 ? { ...next, playback: old.playback } : next);
    } catch { if (selectedRef.current === selected) { setReview(null); setError('Este vídeo não está disponível.'); } }
  }, [selected]);
  useEffect(() => { setReview(null); void read(); const timer = setInterval(() => void read(), 15000); return () => clearInterval(timer); }, [read]);
  useEffect(() => { if (group && target !== '__new' && !groups.some(g => g.label === target)) setTarget('__new'); }, [groups, group, target]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(''); setStatus('');
    try { await work(); } catch (e) {
      const code = e instanceof PrivateVideoError ? e.code : null;
      if (code === 'PROVIDER_UNCERTAIN') setError('O envio ainda não está confirmado. Tenta recuperar o mesmo envio.');
      else if (code === 'UPLOADED_OBJECT_MISMATCH') setError('O ficheiro no armazenamento ainda não foi confirmado. Repete o envio com o mesmo ficheiro ou cancela esta tentativa.');
      else if (code === 'ALREADY_APPROVED') setError('Esta versão já foi aprovada; os comentários estão fechados.');
      else setError(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally { setBusy(false); }
  };

  const upload = () => run(async () => {
    if (!file || !context?.enabled || !context.canEdit) return;
    const label = target === '__new' ? (newLabel.trim() || fileStem(file.name)) : target;
    operation.current ??= crypto.randomUUID();
    const result = await uploadPrivateVideo(file, { workspaceId, projectId, taskId }, operation.current).catch(err => {
      if (err instanceof PrivateVideoError && err.code === 'INVALID_INPUT') { operation.current = null; throw new Error('O formato, nome ou tamanho do ficheiro não é aceite. Escolhe outro vídeo.'); }
      throw err;
    });
    operation.current = null;
    await privateVideoRequest({ action: 'set-deliverable', versionId: result.versionId, label }).catch(() => undefined);
    setFile(null); setNewLabel(''); if (input.current) input.current.value = '';
    await refresh(); setSelected(result.versionId); setTarget(label);
    await query.invalidateQueries({ queryKey: ['workspace-storage', workspaceId] });
  });
  const cancelUpload = () => run(async () => {
    if (!operation.current) return;
    await privateVideoRequest({ action: 'abort', operationId: operation.current });
    operation.current = null; setFile(null); if (input.current) input.current.value = '';
    setStatus('Tentativa de envio cancelada.');
  });
  const feedback = (action: 'client-comment' | 'client-approval') => run(async () => {
    await privateVideoRequest({ action, versionId: selected, requestId: crypto.randomUUID(), body: comment, timestamp: video.current?.currentTime ?? 0 });
    setComment(''); await read();
    if (action === 'client-approval') setMeta(m => ({ ...m, [selected]: { ...m[selected], approved: true } }));
  });
  const seek = (t: number) => { if (video.current) { video.current.currentTime = t; video.current.pause(); video.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } };
  const comments = [...(review?.comments ?? [])].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  const pickFile = (next: File | null) => {
    if (next && next.size > 5 * 1024 ** 3) { setError('Arquivo muito grande. Máximo 5 GB.'); setFile(null); return; }
    setFile(next); operation.current = null;
    if (next && !group) setTarget('__new');
    else if (next && group && target === '__new' && !newLabel) setTarget(group.label);
  };

  return <section className="space-y-5" data-video-client-revision={PRIVATE_VIDEO_CLIENT_REVISION} aria-label="Review Studio">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}

    {/* Videos of this card */}
    {groups.length > 0 && <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Vídeos deste cartão ({groups.length})</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {groups.map(g => {
          const latest = g.versions[0]; const active = g === group; const ok = g.versions.some(v => meta[v.id]?.approved);
          return <button key={g.label} type="button" onClick={() => { setSelected(latest.id); setComparing(false); }}
            className={cn('w-28 sm:w-32 shrink-0 overflow-hidden rounded-lg border text-left transition-colors', active ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50')}>
            <div className="relative aspect-video bg-muted">
              {meta[latest.id]?.thumbnail ? <img src={meta[latest.id].thumbnail} alt="" className="h-full w-full object-cover" /> : <Film className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" />}
              {ok && <span className="absolute right-1 top-1 rounded-full bg-success p-0.5 text-success-foreground"><Check className="h-3 w-3" /></span>}
            </div>
            <div className="p-1.5"><p className="truncate text-xs font-medium" title={g.label}>{g.label}</p><p className="text-[11px] text-muted-foreground">{g.versions.length} {g.versions.length === 1 ? 'versão' : 'versões'}</p></div>
          </button>;
        })}
      </div>
    </div>}

    {showComparison && <CanonicalVideoComparison versions={comparable} initialVersionId={selected} onClose={() => setComparing(false)} />}

    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <div className="min-w-0 space-y-4">
        {group && <div className="flex flex-wrap items-center gap-2">
          {group.versions.map(v => <Button key={v.id} size="sm" variant={v.id === selected ? 'default' : 'outline'} onClick={() => { setSelected(v.id); setComparing(false); }} aria-label={`V${v.version_number}`}>
            V{v.version_number}{meta[v.id]?.approved && <CheckCircle2 className="ml-1 h-3.5 w-3.5 text-success" />}
          </Button>)}
          {!showComparison && <Button size="sm" variant="ghost" disabled={comparable.length < 2} title={comparable.length < 2 ? 'Envie uma segunda versão para comparar' : undefined} onClick={() => setComparing(true)}><ArrowLeftRight /> Comparar versões</Button>}
          {comparable.length < 2 && <span className="text-xs text-muted-foreground">Para comparar, envie uma nova versão deste vídeo.</span>}
        </div>}

        {playback ? <video ref={video} aria-label="Vídeo em revisão" controls playsInline poster={playback.thumbnail} onTimeUpdate={e => setNow(e.currentTarget.currentTime)} className="aspect-video w-full rounded-lg bg-muted" />
          : !showComparison && <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground">{selected ? 'A processar vídeo…' : 'Ainda não há vídeos neste cartão'}</div>}

        {approved && <div role="status" className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> V{current?.version_number} aprovada por {review?.approval?.client_name}{review?.approval?.approved_at ? ` em ${new Date(review.approval.approved_at).toLocaleDateString('pt-PT')}` : ''} · comentários fechados
        </div>}

        {context?.enabled && context.canEdit && <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <input ref={input} type="file" className="hidden" aria-label="Arquivo de vídeo novo" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska" disabled={busy} onChange={e => pickFile(e.target.files?.[0] ?? null)} />
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Button variant="outline" disabled={busy || !!operation.current} onClick={() => input.current?.click()}><Upload /> Escolher vídeo</Button>
            {file ? <span className="min-w-0 break-words text-sm">{file.name}</span> : <span className="text-xs text-muted-foreground">MP4, MOV, WebM · até 5 GB</span>}
          </div>
          {file && <div className="grid gap-2 sm:grid-cols-2">
            <select aria-label="Destino do envio" className="rounded-md border border-input bg-background p-2 text-sm text-foreground" value={target} onChange={e => setTarget(e.target.value)}>
              {groups.map(g => <option key={g.label} value={g.label}>Nova versão de «{g.label}» (V{g.versions.length + 1})</option>)}
              <option value="__new">+ Novo vídeo neste cartão</option>
            </select>
            {target === '__new' && <Input aria-label="Nome do novo vídeo" placeholder={fileStem(file.name)} value={newLabel} maxLength={120} onChange={e => setNewLabel(e.target.value)} />}
          </div>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={upload} disabled={!file || busy}>{target === '__new' ? <Plus /> : <Upload />} {busy ? 'A processar…' : operation.current ? 'Retomar envio' : selected ? 'Carregar nova versão' : 'Carregar vídeo'}</Button>
            {file && operation.current && <Button variant="ghost" disabled={busy} onClick={() => void cancelUpload()}>Cancelar tentativa de envio</Button>}
          </div>
        </div>}
        {context && <p className="text-xs text-muted-foreground">Armazenamento: {((context.legacyBytes + context.privateBytes) / 1024 ** 3).toFixed(2)} / {(context.limitBytes / 1024 ** 3).toFixed(2)} GB</p>}
      </div>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" aria-label="Atualizar vídeos" disabled={busy} onClick={() => void run(refresh)}><RefreshCw /></Button>
          {selected && <Button variant="outline" size="icon" aria-label="Baixar vídeo" disabled={busy} onClick={() => void run(async () => { const r = await privateVideoRequest({ action: 'download', versionId: selected }); const a = document.createElement('a'); a.href = r.url; a.download = r.fileName; a.rel = 'noreferrer'; a.click(); })}><Download /></Button>}
          {context?.canEdit && selected && <Button variant="outline" size="icon" aria-label="Retirar versão" disabled={busy} onClick={() => { if (window.confirm('Retirar esta versão da aprovação? O histórico será preservado.')) void run(async () => { await privateVideoRequest({ action: 'client-withdraw', versionId: selected }); await refresh(); await query.invalidateQueries({ queryKey: ['workspace-storage', workspaceId] }); }); }}><Trash2 /></Button>}
        </div>

        {context?.canEdit && selected && <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-medium"><Link className="h-4 w-4" /> Link para o cliente</p>
          <p className="text-xs text-muted-foreground">Mostra todos os vídeos deste cartão com o nome do seu estúdio. Válido 7 dias.</p>
          <p className="text-xs text-muted-foreground">Depois de aprovado, o vídeo fica disponível 7 dias e é eliminado. Ficam guardados os comentários da revisão, a versão aprovada, quem aprovou e quando.</p>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => { const created = await privateVideoRequest({ action: 'link', workspaceId, projectId, taskId }); setLink({ token: created.token, url: `${window.location.origin}/video-approval/${created.token}` }); })}>Gerar link de aprovação</Button>
          {link && <>
            <div className="flex min-w-0 gap-2"><Input aria-label="Link de aprovação" readOnly value={link.url} /><Button variant="outline" size="icon" disabled={busy} aria-label="Copiar link" onClick={() => { void navigator.clipboard.writeText(link.url); setStatus('Link copiado.'); }}><Copy /></Button></div>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(async () => { await privateVideoRequest({ action: 'revoke', token: link.token }); setLink(null); setStatus('Link revogado.'); })}>Revogar este link</Button>
          </>}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (window.confirm('Revogar todos os links de aprovação deste cartão?')) void run(async () => { await privateVideoRequest({ action: 'revoke-scope', workspaceId, projectId, taskId }); setLink(null); setStatus('Links revogados.'); }); }}><X /> Revogar todos os links</Button>
        </div>}

        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4" /> Comentários {comments.length > 0 && <Badge variant="secondary">{comments.length}</Badge>}</p>
          {comments.length === 0 && <p className="text-xs text-muted-foreground">Sem comentários nesta versão.</p>}
          <ul className="max-h-80 space-y-2 overflow-y-auto">{comments.map(c => <li key={c.id} className="break-words rounded-md bg-muted/50 p-2 text-sm">
            <div className="mb-1 flex items-center gap-2"><button type="button" onClick={() => seek(c.timestamp_seconds)} className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs text-primary hover:bg-primary/25" aria-label={`Ir para ${formatClock(c.timestamp_seconds)}`}>{formatClock(c.timestamp_seconds)}</button><strong className="truncate">{c.client_name}</strong></div>
            <p>{c.body}</p>
          </li>)}</ul>
          {selected && (approved
            ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Versão aprovada: não aceita novos comentários.</p>
            : <>
              <Textarea aria-label="Comentário da equipe" placeholder={`Comentário em ${formatClock(now)}`} value={comment} maxLength={5000} onFocus={() => video.current?.pause()} onChange={e => setComment(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy || showComparison || !comment.trim()} onClick={() => void feedback('client-comment')}><Send /> Comentar em {formatClock(now)}</Button>
                {context?.canEdit && <Button size="sm" variant="outline" disabled={busy || showComparison} onClick={() => void feedback('client-approval')}><Check /> Aprovar vídeo</Button>}
              </div>
            </>)}
        </div>
      </div>
    </div>
  </section>;
}
