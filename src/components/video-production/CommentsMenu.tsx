import { Copy, Download, Info, MoreHorizontal, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { buildExport, commentsAsText, toTimecode, type ExportComment, type ExportFormat } from '@/lib/comment-export';

const FORMATS: { id: ExportFormat; label: string; tag: string }[] = [
  { id: 'fcpxml', label: 'Final Cut Pro', tag: 'FCPXML' }, { id: 'avid', label: 'Media Composer', tag: 'TXT' },
  { id: 'premiere', label: 'Premiere Pro', tag: 'XML' }, { id: 'edl', label: 'DaVinci Resolve', tag: 'EDL' },
  { id: 'csv', label: 'Separado por vírgula', tag: 'CSV' }, { id: 'txt', label: 'Texto simples', tag: 'TXT' },
];
const escHtml = (s: string) => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!));

export function CommentsMenu({ comments, title, detectedFps }: { comments: ExportComment[]; title: string; detectedFps?: number | null }) {
  const fps = detectedFps ?? 25;
  const empty = comments.length === 0;
  const base = title.replace(/\.[^.]+$/, '').replace(/[^\w\-À-ÿ ]+/g, '').trim() || 'comentarios';
  const copy = async () => { await navigator.clipboard.writeText(commentsAsText(comments, fps)); toast.success('Comentários copiados'); };
  const download = (f: ExportFormat) => {
    const { content, ext, mime } = buildExport(f, comments, base, fps);
    const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a'); a.href = url; a.download = `${base} - comentarios.${ext}`; a.click(); URL.revokeObjectURL(url);
  };
  const print = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const rows = [...comments].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds).map((c, i) => `<tr><td>${i + 1}</td><td>${toTimecode(c.timestamp_seconds, fps)}</td><td>${escHtml(c.client_name)}</td><td>${escHtml(c.body)}</td></tr>`).join('');
    w.document.write(`<html><head><title>${escHtml(base)}</title><style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top;font-size:12px}</style></head><body><h2>${escHtml(base)} — comentários</h2><table><tr><th>#</th><th>Timecode</th><th>Autor</th><th>Comentário</th></tr>${rows}</table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Opções dos comentários" title="Copiar, imprimir ou exportar comentários"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuItem disabled={empty} onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />Copiar comentários</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={empty} onClick={print}><Printer className="mr-2 h-4 w-4" />Imprimir comentários</DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={empty}><Download className="mr-2 h-4 w-4" />Exportar comentários</DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-60">{FORMATS.map((f, i) => <div key={f.id}>{i === 4 && <DropdownMenuSeparator />}<DropdownMenuItem onClick={() => download(f.id)}>{f.label}<span className="ml-auto text-xs text-muted-foreground">{f.tag}</span></DropdownMenuItem></div>)}</DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="flex gap-2 text-xs font-normal text-muted-foreground"><Info className="h-4 w-4 shrink-0" />Copia e exporta os comentários desta versão, com timecode em {detectedFps ? `${detectedFps} fps, a velocidade deste vídeo` : '25 fps (reproduza o vídeo para usar a velocidade real dele)'}. Cada ficheiro mantém o seu próprio timecode.</DropdownMenuLabel>
    </DropdownMenuContent>
  </DropdownMenu>;
}
