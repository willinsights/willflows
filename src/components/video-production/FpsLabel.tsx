export function FpsLabel({ fps, className = '' }: { fps: number | null; className?: string }) {
  return <p className={`text-xs text-muted-foreground ${className}`} title="Cada vídeo mantém o seu próprio timecode e velocidade de imagens. Vídeos com velocidades diferentes podem mostrar números de imagem diferentes no mesmo momento.">
    {fps ? `${String(fps).replace('.', ',')} fps` : 'Velocidade: reproduza o vídeo para detetar'}
  </p>;
}
