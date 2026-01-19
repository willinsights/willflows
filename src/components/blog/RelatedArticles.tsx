import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface RelatedArticlesProps {
  currentPostId: string;
  currentCategory: string | null;
  maxPosts?: number;
}

export function RelatedArticles({ currentPostId, currentCategory, maxPosts = 3 }: RelatedArticlesProps) {
  const { posts } = useBlogPosts();
  
  // Filter out current post and prioritize same category
  const relatedPosts = posts
    .filter(p => p.id !== currentPostId)
    .sort((a, b) => {
      // Prioritize same category
      const aMatch = a.category === currentCategory ? 1 : 0;
      const bMatch = b.category === currentCategory ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      
      // Then sort by date
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, maxPosts);

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'novidades': return 'bg-primary/10 text-primary';
      case 'tutorial': return 'bg-blue-500/10 text-blue-500';
      case 'comparacao': return 'bg-amber-500/10 text-amber-500';
      case 'dicas': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (category: string | null) => {
    switch (category) {
      case 'novidades': return 'Novidades';
      case 'tutorial': return 'Tutorial';
      case 'comparacao': return 'Comparação';
      case 'dicas': return 'Dicas';
      default: return category || 'Geral';
    }
  };

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <section className="py-12 border-t">
      <h2 className="text-2xl font-bold mb-8">Artigos Relacionados</h2>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={`/blog/${post.slug}`}>
              <Card className="h-full hover:shadow-lg transition-all cursor-pointer group overflow-hidden hover:border-primary/50">
                {post.cover_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={getCategoryColor(post.category)}>
                      {getCategoryLabel(post.category)}
                    </Badge>
                    {post.published_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(post.published_at), 'dd MMM', { locale: pt })}
                      </span>
                    )}
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors line-clamp-2 text-base">
                    {post.title}
                  </CardTitle>
                  {post.excerpt && (
                    <CardDescription className="line-clamp-2 text-sm">
                      {post.excerpt}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center text-sm text-primary font-medium">
                    Ler artigo
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
