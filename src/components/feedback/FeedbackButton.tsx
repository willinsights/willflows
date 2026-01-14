import { useState } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, Send, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFeedback, FeedbackType } from '@/hooks/useFeedback';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('improvement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const { submitFeedback, submitting } = useFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) return;
    
    const success = await submitFeedback({
      type,
      title: title.trim(),
      description: description.trim(),
    });

    if (success) {
      // Reset form and close
      setType('improvement');
      setTitle('');
      setDescription('');
      setOpen(false);
    }
  };

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
          size="icon"
          aria-label="Enviar feedback"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" side="top" sideOffset={12}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Enviar Feedback</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tipo</Label>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={(value) => value && setType(value as FeedbackType)}
              className="justify-start"
            >
              <ToggleGroupItem value="bug" aria-label="Reportar bug" className="gap-2">
                <Bug className="h-4 w-4" />
                Bug
              </ToggleGroupItem>
              <ToggleGroupItem value="improvement" aria-label="Sugestão" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Sugestão
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-title" className="text-sm text-muted-foreground">
              Título
            </Label>
            <Input
              id="feedback-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'bug' ? 'Descreve o problema...' : 'A tua ideia...'}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-description" className="text-sm text-muted-foreground">
              Descrição
            </Label>
            <Textarea
              id="feedback-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'bug'
                  ? 'O que aconteceu? Quais passos seguiste?'
                  : 'Explica a tua sugestão em detalhe...'
              }
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={!isValid || submitting}>
            <Send className="h-4 w-4" />
            {submitting ? 'A enviar...' : 'Enviar Feedback'}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
