import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, Sparkles, ImageIcon, Eye } from 'lucide-react';
import { BlogPost } from '@/hooks/useBlogAdmin';

interface EditArticleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPost;
  onSave: (updates: Partial<BlogPost>) => Promise<void>;
  onRegenerateImage: () => Promise<void>;
  isRegeneratingImage?: boolean;
}

const categories = [
  { value: 'novidades', label: 'Novidades' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'comparacao', label: 'Comparação' },
  { value: 'dicas', label: 'Dicas' },
];

export function EditArticleModal({ 
  open, 
  onOpenChange, 
  post, 
  onSave,
  onRegenerateImage,
  isRegeneratingImage = false
}: EditArticleModalProps) {
  const [title, setTitle] = useState(post.title);
  const [excerpt, setExcerpt] = useState(post.excerpt || '');
  const [category, setCategory] = useState(post.category || 'novidades');
  const [content, setContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [contentView, setContentView] = useState<'html' | 'preview'>('html');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        title,
        excerpt: excerpt || null,
        category,
        content,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateImage = async () => {
    await onRegenerateImage();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Editar Artigo
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Cover Image */}
            <div className="space-y-3">
              <Label>Imagem de Capa</Label>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {post.cover_image ? (
                  <img 
                    src={post.cover_image} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-2" />
                    <p className="text-sm">Sem imagem de capa</p>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRegenerateImage}
                disabled={isRegeneratingImage}
              >
                {isRegeneratingImage ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {post.cover_image ? 'Regenerar Imagem com AI' : 'Gerar Imagem com AI'}
              </Button>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do artigo"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{title.length}/200 caracteres</p>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt (SEO)</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Resumo do artigo para SEO e preview..."
                maxLength={300}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">{excerpt.length}/300 caracteres</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo</Label>
                <Tabs value={contentView} onValueChange={(v) => setContentView(v as 'html' | 'preview')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="html" className="text-xs px-2 h-6">HTML</TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs px-2 h-6">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {contentView === 'html' ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="<article>Conteúdo HTML do artigo...</article>"
                  rows={12}
                  className="font-mono text-sm"
                />
              ) : (
                <div 
                  className="prose prose-sm max-w-none p-4 border rounded-lg bg-background min-h-[300px]"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
