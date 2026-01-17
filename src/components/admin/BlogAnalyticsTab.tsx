import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Eye, Share2, TrendingUp } from 'lucide-react';
import { useSystemStats } from '@/hooks/useSystemStats';
import { useBlogShareAnalytics } from '@/hooks/useBlogShareAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function BlogAnalyticsTab() {
  const { blogAnalytics, isLoading } = useSystemStats();
  const { analytics: shareAnalytics, platformTotals, isLoading: sharesLoading } = useBlogShareAnalytics();

  if (isLoading || sharesLoading) {
    return (
      <div className="space-y-6">
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

  // Calculate totals
  const totalViews = blogAnalytics.reduce((acc, b) => acc + b.viewCount, 0);
  const totalShares = platformTotals?.total || 0;
  const articlesWithViews = blogAnalytics.filter(b => b.viewCount > 0).length;
  const topArticles = blogAnalytics.slice(0, 10);

  // Chart data - top 5 articles
  const chartData = topArticles.slice(0, 5).map(article => ({
    name: article.postTitle.length > 20 
      ? article.postTitle.substring(0, 20) + '...' 
      : article.postTitle,
    views: article.viewCount,
    shares: shareAnalytics.find(s => s.post_id === article.postId)?.total || 0,
  }));

  return (
    <div className="space-y-6">
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
            <p className="text-3xl font-bold">{totalViews.toLocaleString('pt-PT')}</p>
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
      {chartData.length > 0 && (
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
                <BarChart data={chartData} layout="vertical">
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
          {topArticles.length > 0 ? (
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
                {topArticles.map((article, index) => {
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
              <p className="text-sm">As visualizações de artigos serão registadas automaticamente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
