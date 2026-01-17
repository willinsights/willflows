import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Twitter, Linkedin, Facebook, Link2, Share2, TrendingUp } from 'lucide-react';
import { useBlogShareAnalytics } from '@/hooks/useBlogShareAnalytics';

export function BlogShareAnalytics() {
  const { analytics, platformTotals, isLoading } = useBlogShareAnalytics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <CardTitle>Analytics de Partilha</CardTitle>
        </div>
        <CardDescription>
          Rastreio de partilhas dos artigos nas redes sociais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform Totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{platformTotals.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            <div>
              <p className="text-2xl font-bold">{platformTotals.twitter}</p>
              <p className="text-xs text-muted-foreground">Twitter</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            <div>
              <p className="text-2xl font-bold">{platformTotals.linkedin}</p>
              <p className="text-xs text-muted-foreground">LinkedIn</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
            <div>
              <p className="text-2xl font-bold">{platformTotals.facebook}</p>
              <p className="text-xs text-muted-foreground">Facebook</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Link2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{platformTotals.copy_link}</p>
              <p className="text-xs text-muted-foreground">Copiar Link</p>
            </div>
          </div>
        </div>

        {/* Per-Article Table */}
        {analytics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ainda não há dados de partilha.</p>
            <p className="text-sm">As partilhas aparecerão aqui quando os leitores partilharem artigos.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artigo</TableHead>
                <TableHead className="text-center">
                  <Twitter className="h-4 w-4 mx-auto" />
                </TableHead>
                <TableHead className="text-center">
                  <Linkedin className="h-4 w-4 mx-auto" />
                </TableHead>
                <TableHead className="text-center">
                  <Facebook className="h-4 w-4 mx-auto" />
                </TableHead>
                <TableHead className="text-center">
                  <Link2 className="h-4 w-4 mx-auto" />
                </TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((item) => (
                <TableRow key={item.post_id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {item.post_title}
                  </TableCell>
                  <TableCell className="text-center">{item.twitter || '-'}</TableCell>
                  <TableCell className="text-center">{item.linkedin || '-'}</TableCell>
                  <TableCell className="text-center">{item.facebook || '-'}</TableCell>
                  <TableCell className="text-center">{item.copy_link || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{item.total}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
