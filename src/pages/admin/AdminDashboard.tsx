import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  CreditCard, 
  Building2,
  AlertTriangle,
  RefreshCw,
  Euro,
  ArrowRight,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';
import { cn } from '@/lib/utils';

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  change,
  changeLabel,
  icon: Icon, 
  color = 'primary',
  loading = false 
}: { 
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color?: 'primary' | 'green' | 'yellow' | 'red';
  loading?: boolean;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    red: 'bg-red-500/10 text-red-500',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={cn(
                  'text-xs',
                  change >= 0 ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {change >= 0 ? '+' : ''}{change}%
                </span>
                {changeLabel && (
                  <span className="text-xs text-muted-foreground">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Alert Card Component
function AlertCard({ alert }: { alert: { type: string; title: string; message: string } }) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border',
      alert.type === 'error' && 'bg-red-500/10 border-red-500/20',
      alert.type === 'warning' && 'bg-yellow-500/10 border-yellow-500/20',
      alert.type === 'info' && 'bg-primary/10 border-primary/20'
    )}>
      <AlertTriangle className={cn(
        'h-5 w-5 mt-0.5',
        alert.type === 'error' && 'text-red-500',
        alert.type === 'warning' && 'text-yellow-500',
        alert.type === 'info' && 'text-primary'
      )} />
      <div>
        <p className="font-medium text-sm">{alert.title}</p>
        <p className="text-sm text-muted-foreground">{alert.message}</p>
      </div>
    </div>
  );
}

// Funnel Step Component
function FunnelStep({ 
  label, 
  value, 
  max, 
  highlight = false 
}: { 
  label: string; 
  value: number; 
  max: number;
  highlight?: boolean;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={highlight ? 'font-medium' : 'text-muted-foreground'}>
          {label}
        </span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

export default function AdminDashboard() {
  const { metrics, alerts, mrrHistory, conversionHistory, isLoading, isLoadingHistory, refetch } = useAdminMetrics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Vista geral do sistema WillFlow</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="MRR"
          value={formatCurrency(metrics?.financial.mrr || 0)}
          icon={Euro}
          color="green"
          loading={isLoading}
        />
        <KPICard
          title="Subscrições Activas"
          value={metrics?.subscriptions.active || 0}
          icon={CreditCard}
          color="primary"
          loading={isLoading}
        />
        <KPICard
          title="Utilizadores Totais"
          value={metrics?.users.total || 0}
          icon={Users}
          loading={isLoading}
        />
        <KPICard
          title="Workspaces"
          value={metrics?.workspaces.total || 0}
          icon={Building2}
          loading={isLoading}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">ARR</p>
            <p className="text-lg font-semibold">{formatCurrency(metrics?.financial.arr || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Em Trial</p>
            <p className="text-lg font-semibold">{metrics?.subscriptions.trialing || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Past Due</p>
            <p className="text-lg font-semibold text-yellow-500">{metrics?.subscriptions.pastDue || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">WAU</p>
            <p className="text-lg font-semibold">{metrics?.users.wau || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">MAU</p>
            <p className="text-lg font-semibold">{metrics?.users.mau || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Conversão</p>
            <p className="text-lg font-semibold">{metrics?.subscriptions.conversionRate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução MRR</CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={mrrHistory}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `€${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`€${value}`, 'MRR']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorMrr)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Activation Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de Activação</CardTitle>
            <CardDescription>Progresso dos utilizadores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </>
            ) : (
              <>
                <FunnelStep 
                  label="Registos" 
                  value={metrics?.activation.signups || 0} 
                  max={metrics?.activation.signups || 1}
                  highlight
                />
                <FunnelStep 
                  label="Com Workspace" 
                  value={metrics?.activation.withWorkspace || 0} 
                  max={metrics?.activation.signups || 1}
                />
                <FunnelStep 
                  label="Com Projeto" 
                  value={metrics?.activation.withProject || 0} 
                  max={metrics?.activation.signups || 1}
                />
                <FunnelStep 
                  label="Pagaram" 
                  value={metrics?.activation.withPayment || 0} 
                  max={metrics?.activation.signups || 1}
                  highlight
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registos vs Pagos</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={conversionHistory}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="signups" name="Registos" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Pagos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
