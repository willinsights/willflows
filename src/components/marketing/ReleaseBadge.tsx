import { cn } from '@/lib/utils';

export type ReleaseKind = 'novo' | 'melhorado' | 'versao';

const LABEL: Record<ReleaseKind, string> = { novo: 'Novo', melhorado: 'Melhorado', versao: 'Versão 2.0' };
const STYLE: Record<ReleaseKind, string> = {
  novo: 'bg-kanban-cyan/15 text-kanban-cyan border-kanban-cyan/50',
  melhorado: 'bg-kanban-purple/15 text-kanban-purple border-kanban-purple/50',
  versao: 'bg-primary/10 text-primary border-primary/40',
};

/** Shared launch tag for WillFlow 2.0. Text always states the meaning (never colour only). */
export function ReleaseBadge({ kind, className }: { kind: ReleaseKind; className?: string }) {
  const label = LABEL[kind];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase leading-none tracking-wide', STYLE[kind], className)}
      aria-label={kind === 'versao' ? 'Versão 2.0' : `${label} na versão 2.0`}
      title={kind === 'versao' ? 'WillFlow 2.0' : `${label} no WillFlow 2.0`}
    >
      {label}{kind !== 'versao' && <span className="ml-1 opacity-80">2.0</span>}
    </span>
  );
}
