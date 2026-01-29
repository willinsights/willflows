import { useFFmpegContext } from '@/contexts/FFmpegContext';
import { CheckCircle2, Loader2, AlertCircle, Download, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FFmpegStatusIndicatorProps {
  className?: string;
}

export function FFmpegStatusIndicator({ className }: FFmpegStatusIndicatorProps) {
  const { 
    isLoaded, 
    isLoading, 
    loadError, 
    loadProgress, 
    preload, 
    cancelPreload,
    isolationStatus,
    enableIsolation,
  } = useFFmpegContext();

  // Show isolation status first if not isolated
  if (isolationStatus === 'checking') {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>A verificar ambiente...</span>
      </div>
    );
  }

  if (isolationStatus === 'activating') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>A ativar ambiente seguro...</span>
        </div>
        <p className="text-xs text-muted-foreground">
          A página será recarregada automaticamente.
        </p>
      </div>
    );
  }

  if (isolationStatus === 'not-isolated') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <Shield className="h-4 w-4" />
          <span>Compressão não ativada</span>
        </div>
        <p className="text-xs text-muted-foreground">
          É necessário ativar o ambiente seguro para comprimir vídeos.
          A página será recarregada uma vez.
        </p>
        <Button variant="outline" size="sm" onClick={() => enableIsolation()}>
          <ShieldCheck className="h-4 w-4 mr-1" />
          Ativar Compressão
        </Button>
      </div>
    );
  }

  if (isolationStatus === 'unsupported') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4" />
          <span>Compressão não disponível</span>
        </div>
        <p className="text-xs text-muted-foreground">
          O seu navegador não suporta compressão local ou está em modo privado.
          Pode continuar a enviar vídeos sem compressão.
        </p>
      </div>
    );
  }

  // From here, we're isolated - show FFmpeg loading status
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
