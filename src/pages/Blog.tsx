import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Blog() {
  const { posts, loading, error } = useBlogPosts();

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

  // Generate ItemList Schema for blog listing
  const generateBlogListSchema = () => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Blog WillFlow",
    "description": "Novidades, tutoriais, comparações e dicas para otimizar a gestão do seu estúdio de produção audiovisual.",
    "url": "https://willflow.app/blog",
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": posts.length,
      "itemListElement": posts.slice(0, 20).map((post, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "BlogPosting",
          "headline": post.title,
          "url": `https://willflow.app/blog/${post.slug}`,
          "image": post.cover_image || "https://willflow.app/logo-willflow-purple.png",
          "datePublished": post.published_at,
          "description": post.excerpt
        }
      }))
    }
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Blog | WillFlow - Dicas de Gestão para Produtores</title>
        <meta name="description" content="Novidades, tutoriais, comparações e dicas para otimizar a gestão do seu estúdio de produção audiovisual. Artigos sobre fotografia, vídeo e gestão de negócios." />
        <link rel="canonical" href="https://willflow.app/blog" />
        <link rel="alternate" type="application/rss+xml" title="WillFlow Blog RSS" href="https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/blog-rss" />
        <meta property="og:title" content="Blog | WillFlow - Dicas de Gestão para Produtores" />
        <meta property="og:description" content="Novidades, tutoriais, comparações e dicas para otimizar a gestão do seu estúdio de produção audiovisual." />
        <meta property="og:url" content="https://willflow.app/blog" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Blog | WillFlow - Dicas de Gestão para Produtores" />
        <meta name="twitter:description" content="Novidades, tutoriais, comparações e dicas para otimizar a gestão do seu estúdio de produção audiovisual." />
        
        {/* Structured Data for Blog Listing */}
        <script type="application/ld+json">
          {JSON.stringify(generateBlogListSchema())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://willflow.app/blog" }
            ]
          })}
        </script>
      </Helmet>
      <PublicHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Blog WillFlow
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
            >
              Novidades, tutoriais, comparações e dicas para otimizar a gestão do seu estúdio de produção audiovisual.
            </motion.p>
            
            {/* Category Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-3"
            >
              <Link to="/blog/categoria/novidades">
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer py-2 px-4">
                  Novidades
                </Badge>
              </Link>
              <Link to="/blog/categoria/tutorial">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors cursor-pointer py-2 px-4">
                  Tutoriais
                </Badge>
              </Link>
              <Link to="/blog/categoria/comparacao">
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors cursor-pointer py-2 px-4">
                  Comparações
                </Badge>
              </Link>
              <Link to="/blog/categoria/dicas">
                <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors cursor-pointer py-2 px-4">
                  Dicas
                </Badge>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Erro ao carregar artigos.</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold mb-2">Em breve</h3>
                <p className="text-muted-foreground">
                  Estamos a preparar conteúdo incrível para si. Volte em breve!
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={`/blog/${post.slug}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden">
                        {post.cover_image && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={post.cover_image}
                              alt={post.title}
                              title={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              decoding="async"
                              width={800}
                              height={450}
                            />
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className={getCategoryColor(post.category)}>
                              {getCategoryLabel(post.category)}
                            </Badge>
                            {post.published_at && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(post.published_at), 'dd MMM yyyy', { locale: pt })}
                              </span>
                            )}
                          </div>
                          <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                          </CardTitle>
                          {post.excerpt && (
                            <CardDescription className="line-clamp-3">
                              {post.excerpt}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
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
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-primary/5">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Pronto para transformar a gestão do seu estúdio?
            </h2>
            <p className="text-muted-foreground mb-6">
              Experimente o WillFlow gratuitamente durante 30 dias.
            </p>
            <Button asChild size="lg" className="gradient-primary">
              <Link to="/auth">
                Começar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
