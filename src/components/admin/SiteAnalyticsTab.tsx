import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, TrendingUp, Eye, Users } from 'lucide-react';
import { useSystemStats } from '@/hooks/useSystemStats';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export function SiteAnalyticsTab() {
  const { pageAnalytics, dailyVisits, totals, isLoading } = useSystemStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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

  // Get page title display name
  const getPageName = (path: string, title: string | null) => {
    const pageNames: Record<string, string> = {
      '/': 'Página Inicial',
      '/pricing': 'Preços',
      '/features': 'Funcionalidades',
      '/blog': 'Blog',
      '/security': 'Segurança',
      '/help': 'Ajuda',
      '/integrations': 'Integrações',
      '/auth': 'Login/Registo',
    };
    return pageNames[path] || title || path;
  };

  // Top 10 pages
  const topPages = pageAnalytics.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visitas Hoje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals?.todayViews.toLocaleString('pt-PT') || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Últimos 7 Dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals?.weekViews.toLocaleString('pt-PT') || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Últimos 30 Dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals?.monthViews.toLocaleString('pt-PT') || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Visits Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Visitas ao Longo do Tempo</CardTitle>
          <CardDescription>
            Visualizações e sessões únicas nos últimos 30 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyVisits}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(parseISO(date), 'dd/MM', { locale: pt })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(date) => format(parseISO(date as string), "EEEE, dd 'de' MMMM", { locale: pt })}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('pt-PT'),
                    name === 'views' ? 'Visualizações' : 'Sessões Únicas'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
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

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Páginas Mais Visitadas</CardTitle>
          <CardDescription>
            Ranking das 10 páginas com mais visualizações (30 dias)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topPages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Página</TableHead>
                  <TableHead className="text-right">Visualizações</TableHead>
                  <TableHead className="text-right">Sessões Únicas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.map((page, index) => (
                  <TableRow key={page.pagePath}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getPageName(page.pagePath, page.pageTitle)}</p>
                        <p className="text-xs text-muted-foreground">{page.pagePath}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {page.viewCount.toLocaleString('pt-PT')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {page.uniqueSessions.toLocaleString('pt-PT')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ainda não há dados de visitas</p>
              <p className="text-sm">As visitas começarão a ser registadas automaticamente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
