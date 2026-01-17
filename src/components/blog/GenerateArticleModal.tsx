import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import type { GenerateOptions } from '@/hooks/useBlogAdmin';

interface GenerateArticleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: GenerateOptions) => Promise<void>;
  isGenerating: boolean;
}

const CATEGORIES = [
  { value: 'novidades', label: 'Novidades' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'comparacao', label: 'Comparação' },
  { value: 'dicas', label: 'Dicas' },
];

export function GenerateArticleModal({ 
  open, 
  onOpenChange, 
  onGenerate, 
  isGenerating 
}: GenerateArticleModalProps) {
  const [topics, setTopics] = useState('');
  const [autoPublish, setAutoPublish] = useState(false);
  const [category, setCategory] = useState<string>('');

  const handleGenerate = async () => {
    const options: GenerateOptions = {
      autoPublish,
    };

    if (topics.trim()) {
      options.topics = topics.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (category) {
      options.category = category;
    }

    await onGenerate(options);
    
    // Reset form on success
    setTopics('');
    setAutoPublish(false);
    setCategory('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Artigo com AI
          </DialogTitle>
          <DialogDescription>
            A AI irá pesquisar notícias relevantes e gerar um artigo completo para o blog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topics */}
          <div className="space-y-2">
            <Label htmlFor="topics">Tópicos personalizados (opcional)</Label>
            <Input
              id="topics"
              placeholder="Ex: drones, fotografia aérea, tendências 2026"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Separa múltiplos tópicos por vírgula. Se vazio, usa tópicos padrão do nicho.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria preferida</Label>
            <Select value={category} onValueChange={setCategory} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue placeholder="Deixar AI decidir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Deixar AI decidir</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto Publish */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoPublish"
              checked={autoPublish}
              onCheckedChange={(checked) => setAutoPublish(checked === true)}
              disabled={isGenerating}
            />
            <Label htmlFor="autoPublish" className="text-sm font-normal cursor-pointer">
              Publicar automaticamente após geração
            </Label>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Como funciona:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Pesquisa notícias recentes via Perplexity AI</li>
              <li>Seleciona a mais relevante para o nicho</li>
              <li>Gera artigo completo com Lovable AI</li>
              <li>Guarda como rascunho (ou publica se selecionado)</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A gerar...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Gerar Artigo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
