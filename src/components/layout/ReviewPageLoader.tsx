import { Loader2 } from 'lucide-react';

/** Never show platform branding before the capability reveals the studio. */
export function ReviewPageLoader() {
  return <main className="min-h-screen flex items-center justify-center bg-background text-muted-foreground" aria-busy="true" aria-label="Carregando revisão de vídeo"><Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" /></main>;
}