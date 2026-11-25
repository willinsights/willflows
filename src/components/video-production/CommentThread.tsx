import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatClock } from '@/lib/video-deliverables';
import { CheckCircle2, Circle, CornerDownRight, Pencil, Reply, Trash2 } from 'lucide-react';

export type ThreadComment = { id: string; body: string; client_name: string; timestamp_seconds: number; parent_id?: string | null; resolved_at?: string | null; edited_at?: string | null; from_team?: boolean };
type Props<C extends ThreadComment> = {
  comments: C[]; locked?: boolean; onSeek: (t: number) => void;
  canEdit: (c: C) => boolean; canDelete: (c: C) => boolean; canResolve?: boolean; canReply?: boolean;
  onEdit: (c: C, body: string) => Promise<void>; onDelete: (c: C) => Promise<void>;
  onResolve?: (c: C, done: boolean) => Promise<void>; onReply?: (c: C, body: string) => Promise<void>;
};

export function CommentThread<C extends ThreadComment>(p: Props<C>) {
  const [editing, setEditing] = useState<string | null>(null), [replying, setReplying] = useState<string | null>(null), [text, setText] = useState(''), [busy, setBusy] = useState(false);
  const roots = p.comments.filter(c => !c.parent_id).sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  const replies = (id: string) => p.comments.filter(c => c.parent_id === id);
  const go = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); setEditing(null); setReplying(null); setText(''); } finally { setBusy(false); } };
  const editor = (save: () => Promise<void>, label: string) => <div className="mt-2 space-y-2">
    <Textarea autoFocus rows={2} maxLength={5000} value={text} onChange={e => setText(e.target.value)} />
    <div className="flex gap-2"><Button size="sm" disabled={busy || !text.trim()} onClick={() => void go(save)}>{label}</Button><Button size="sm" variant="ghost" onClick={() => { setEditing(null); setReplying(null); }}>Cancelar</Button></div>
  </div>;
  const item = (c: C, reply = false) => <div key={c.id} className={cn(reply && 'ml-4 mt-2 border-l-2 border-primary/30 pl-3')}>
    <div className="mb-1 flex items-center gap-2">
      {reply ? <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" /> : <button type="button" onClick={() => p.onSeek(c.timestamp_seconds)} className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs text-primary hover:bg-primary/25" aria-label={`Ir para ${formatClock(c.timestamp_seconds)}`}>{formatClock(c.timestamp_seconds)}</button>}
      <strong className="truncate">{c.client_name}</strong>
      {reply && c.from_team && <span className="text-xs text-muted-foreground">resposta</span>}
      {c.edited_at && <span className="text-xs text-muted-foreground">(editado)</span>}
      {!reply && c.resolved_at && <span className="ml-auto flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Concluído</span>}
    </div>
    {editing === c.id ? editor(() => p.onEdit(c, text), 'Guardar') : <p className={cn(c.resolved_at && !reply && 'text-muted-foreground')}>{c.body}</p>}
    {editing !== c.id && <div className="mt-1 flex flex-nowrap items-center gap-0.5">
      {!reply && p.canReply && !p.locked && <Button size="sm" variant="ghost" className="h-7 gap-1 px-1.5 text-xs" title="Responder a este comentário; a resposta aparece no link do cliente." onClick={() => { setReplying(c.id); setEditing(null); setText(''); }}><Reply className="h-3.5 w-3.5" /><span className="sr-only xl:not-sr-only">Responder</span></Button>}
      {!reply && p.canResolve && p.onResolve && <Button size="sm" variant="ghost" className="h-7 gap-1 px-1.5 text-xs" title={c.resolved_at ? 'Voltar a marcar como por fazer.' : 'Marcar este pedido como feito.'} disabled={busy} onClick={() => void go(() => p.onResolve!(c, !c.resolved_at))}>{c.resolved_at ? <Circle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}<span className="sr-only xl:not-sr-only">{c.resolved_at ? 'Reabrir' : 'Concluir'}</span></Button>}
      {!p.locked && p.canEdit(c) && <Button size="sm" variant="ghost" className="h-7 gap-1 px-1.5 text-xs" title="Editar o texto deste comentário." onClick={() => { setEditing(c.id); setReplying(null); setText(c.body); }}><Pencil className="h-3.5 w-3.5" /><span className="sr-only xl:not-sr-only">Editar</span></Button>}
      {!p.locked && p.canDelete(c) && <Button size="sm" variant="ghost" className="h-7 gap-1 px-1.5 text-xs text-destructive" title="Apagar este comentário e as respostas." disabled={busy} onClick={() => { if (window.confirm('Apagar este comentário?')) void go(() => p.onDelete(c)); }}><Trash2 className="h-3.5 w-3.5" /><span className="sr-only xl:not-sr-only">Apagar</span></Button>}
    </div>}
    {replying === c.id && p.onReply && editor(() => p.onReply!(c, text), 'Enviar resposta')}
  </div>;
  return <ul className="space-y-2">{roots.map(c => <li key={c.id} className={cn('break-words rounded-md p-2 text-sm', c.resolved_at ? 'bg-success/5 ring-1 ring-success/20' : 'bg-muted/50')}>{item(c)}{replies(c.id).map(r => item(r, true))}</li>)}</ul>;
}
