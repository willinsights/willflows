import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  AlertTriangle,
  Activity,
  Target,
  Clock,
  DollarSign,
  UserCheck,
  FolderKanban,
  CheckSquare,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useSaaSCockpit, PeriodType, Alert } from '@/hooks/useSaaSCockpit';

export function SaaSCockpitTab() {
  const [period, setPeriod] = useState<PeriodType>('30d');
  const { metrics, alerts, mrrHistory, conversionHistory, isLoading } = useSaaSCockpit(period);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('pt-PT').format(value);
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '—';
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Cockpit SaaS</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </motion.div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita Mensal"
          value={formatCurrency(metrics?.mrr || 0)}
          icon={<DollarSign className="h-4 w-4" />}
          trend={null}
          color="text-primary"
          tooltip="Receita mensal recorrente (apenas contas ativas e pagantes)"
        />
        <KPICard
          title="Receita Anual"
          value={formatCurrency(metrics?.arr || 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={null}
          color="text-emerald-500"
          tooltip="Receita anual recorrente projetada"
        />
        <KPICard
          title="Receita (período)"
          value={formatCurrency(metrics?.revenueInPeriod || 0)}
          icon={<CreditCard className="h-4 w-4" />}
          trend={null}
          color="text-blue-500"
        />
        <KPICard
          title="Reembolsos"
          value={formatCurrency(metrics?.refundsInPeriod || 0)}
          icon={<XCircle className="h-4 w-4" />}
          trend={null}
          color="text-red-500"
        />
      </div>

      {/* Subscription KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Ativas"
          value={formatNumber(metrics?.subscriptions.active)}
          icon={<UserCheck className="h-4 w-4" />}
          color="text-emerald-500"
          small
        />
        <KPICard
          title="Em Trial"
          value={formatNumber(metrics?.subscriptions.trialing)}
          icon={<Clock className="h-4 w-4" />}
          color="text-amber-500"
          small
        />
        <KPICard
          title="Em Atraso"
          value={formatNumber(metrics?.subscriptions.pastDue)}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-orange-500"
          small
        />
        <KPICard
          title="A Cancelar"
          value={formatNumber(metrics?.subscriptions.cancelAtPeriodEnd)}
          icon={<AlertCircle className="h-4 w-4" />}
          color="text-yellow-500"
          small
        />
        <KPICard
          title="Canceladas"
          value={formatNumber(metrics?.subscriptions.canceledInPeriod)}
          icon={<XCircle className="h-4 w-4" />}
          color="text-red-500"
          small
        />
      </div>

      {/* Activity & Churn KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Ativos 7d"
          value={formatNumber(metrics?.activity.wau)}
          icon={<Activity className="h-4 w-4" />}
          color="text-primary"
          tooltip="Utilizadores ativos nos últimos 7 dias"
        />
        <KPICard
          title="Ativos 30d"
          value={formatNumber(metrics?.activity.mau)}
          icon={<Users className="h-4 w-4" />}
          color="text-primary"
          tooltip="Utilizadores ativos nos últimos 30 dias"
        />
        <KPICard
          title="Saídas %"
          value={formatPercent(metrics?.churn.usersPercent)}
          icon={<TrendingDown className="h-4 w-4" />}
          color="text-red-500"
          tooltip="% de utilizadores que cancelaram no período"
        />
        <KPICard
          title="Perda %"
          value={formatPercent(metrics?.churn.revenuePercent)}
          icon={<TrendingDown className="h-4 w-4" />}
          color="text-red-500"
          tooltip="% de receita perdida no período"
        />
      </div>

      {/* Activation Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Funil de Ativação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FunnelStep
              label="Registos"
              value={metrics?.activation.registrations || 0}
              max={metrics?.activation.registrations || 1}
            />
            <FunnelStep
              label="Criou Workspace"
              value={metrics?.activation.createdWorkspace || 0}
              max={metrics?.activation.registrations || 1}
            />
            <FunnelStep
              label="Criou Projeto"
              value={metrics?.activation.createdProject || 0}
              max={metrics?.activation.registrations || 1}
            />
            <FunnelStep
              label="Criou Tarefa"
              value={metrics?.activation.createdTask || 0}
              max={metrics?.activation.registrations || 1}
            />
            <FunnelStep
              label="Pagou"
              value={metrics?.activation.paid || 0}
              max={metrics?.activation.registrations || 1}
              highlight
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita Mensal ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                mrr: { label: 'Receita Mensal', color: 'hsl(var(--primary))' },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mrrHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `€${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Conversion Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups vs Pagantes</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                signups: { label: 'Signups', color: 'hsl(var(--muted-foreground))' },
                paid: { label: 'Pagantes', color: 'hsl(var(--primary))' },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="signups" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="paid" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Sub-components

function AlertCard({ alert }: { alert: Alert }) {
  const bgColor = {
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
  }[alert.type];

  const iconColor = {
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  }[alert.type];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${bgColor}`}>
      <AlertTriangle className={`h-5 w-5 ${iconColor}`} />
      <div className="flex-1">
        <p className="font-medium text-sm">{alert.title}</p>
        <p className="text-xs text-muted-foreground">{alert.message}</p>
      </div>
      {alert.count && (
        <Badge variant="outline" className={iconColor}>
          {alert.count}
        </Badge>
      )}
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  trend,
  color,
  small,
  tooltip,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number | null;
  color?: string;
  small?: boolean;
  tooltip?: string;
}) {
  const content = (
    <Card className={small ? 'p-3' : ''}>
      <CardContent className={small ? 'p-0' : 'pt-4'}>
        <div className="flex items-center justify-between">
          <span className={`${color || 'text-muted-foreground'}`}>{icon}</span>
          {trend !== null && trend !== undefined && (
            <Badge variant={trend >= 0 ? 'default' : 'destructive'} className="text-xs">
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </Badge>
          )}
        </div>
        <div className="mt-2">
          <p className={`${small ? 'text-lg' : 'text-2xl'} font-bold`}>{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

function FunnelStep({
  label,
  value,
  max,
  highlight,
}: {
  label: string;
  value: number;
  max: number;
  highlight?: boolean;
}) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="flex items-center gap-4">
      <span className="w-32 text-sm text-muted-foreground">{label}</span>
      <div className="flex-1">
        <Progress 
          value={percent} 
          className={`h-3 ${highlight ? '[&>div]:bg-emerald-500' : ''}`}
        />
      </div>
      <span className={`w-16 text-right text-sm font-medium ${highlight ? 'text-emerald-500' : ''}`}>
        {value}
      </span>
      <span className="w-12 text-right text-xs text-muted-foreground">
        {percent.toFixed(0)}%
      </span>
    </div>
  );
}
