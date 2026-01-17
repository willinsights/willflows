import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Edit, Send, X, Calendar, User } from "lucide-react";
import DOMPurify from "dompurify";
import type { BlogPost } from "@/hooks/useBlogAdmin";

interface PreviewArticleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPost | null;
  onEdit: () => void;
  onPublish: () => void;
}

function getCategoryLabel(category: string | null): string {
  const labels: Record<string, string> = {
    novidades: "Novidades",
    tutorial: "Tutorial",
    comparacao: "Comparação",
    dicas: "Dicas",
  };
  return category ? labels[category] || category : "Sem categoria";
}

function getCategoryColor(category: string | null): string {
  const colors: Record<string, string> = {
    novidades: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    tutorial: "bg-green-500/10 text-green-500 border-green-500/20",
    comparacao: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    dicas: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };
  return category ? colors[category] || "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground";
}

export function PreviewArticleModal({ 
  open, 
  onOpenChange, 
  post, 
  onEdit, 
  onPublish 
}: PreviewArticleModalProps) {
  if (!post) return null;

  const sanitizedContent = DOMPurify.sanitize(post.content);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold">Preview do Artigo</DialogTitle>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                Rascunho
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button size="sm" onClick={onPublish}>
                <Send className="h-4 w-4 mr-2" />
                Publicar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 h-full">
          <article className="max-w-3xl mx-auto px-6 py-8">
            {/* Cover Image */}
            {post.cover_image && (
              <div className="aspect-video w-full rounded-xl overflow-hidden mb-8 bg-muted">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Category */}
            <Badge className={`mb-4 ${getCategoryColor(post.category)}`}>
              {getCategoryLabel(post.category)}
            </Badge>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{post.author_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(post.created_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </span>
              </div>
            </div>

            {/* Content */}
            <div 
              className="prose prose-lg dark:prose-invert max-w-none
                prose-headings:font-bold prose-headings:tracking-tight
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:leading-relaxed prose-p:mb-4
                prose-ul:my-4 prose-ul:space-y-2
                prose-ol:my-4 prose-ol:space-y-2
                prose-li:leading-relaxed
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-6
                prose-strong:font-semibold
                prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </article>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
