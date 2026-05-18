import { useState, useRef } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, Send, X, ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFeedback, FeedbackType } from '@/hooks/useFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('improvement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { submitFeedback, submitting } = useFeedback();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de ficheiro inválido',
        description: 'Por favor seleciona uma imagem (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Ficheiro muito grande',
        description: 'O tamanho máximo é 5MB.',
        variant: 'destructive',
      });
      return;
    }
    
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshot || !user) return null;
    
    setUploadingScreenshot(true);
    try {
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('feedback-screenshots')
        .upload(fileName, screenshot);
        
      if (error) throw error;
      
      const { data } = supabase.storage
        .from('feedback-screenshots')
        .getPublicUrl(fileName);
        
      return data.publicUrl;
    } catch (error) {
      logger.error('Error uploading screenshot:', error);
      toast({
        title: 'Erro ao carregar imagem',
        description: 'Não foi possível carregar o screenshot.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) return;
    
    // Upload screenshot first if exists
    let screenshotUrl: string | null = null;
    if (screenshot) {
      screenshotUrl = await uploadScreenshot();
    }
    
    const success = await submitFeedback({
      type,
      title: title.trim(),
      description: description.trim(),
      screenshotUrl,
    });

    if (success) {
      // Reset form and close
      setType('improvement');
      setTitle('');
      setDescription('');
      removeScreenshot();
      setOpen(false);
    }
  };

  const isValid = title.trim().length > 0 && description.trim().length > 0;
  const isSubmitting = submitting || uploadingScreenshot;

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

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Screenshot (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotSelect}
              className="hidden"
              id="feedback-screenshot"
            />
            
            {screenshotPreview ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img 
                  src={screenshotPreview} 
                  alt="Preview do screenshot" 
                  className="w-full h-24 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={removeScreenshot}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                Anexar Screenshot
              </Button>
            )}
            <p className="text-xs text-muted-foreground">PNG, JPG - máx. 5MB</p>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={!isValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Feedback
              </>
            )}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
