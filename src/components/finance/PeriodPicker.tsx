import { cn } from '@/lib/utils';

export type Period = '1M' | '3M' | '6M' | '12M' | 'YTD';

const options: { id: Period; label: string }[] = [
  { id: '1M', label: 'Mês' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
  { id: '12M', label: '12M' },
  { id: 'YTD', label: 'YTD' },
];

/** Segmented control for a coarse time window. */
export function PeriodPicker({
  value,
  onChange,
  className,
}: {
  value: Period;
  onChange: (p: Period) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center rounded-lg bg-muted/60 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
            value === o.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
