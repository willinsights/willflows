import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Eye, 
  EyeOff, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  ExternalLink,
  Calendar,
  FileText,
  ImageIcon,
  Search,
  Sparkles,
  Loader2
} from 'lucide-react';
import type { BlogPost } from '@/hooks/useBlogAdmin';

interface BlogPostCardProps {
  post: BlogPost;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (post: BlogPost) => void;
  onPreview?: (post: BlogPost) => void;
  onGenerateImage?: (postId: string, title: string) => Promise<{ success: boolean; imageUrl?: string; error?: string } | void>;
  isGeneratingImage?: boolean;
  generatingImageId?: string;
}

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case 'novidades':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'tutorial':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'comparacao':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'dicas':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getCategoryLabel = (category: string | null) => {
  switch (category) {
    case 'novidades': return 'Novidades';
    case 'tutorial': return 'Tutorial';
    case 'comparacao': return 'Comparação';
    case 'dicas': return 'Dicas';
    default: return 'Geral';
  }
};

export function BlogPostCard({ 
  post, 
  onPublish, 
  onUnpublish, 
  onDelete,
  onEdit,
  onPreview,
  onGenerateImage,
  isGeneratingImage,
  generatingImageId
}: BlogPostCardProps) {
  const formattedDate = post.published_at
    ? format(new Date(post.published_at), "d MMM yyyy", { locale: pt })
    : format(new Date(post.created_at), "d MMM yyyy", { locale: pt });

  const isThisGenerating = isGeneratingImage && generatingImageId === post.id;

  const handleGenerateImage = async () => {
    if (onGenerateImage) {
      await onGenerateImage(post.id, post.title);
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Cover Image */}
      <div className="relative aspect-video bg-muted">
        {post.cover_image ? (
          <img 
            src={post.cover_image} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Sem imagem</span>
            {onGenerateImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateImage}
                disabled={isThisGenerating}
                className="mt-2 gap-1.5"
              >
                {isThisGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Gerar Imagem AI
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        {/* Status badges overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <Badge 
            variant="outline" 
            className={`${getCategoryColor(post.category)} bg-background/80 backdrop-blur-sm`}
          >
            {getCategoryLabel(post.category)}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          {post.is_published ? (
            <Badge variant="default" className="bg-green-500 text-white border-0">
              <Eye className="h-3 w-3 mr-1" />
              Publicado
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              <FileText className="h-3 w-3 mr-1" />
              Rascunho
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 flex-1">
            {post.title}
          </h3>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mt-1 -mr-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {post.is_published ? (
                <DropdownMenuItem onClick={() => window.open(`/blog/${post.slug}`, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no blog
                </DropdownMenuItem>
              ) : onPreview ? (
                <DropdownMenuItem onClick={() => onPreview(post)}>
                  <Search className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
              ) : null}
              
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(post)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}

              {onGenerateImage && (
                <DropdownMenuItem onClick={handleGenerateImage} disabled={isThisGenerating}>
                  {isThisGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A gerar imagem...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {post.cover_image ? 'Regenerar Imagem' : 'Gerar Imagem AI'}
                    </>
                  )}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {post.is_published ? (
                <DropdownMenuItem onClick={() => onUnpublish(post.id)}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Despublicar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onPublish(post.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Publicar
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onDelete(post.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-2">
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.excerpt}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 pb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </div>
        <span className="mx-2">•</span>
        <span className="truncate">{post.author_name}</span>
      </CardFooter>
    </Card>
  );
}
