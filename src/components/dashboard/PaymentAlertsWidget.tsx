import { AlertTriangle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePaymentAlerts, type PaymentAlert } from '@/hooks/usePaymentAlerts';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const severityConfig = {
  critical: {
    icon: AlertCircle,
    badge: 'Crítico',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
    dotClass: 'bg-destructive',
  },
  warning: {
    icon: AlertTriangle,
    badge: 'Atenção',
    badgeClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    dotClass: 'bg-yellow-500',
  },
  info: {
    icon: Clock,
    badge: 'Próximo',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    dotClass: 'bg-blue-500',
  },
};

function AlertItem({ alert }: { alert: PaymentAlert }) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  const p = alert.payment;

  return (
    <div className="flex items-start gap-3 py-2.5 px-1 group">
      <div className={cn('mt-0.5 w-2 h-2 rounded-full shrink-0', config.dotClass)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate inline-flex items-center gap-1">
            {p.is_receivable ? 'Receita' : 'Despesa'}:{' '}
            <MoneyValue value={p.amount} size="sm" />
          </span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 shrink-0', config.badgeClass)}>
            {alert.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {p.clients?.name || p.description || 'Sem descrição'}
          {p.projects?.name && ` · ${p.projects.name}`}
        </p>
      </div>
    </div>
  );
}

export function PaymentAlertsWidget() {
  const { alerts, loading, criticalCount, warningCount } = usePaymentAlerts();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Alertas de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            ✅ Sem alertas de pagamento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      criticalCount > 0 && 'border-destructive/30'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={cn(
              'h-4 w-4',
              criticalCount > 0 ? 'text-destructive' : 'text-yellow-500'
            )} />
            Alertas de Pagamento
            {alerts.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => navigate('/app/financeiro/receitas')}
          >
            Ver todos
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[220px]">
          <div className="divide-y divide-border/50">
            {alerts.slice(0, 8).map((alert) => (
              <AlertItem key={alert.payment.id} alert={alert} />
            ))}
          </div>
        </ScrollArea>
        {criticalCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-destructive font-medium">
              ⚠️ {criticalCount} pagamento(s) em estado crítico
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
