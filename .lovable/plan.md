
# Plano: Corrigir Apresentação de Vídeos Verticais no Safari

## Problema Identificado

O vídeo vertical (formato Reels 9:16) está a ser apresentado incorrectamente no Safari. No Chrome aparece correctamente centrado com pillarboxing (barras pretas laterais), mas no Safari o vídeo fica distorcido ou com crop errado.

### Causas Raiz

1. **Aspect ratio forçado 16:9**: O `VideoPlayer.tsx` define `style={{ aspectRatio: '16/9' }}` directamente no elemento `<video>` (linha 532), ignorando a proporção nativa do vídeo

2. **Container fixo 16:9**: O `VideoProductionTab.tsx` passa `className="aspect-video w-full"` que força `aspect-ratio: 16/9` no container

3. **Bug do Safari com object-fit**: O Safari tem problemas conhecidos onde o `object-fit: contain` não funciona correctamente até os metadados do vídeo estarem completamente carregados, causando o "salto" visual

4. **Falta de detecção de orientação**: O sistema não detecta se o vídeo é horizontal (16:9) ou vertical (9:16) para ajustar o layout

---

## Análise das Screenshots

| Browser | Comportamento |
|---------|---------------|
| **Chrome** (Screenshot 2) | Vídeo vertical centrado correctamente com barras pretas laterais (pillarboxing) |
| **Safari** (Screenshot 1) | Vídeo aparece "zoomed in" apenas na água, perdendo o conteúdo principal |

---

## Solução

### Parte 1: Detectar Aspect Ratio Nativo do Vídeo

Adicionar detecção do aspect ratio do vídeo quando os metadados carregam:

```typescript
// VideoPlayer.tsx
const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
const [isPortrait, setIsPortrait] = useState(false);

const handleLoadedMetadata = useCallback(() => {
  if (videoRef.current) {
    const { videoWidth, videoHeight } = videoRef.current;
    const ratio = videoWidth / videoHeight;
    setVideoAspectRatio(ratio);
    setIsPortrait(ratio < 1); // Vertical if width < height
    setDuration(videoRef.current.duration);
    setIsLoading(false);
    setLoadError(null);
  }
}, []);
```

### Parte 2: Container com Aspect Ratio Dinâmico

Usar altura máxima fixa com aspect ratio dinâmico:

```typescript
// VideoPlayer.tsx - Container principal
<div 
  ref={containerRef}
  className={cn(
    "relative group bg-black rounded-lg overflow-hidden",
    // Para vídeos verticais, limitar altura e centrar
    isPortrait ? "max-h-[70vh] mx-auto" : "w-full",
    className
  )}
  style={{
    aspectRatio: videoAspectRatio 
      ? `${videoAspectRatio}` 
      : undefined,
  }}
>
```

### Parte 3: Remover Aspect Ratio Fixo do Elemento Video

Usar `object-fit: contain` sem forçar 16:9:

```typescript
// VideoPlayer.tsx - Elemento <video>
<video
  ref={videoRef}
  className="w-full h-full"
  style={{ 
    objectFit: 'contain',
    // Safari fix: usar min-height para evitar colapso
    minHeight: isPortrait ? 'auto' : undefined,
  }}
  onClick={togglePlay}
  preload="metadata"
  playsInline
/>
```

### Parte 4: Actualizar VideoProductionTab para Layout Flexível

Em vez de forçar `aspect-video`, usar container flexível:

```typescript
// VideoProductionTab.tsx
{selectedVersion && (selectedVersion.cloudflare_stream_uid || videoUrl) ? (
  <div className="relative w-full flex justify-center">
    <VideoPlayer
      ref={videoPlayerRef}
      src={videoUrl || undefined}
      streamUid={selectedVersion.cloudflare_stream_uid || undefined}
      hlsUrl={selectedVersion.stream_playback_url || undefined}
      isProcessing={isVersionProcessing}
      onAddComment={handleAddComment}
      className="w-full max-h-[70vh]"  // Altura máxima, não aspect-ratio fixo
    />
  </div>
) : ...}
```

### Parte 5: Fix Safari com min-height Workaround

Adicionar CSS específico para Safari:

```css
/* src/index.css */
/* Safari video aspect ratio fix */
@supports (-webkit-touch-callout: none) {
  video {
    min-height: 1px; /* Force Safari to respect object-fit */
  }
}
```

### Parte 6: Placeholder com Aspect Ratio Consistente

Enquanto o vídeo carrega, mostrar placeholder que depois se adapta:

```typescript
// VideoPlayer.tsx - Estado de loading
{isLoading && !videoAspectRatio && (
  <div 
    className="absolute inset-0 flex items-center justify-center bg-black"
    style={{ aspectRatio: '16/9' }} // Placeholder 16:9 enquanto carrega
  >
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
)}
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/video-production/VideoPlayer.tsx` | Detectar aspect ratio, remover 16:9 fixo, adaptar layout |
| `src/components/video-production/VideoProductionTab.tsx` | Remover `aspect-video` fixo, usar layout flexível |
| `src/pages/public/VideoApproval.tsx` | Mesma lógica para portal de aprovação |
| `src/index.css` | CSS fix para Safari |

---

## Comportamento Esperado

| Tipo de Vídeo | Apresentação |
|---------------|--------------|
| Horizontal 16:9 | Ocupa largura total, altura proporcional |
| Vertical 9:16 (Reels) | Centrado horizontalmente, altura máxima 70vh |
| Quadrado 1:1 | Centrado, adapta ao container |
| Ultra-wide 21:9 | Ocupa largura total com letterbox |

---

## Impacto

- Vídeos verticais (Reels, TikTok, Stories) exibidos correctamente em **todos os browsers**
- Safari deixa de mostrar vídeos com crop errado
- O layout adapta-se automaticamente ao tipo de conteúdo
- Mantém compatibilidade com vídeos horizontais existentes
