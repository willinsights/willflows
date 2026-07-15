import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHideValues } from '@/hooks/useHideValues';

export type StatTone = 'income' | 'expense' | 'profit' | 'warning' | 'neutral';

const toneMap: Record<StatTone, { text: string; border: string; bg: string }> = {
  income:  { text: 'text-success',     border: 'border-success/25',     bg: 'from-success/[0.06]' },
  expense: { text: 'text-destructive', border: 'border-destructive/25', bg: 'from-destructive/[0.06]' },
  profit:  { text: 'text-primary',     border: 'border-primary/25',     bg: 'from-primary/[0.06]' },
  warning: { text: 'text-warning',     border: 'border-warning/30',     bg: 'from-warning/[0.06]' },
  neutral: { text: 'text-foreground',  border: 'border-border',         bg: 'from-muted/20' },
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  change?: number | null;
  changePositiveGood?: boolean;
  sparkline?: number[];
  tone?: StatTone;
  variant?: 'hero' | 'compact';
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
  /** Blur the value when workspace hide-values toggle is on. */
  hideValueBlur?: boolean;
  delay?: number;
}

export function StatCard({
  label,
  value,
  hint,
  change,
  changePositiveGood = true,
  sparkline,
  tone = 'neutral',
  variant = 'compact',
  icon,
  onClick,
  className,
  hideValueBlur,
  delay = 0,
}: StatCardProps) {
  const { hideValues } = useHideValues();
  const t = toneMap[tone];
  const isHero = variant === 'hero';
  const changeGood = change != null && (changePositiveGood ? change >= 0 : change <= 0);
  const ChangeIcon = change != null && change >= 0 ? ArrowUp : ArrowDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer', 'h-full', className)}
    >
      <Card
        className={cn(
          'glass-card h-full overflow-hidden bg-gradient-to-br to-transparent transition-shadow',
          onClick && 'hover:shadow-md',
          t.border,
          t.bg,
        )}
      >
        <CardContent className={cn('p-4', isHero && 'p-6')}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'uppercase tracking-wide text-muted-foreground font-medium',
                  isHero ? 'text-[11px]' : 'text-[10px]',
                )}
              >
                {label}
              </p>
              <div
                className={cn(
                  'mt-1 font-bold tabular-nums leading-tight',
                  isHero ? 'text-4xl' : 'text-2xl',
                  t.text,
                  hideValueBlur && hideValues && 'blur-md select-none',
                )}
              >
                {value}
              </div>
              {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
              {change != null && (
                <p
                  className={cn(
                    'text-[11px] mt-1.5 inline-flex items-center gap-0.5 font-medium',
                    changeGood ? 'text-success' : 'text-destructive',
                  )}
                >
                  <ChangeIcon className="h-3 w-3" />
                  {Math.abs(change)}% vs mês anterior
                </p>
              )}
            </div>
            {icon && <div className="opacity-70 shrink-0">{icon}</div>}
          </div>
          {sparkline && sparkline.length > 1 && (
            <div className={cn('mt-3 -mx-1', isHero ? 'h-12' : 'h-8')}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkline.map((v, i) => ({ i, v }))}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="currentColor"
                    className={t.text}
                    strokeWidth={1.75}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
