import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  icon: LucideIcon;
  /** Semantic color for the icon container (Tailwind class fragment, e.g. "primary"). */
  iconTone?: 'primary' | 'warning' | 'success' | 'info' | 'destructive' | 'muted';
  title: string;
  /** Optional "Ver tudo →" link shown on the right of the header. */
  action?: { label?: string; to: string };
  /** Custom right-side content, mutually exclusive with `action`. */
  headerRight?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

const toneMap: Record<NonNullable<DashboardCardProps['iconTone']>, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
  success: { bg: 'bg-success/10', text: 'text-success' },
  info: { bg: 'bg-info/10', text: 'text-info' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
  muted: { bg: 'bg-muted/60', text: 'text-muted-foreground' },
};

/**
 * Unified dashboard card wrapper: consistent glass surface,
 * icon-in-container header, and optional "Ver tudo" link.
 */
export function DashboardCard({
  icon: Icon,
  iconTone = 'primary',
  title,
  action,
  headerRight,
  className,
  bodyClassName,
  children,
}: DashboardCardProps) {
  const tone = toneMap[iconTone];
  return (
    <Card className={cn('glass-card h-full flex flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 px-4 shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
          <div className={cn('p-1.5 rounded-md shrink-0', tone.bg)}>
            <Icon className={cn('h-4 w-4', tone.text)} />
          </div>
          <span className="truncate">{title}</span>
        </CardTitle>
        {headerRight}
        {!headerRight && action && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-primary hover:text-primary shrink-0"
          >
            <Link to={action.to}>
              {action.label ?? 'Ver tudo'}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn('px-4 pb-4 flex-1 min-h-0', bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
