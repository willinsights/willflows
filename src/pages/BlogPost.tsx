import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, Loader2, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { ShareButtons } from '@/components/blog/ShareButtons';
import { TableOfContents } from '@/components/blog/TableOfContents';
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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

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
        <div className="container mx-auto max-w-6xl px-4 pt-24">
          <Button asChild variant="ghost" size="sm">
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Blog
            </Link>
          </Button>
        </div>

        {/* Hero Cover Image */}
        {post.cover_image && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto max-w-6xl px-4 mt-6"
          >
            <div className="relative aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              
              {/* Image Credits */}
              {post.cover_image_credit && (
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  {post.cover_image_source ? (
                    <a 
                      href={post.cover_image_source} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {post.cover_image_credit}
                    </a>
                  ) : (
                    <span>{post.cover_image_credit}</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Article Content with Sidebar */}
        <article className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-12">
              {/* Main Content */}
              <div>
                <motion.header
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-10"
                >
                  {/* Category Badge */}
                  <Badge variant="secondary" className={`${getCategoryColor(post.category)} mb-4`}>
                    {getCategoryLabel(post.category)}
                  </Badge>
                  
                  {/* Title */}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight tracking-tight">
                    {post.title}
                  </h1>
                  
                  {/* Excerpt */}
                  {post.excerpt && (
                    <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                      {post.excerpt}
                    </p>
                  )}
                  
                  {/* Author & Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                        <User className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{post.author_name}</p>
                        {post.published_at && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(post.published_at), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Share Buttons */}
                    <ShareButtons url={currentUrl} title={post.title} postId={post.id} />
                  </div>
                </motion.header>

                {/* Article Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="blog-content prose prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
                />

                {/* Bottom Share */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-12 pt-8 border-t"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-muted-foreground">Gostou deste artigo? Partilhe!</p>
                    <ShareButtons url={currentUrl} title={post.title} postId={post.id} />
                  </div>
                </motion.div>
              </div>

              {/* Sidebar - Table of Contents */}
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <TableOfContents content={post.content} />
                </div>
              </aside>
            </div>
          </div>
        </article>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Gostou deste artigo?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Experimente o WillFlow e veja como pode transformar a gestão do seu estúdio de audiovisual.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="gradient-primary shadow-lg">
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
