import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Chip-style filter — clickable, optionally removable, optionally counted. */
export function FilterChip({
  label,
  count,
  active,
  onClick,
  onRemove,
  className,
}: {
  label: ReactNode;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        className,
      )}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="rounded-full bg-background/70 px-1.5 py-px text-[10px] tabular-nums">
          {count}
        </span>
      )}
      {onRemove && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-1 rounded-full p-0.5 hover:bg-background/60"
          aria-label="Remover filtro"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
