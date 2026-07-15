import { format as formatDate, formatDistanceToNowStrict, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';

export type DateFormat = 'short' | 'medium' | 'long' | 'relative';

/**
 * Unified date rendering across the Finance module.
 *   short:    `08 Out`
 *   medium:   `08 Out '26`
 *   long:     `08 Out 2026`
 *   relative: `há 3 dias`
 */
export function DateCell({
  date,
  format = 'short',
  className,
}: {
  date: string | Date | null | undefined;
  format?: DateFormat;
  className?: string;
}) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) return <span className="text-muted-foreground">—</span>;

  const text =
    format === 'relative'
      ? formatDistanceToNowStrict(d, { addSuffix: true, locale: pt })
      : formatDate(
          d,
          format === 'short' ? 'dd MMM' : format === 'medium' ? "dd MMM ''yy" : 'dd MMM yyyy',
          { locale: pt },
        );

  return <span className={className}>{text}</span>;
}
