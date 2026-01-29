import { useFFmpegContext } from '@/contexts/FFmpegContext';
import { CheckCircle2, Loader2, AlertCircle, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FFmpegStatusIndicatorProps {
  className?: string;
}

export function FFmpegStatusIndicator({ className }: FFmpegStatusIndicatorProps) {
  const { isLoaded, isLoading, loadError, loadProgress, preload, cancelPreload } = useFFmpegContext();

  if (isLoaded) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-green-600", className)}>
        <CheckCircle2 className="h-4 w-4" />
        <span>Motor de compressão pronto</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>A preparar motor de compressão ({loadProgress}%)</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={cancelPreload}
          >
            <X className="h-3 w-3 mr-1" />
            Cancelar
          </Button>
        </div>
        <Progress value={loadProgress} className="h-1.5" />
        <p className="text-xs text-muted-foreground">
          Download único de ~31MB (primeira vez pode demorar)
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Erro ao carregar motor</span>
        </div>
        <p className="text-xs text-muted-foreground">{loadError}</p>
        <Button variant="outline" size="sm" onClick={() => preload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Not loaded yet - show button to preload
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Download className="h-4 w-4" />
        <span>Motor de compressão não carregado</span>
      </div>
      <Button variant="outline" size="sm" onClick={() => preload()}>
        Preparar agora
      </Button>
      <p className="text-xs text-muted-foreground">
        Prepara o motor antecipadamente para compressões mais rápidas
      </p>
    </div>
  );
}
