import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, Loader2, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { useBlogPost } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { post, loading, error } = useBlogPost(slug);

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Artigo não encontrado</h1>
          <p className="text-muted-foreground">O artigo que procura não existe ou foi removido.</p>
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
      <PublicHeader />
      
      <main className="flex-1">
        {/* Back Button */}
        <div className="container mx-auto max-w-4xl px-4 pt-8">
          <Button asChild variant="ghost" size="sm">
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Blog
            </Link>
          </Button>
        </div>

        {/* Article Header */}
        <article className="py-8 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.header
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="secondary" className={getCategoryColor(post.category)}>
                  {getCategoryLabel(post.category)}
                </Badge>
                {post.published_at && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(post.published_at), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                {post.title}
              </h1>
              
              {post.excerpt && (
                <p className="text-lg text-muted-foreground">
                  {post.excerpt}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-6 pt-6 border-t">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{post.author_name}</p>
                  <p className="text-sm text-muted-foreground">Autor</p>
                </div>
              </div>
            </motion.header>

            {/* Cover Image */}
            {post.cover_image && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8 rounded-xl overflow-hidden"
              >
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-auto object-cover"
                />
              </motion.div>
            )}

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />
          </div>
        </article>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-primary/5 mt-16">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Gostou deste artigo?
            </h2>
            <p className="text-muted-foreground mb-6">
              Experimente o WillFlow e veja como pode transformar a gestão do seu estúdio.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="gradient-primary">
                <Link to="/auth">Começar Gratuitamente</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/blog">Ver Mais Artigos</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
