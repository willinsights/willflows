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
  FileText
} from 'lucide-react';
import type { BlogPost } from '@/hooks/useBlogAdmin';

interface BlogPostCardProps {
  post: BlogPost;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (post: BlogPost) => void;
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
  onEdit 
}: BlogPostCardProps) {
  const formattedDate = post.published_at
    ? format(new Date(post.published_at), "d MMM yyyy", { locale: pt })
    : format(new Date(post.created_at), "d MMM yyyy", { locale: pt });

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge 
                variant="outline" 
                className={getCategoryColor(post.category)}
              >
                {getCategoryLabel(post.category)}
              </Badge>
              {post.is_published ? (
                <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                  <Eye className="h-3 w-3 mr-1" />
                  Publicado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <FileText className="h-3 w-3 mr-1" />
                  Rascunho
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base leading-tight line-clamp-2">
              {post.title}
            </h3>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {post.is_published ? (
                <DropdownMenuItem onClick={() => window.open(`/blog/${post.slug}`, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no blog
                </DropdownMenuItem>
              ) : null}
              
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(post)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
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
      
      <CardContent className="flex-1 pb-3">
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {post.excerpt}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </div>
        <span className="mx-2">•</span>
        <span>{post.author_name}</span>
      </CardFooter>
    </Card>
  );
}
