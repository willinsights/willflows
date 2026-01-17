import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, FolderKanban, CreditCard, Sparkles, Crown, Eye, Calendar } from 'lucide-react';
import { useSystemStats } from '@/hooks/useSystemStats';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export function SystemOverviewTab() {
  const { overview, dailyVisits, totals, isLoading } = useSystemStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsCards = [
    { 
      label: 'Utilizadores', 
      value: overview?.totalUsers || 0, 
      icon: Users, 
      color: 'text-blue-500' 
    },
    { 
      label: 'Workspaces', 
      value: overview?.totalWorkspaces || 0, 
      icon: Building2, 
      color: 'text-purple-500' 
    },
    { 
      label: 'Projetos', 
      value: overview?.totalProjects || 0, 
      icon: FolderKanban, 
      color: 'text-green-500' 
    },
    { 
      label: 'Subscrições Ativas', 
      value: overview?.activeSubscriptions || 0, 
      icon: CreditCard, 
      color: 'text-amber-500' 
    },
    { 
      label: 'Em Trial', 
      value: overview?.trialUsers || 0, 
      icon: Sparkles, 
      color: 'text-cyan-500' 
    },
    { 
      label: 'Pagantes', 
      value: overview?.paidUsers || 0, 
      icon: Crown, 
      color: 'text-yellow-500' 
    },
  ];

  const visitCards = [
    { label: 'Hoje', value: totals?.todayViews || 0 },
    { label: '7 Dias', value: totals?.weekViews || 0 },
    { label: '30 Dias', value: totals?.monthViews || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                {stat.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value.toLocaleString('pt-PT')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visit Stats */}
      <div className="grid grid-cols-3 gap-4">
        {visitCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Visitas ({stat.label})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value.toLocaleString('pt-PT')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visits Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Visitas ao Site (30 dias)
          </CardTitle>
          <CardDescription>
            Visualizações de páginas públicas ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyVisits}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(parseISO(date), 'dd MMM', { locale: pt })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(date) => format(parseISO(date as string), 'dd MMMM yyyy', { locale: pt })}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('pt-PT'),
                    name === 'views' ? 'Visualizações' : 'Sessões Únicas'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="views"
                />
                <Line 
                  type="monotone" 
                  dataKey="uniqueSessions" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="sessions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
