import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Calendar, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const categoryMeta: Record<string, { title: string; description: string; keywords: string[] }> = {
  novidades: {
    title: 'Novidades',
    description: 'Atualizações, lançamentos e novidades do WillFlow. Fique a par das últimas funcionalidades para gestão de projetos audiovisuais.',
    keywords: ['willflow', 'novidades', 'atualizações', 'gestão de projetos', 'produção audiovisual'],
  },
  tutorial: {
    title: 'Tutoriais',
    description: 'Tutoriais passo a passo para dominar o WillFlow. Aprenda a gerir projetos de fotografia e vídeo como um profissional.',
    keywords: ['tutorial', 'como usar', 'guia', 'gestão de projetos', 'fotografia', 'vídeo'],
  },
  comparacao: {
    title: 'Comparações',
    description: 'Comparações entre ferramentas de gestão. Veja como o WillFlow se destaca para produtores de conteúdo audiovisual.',
    keywords: ['comparação', 'alternativas', 'melhor software', 'gestão de projetos', 'freelancer'],
  },
  dicas: {
    title: 'Dicas',
    description: 'Dicas e boas práticas para fotógrafos, videomakers e produtores. Melhore a sua produtividade e gestão de negócios.',
    keywords: ['dicas', 'produtividade', 'gestão', 'fotógrafo', 'videomaker', 'freelancer'],
  },
};

export default function BlogCategory() {
  const { category } = useParams<{ category: string }>();
  const { posts, loading, error } = useBlogPosts();
  
  const categoryInfo = category ? categoryMeta[category] : null;
  const filteredPosts = posts.filter(p => p.category === category);

  const getCategoryColor = (cat: string | null) => {
    switch (cat) {
      case 'novidades': return 'bg-primary/10 text-primary';
      case 'tutorial': return 'bg-blue-500/10 text-blue-500';
      case 'comparacao': return 'bg-amber-500/10 text-amber-500';
      case 'dicas': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (cat: string | null) => {
    switch (cat) {
      case 'novidades': return 'Novidades';
      case 'tutorial': return 'Tutorial';
      case 'comparacao': return 'Comparação';
      case 'dicas': return 'Dicas';
      default: return cat || 'Geral';
    }
  };

  // Generate BreadcrumbList Schema
  const generateBreadcrumbSchema = () => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://willflow.app"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://willflow.app/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": categoryInfo?.title || 'Categoria',
        "item": `https://willflow.app/blog/categoria/${category}`
      }
    ]
  });

  // Generate CollectionPage Schema
  const generateCollectionSchema = () => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${categoryInfo?.title || 'Categoria'} - Blog WillFlow`,
    "description": categoryInfo?.description || '',
    "url": `https://willflow.app/blog/categoria/${category}`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": filteredPosts.length,
      "itemListElement": filteredPosts.slice(0, 10).map((post, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://willflow.app/blog/${post.slug}`,
        "name": post.title
      }))
    }
  });

  if (!categoryInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Categoria não encontrada | WillFlow Blog</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <PublicHeader />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Categoria não encontrada</h1>
          <p className="text-muted-foreground">A categoria que procura não existe.</p>
          <Button asChild variant="outline">
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Blog
            </Link>
          </Button>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{categoryInfo.title} | WillFlow Blog</title>
        <meta name="description" content={categoryInfo.description} />
        <meta name="keywords" content={categoryInfo.keywords.join(', ')} />
        <link rel="canonical" href={`https://willflow.app/blog/categoria/${category}`} />
        
        <meta property="og:title" content={`${categoryInfo.title} | WillFlow Blog`} />
        <meta property="og:description" content={categoryInfo.description} />
        <meta property="og:url" content={`https://willflow.app/blog/categoria/${category}`} />
        <meta property="og:type" content="website" />
        
        <meta name="twitter:title" content={`${categoryInfo.title} | WillFlow Blog`} />
        <meta name="twitter:description" content={categoryInfo.description} />
        
        <script type="application/ld+json">
          {JSON.stringify(generateBreadcrumbSchema())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateCollectionSchema())}
        </script>
      </Helmet>
      
      <PublicHeader />
      
      <main className="flex-1">
        {/* Breadcrumbs */}
        <nav className="container mx-auto max-w-6xl px-4 pt-24" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            </li>
            <li>/</li>
            <li className="text-foreground font-medium">{categoryInfo.title}</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="py-12 md:py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className={`${getCategoryColor(category)} mb-4`}>
              {getCategoryLabel(category)}
            </Badge>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              {categoryInfo.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              {categoryInfo.description}
            </motion.p>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Erro ao carregar artigos.</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold mb-2">Nenhum artigo nesta categoria</h3>
                <p className="text-muted-foreground mb-6">
                  Ainda não temos artigos publicados nesta categoria. Volte em breve!
                </p>
                <Button asChild variant="outline">
                  <Link to="/blog">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Ver todos os artigos
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post, index) => (
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
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
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

        {/* Other Categories */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-xl font-bold mb-6 text-center">Outras Categorias</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(categoryMeta)
                .filter(([key]) => key !== category)
                .map(([key, info]) => (
                  <Link key={key} to={`/blog/categoria/${key}`}>
                    <Badge 
                      variant="secondary" 
                      className={`${getCategoryColor(key)} hover:opacity-80 transition-opacity cursor-pointer py-2 px-4 text-sm`}
                    >
                      {info.title}
                    </Badge>
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
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
