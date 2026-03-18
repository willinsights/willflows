/**
 * AdminAnalytics - Site, Activity, and Blog Stats
 */

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Activity, 
  BookOpen, 
  Eye, 
  TrendingUp, 
  Users,
  Share2 
} from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import { useBlogShareAnalytics } from '@/hooks/useBlogShareAnalytics';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function AdminAnalytics() {
  const { 
    activity, 
    pageAnalytics, 
    dailyVisits, 
    blogAnalytics, 
    isLoadingAnalytics 
  } = useAdminData();
  
  const { analytics: shareAnalytics, platformTotals, isLoading: sharesLoading } = useBlogShareAnalytics();

  // Get page title display name
  const getPageName = (path: string, title: string | null) => {
    const pageNames: Record<string, string> = {
      '/': 'Página Inicial',
      '/pricing': 'Preços',
      '/planos': 'Preços',
      '/features': 'Funcionalidades',
      '/funcionalidades': 'Funcionalidades',
      '/blog': 'Blog',
      '/security': 'Segurança',
      '/seguranca': 'Segurança',
      '/help': 'Ajuda',
      '/ajuda': 'Ajuda',
      '/integrations': 'Integrações',
      '/integracoes': 'Integrações',
      '/auth': 'Login/Registo',
    };
    return pageNames[path] || title || path;
  };

  const topPages = pageAnalytics.slice(0, 10);

  // Calculate blog totals
  const totalBlogViews = blogAnalytics.reduce((acc, b) => acc + b.viewCount, 0);
  const totalShares = platformTotals?.total || 0;
  const articlesWithViews = blogAnalytics.filter(b => b.viewCount > 0).length;

  // Chart data - top 5 articles
  const blogChartData = blogAnalytics.slice(0, 5).map(article => ({
    name: article.postTitle.length > 20 
      ? article.postTitle.substring(0, 20) + '...' 
      : article.postTitle,
    views: article.viewCount,
    shares: shareAnalytics.find(s => s.post_id === article.postId)?.total || 0,
  }));

  if (isLoadingAnalytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Métricas de tráfego e comportamento</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Métricas de tráfego e comportamento do site</p>
      </motion.div>

      <Tabs defaultValue="site" className="space-y-6">
        <TabsList>
          <TabsTrigger value="site" className="gap-2">
            <Globe className="h-4 w-4" />
            Site
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Actividade
          </TabsTrigger>
          <TabsTrigger value="blog" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Blog Stats
          </TabsTrigger>
        </TabsList>

        {/* SITE TAB */}
        <TabsContent value="site" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Eye, label: 'Visitas Hoje', value: activity.todayViews },
              { icon: TrendingUp, label: 'Últimos 7 Dias', value: activity.weekViews },
              { icon: Globe, label: 'Últimos 30 Dias', value: activity.monthViews },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <card.icon className="h-4 w-4" />
                      {card.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{card.value.toLocaleString('pt-PT')}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  WAU
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{activity.wau}</p>
                <p className="text-xs text-muted-foreground">Utilizadores ativos (7 dias)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  MAU
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{activity.mau}</p>
                <p className="text-xs text-muted-foreground">Utilizadores ativos (30 dias)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Views Hoje</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{activity.todayViews}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Views Mês</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{activity.monthViews}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métricas de Engagement</CardTitle>
              <CardDescription>
                Baseado em activity_log (ações dentro da aplicação)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>WAU e MAU calculados a partir do activity_log</p>
                <p className="text-sm">Contagem de utilizadores únicos que realizaram ações</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLOG STATS TAB */}
        <TabsContent value="blog" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Total Artigos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{blogAnalytics.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visualizações (30d)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalBlogViews.toLocaleString('pt-PT')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Partilhas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalShares.toLocaleString('pt-PT')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Artigos c/ Views
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{articlesWithViews}</p>
              </CardContent>
            </Card>
          </div>

          {/* Share Stats by Platform */}
          {platformTotals && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Twitter</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{platformTotals.twitter}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>LinkedIn</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{platformTotals.linkedin}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Facebook</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{platformTotals.facebook}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Copiar Link</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{platformTotals.copy_link}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Articles Chart */}
          {blogChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Artigos</CardTitle>
                <CardDescription>
                  Comparação de visualizações e partilhas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={blogChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150}
                        className="text-xs"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="views" fill="hsl(var(--primary))" name="Visualizações" />
                      <Bar dataKey="shares" fill="hsl(var(--muted-foreground))" name="Partilhas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Articles Table */}
          <Card>
            <CardHeader>
              <CardTitle>Artigos Mais Populares</CardTitle>
              <CardDescription>
                Ranking por visualizações nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {blogAnalytics.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Artigo</TableHead>
                      <TableHead className="text-right">Visualizações</TableHead>
                      <TableHead className="text-right">Sessões</TableHead>
                      <TableHead className="text-right">Partilhas</TableHead>
                      <TableHead>Publicado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogAnalytics.slice(0, 10).map((article, index) => {
                      const shares = shareAnalytics.find(s => s.post_id === article.postId);
                      return (
                        <TableRow key={article.postId}>
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="font-medium line-clamp-1">{article.postTitle}</p>
                              <p className="text-xs text-muted-foreground">/blog/{article.postSlug}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={article.viewCount > 0 ? 'default' : 'outline'}>
                              {article.viewCount.toLocaleString('pt-PT')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {article.uniqueSessions.toLocaleString('pt-PT')}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {shares?.total || 0}
                          </TableCell>
                          <TableCell>
                            {article.publishedAt ? (
                              <span className="text-sm">
                                {format(new Date(article.publishedAt), 'dd/MM/yyyy', { locale: pt })}
                              </span>
                            ) : (
                              <Badge variant="outline">Rascunho</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ainda não há dados de visualizações</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
