
# Plano: Remover Funcionalidade de Compressão de Vídeo

## Resumo

Remover completamente a funcionalidade de compressão de vídeo FFmpeg e voltar ao comportamento original de upload direto de vídeos.

---

## Ficheiros a Eliminar

| Ficheiro | Motivo |
|----------|--------|
| `public/coop-coep-worker.js` | Service Worker de isolamento COOP/COEP |
| `src/lib/coop-coep-service-worker.ts` | Utilitário de registo do Service Worker |
| `src/contexts/FFmpegContext.tsx` | Contexto do motor FFmpeg |
| `src/hooks/useVideoCompression.ts` | Hook de compressão de vídeo |
| `src/components/video-production/FFmpegStatusIndicator.tsx` | Indicador de estado do motor |

---

## Ficheiros a Modificar

### 1. `src/App.tsx`

Remover:
- Import do `FFmpegProvider`
- Wrapper `<FFmpegProvider>` do JSX

### 2. `src/components/video-production/VideoProductionTab.tsx`

Remover:
- Imports de FFmpegProvider, useFFmpegContext, useOptionalFFmpegContext
- Import do FFmpegStatusIndicator
- Lógica de preload do FFmpeg no useEffect
- Componente FFmpegStatusIndicator do JSX
- Lógica de VideoProductionTabProviderGuard (simplificar para componente direto)

### 3. `src/components/video-production/VideoVersionUpload.tsx`

Remover:
- Import de useVideoCompression
- Import de useFFmpegContext
- Estado de compressão (enableCompression, compressionComplete, compressionSavings)
- Lógica de isCompressionAvailable
- Toggle de compressão na UI
- Secção de progresso de compressão
- Botão de cancelar compressão
- Lógica de compressão no handleUpload

Resultado: Upload direto do ficheiro sem compressão.

---

## Estrutura Final

```text
VideoVersionUpload.tsx (simplificado)
├── Zona de drag & drop
├── Ficheiro selecionado (sem toggle de compressão)
├── Botão "Carregar"
└── Barra de progresso de upload
```

---

## Impacto

- **Sem compressão**: Vídeos serão enviados no tamanho original
- **Sem reload da página**: Já não há necessidade de ativar isolamento
- **Sem erros FFmpeg**: Motor completamente removido
- **Menor bundle**: Menos ~50KB de código e ~31MB de download evitado

---

## Alterações Técnicas Detalhadas

### App.tsx

```tsx
// ANTES
import { FFmpegProvider } from "@/contexts/FFmpegContext";
...
<FFmpegProvider>
  <TooltipProvider>
    ...
  </TooltipProvider>
</FFmpegProvider>

// DEPOIS
<TooltipProvider>
  ...
</TooltipProvider>
```

### VideoProductionTab.tsx

```tsx
// ANTES
import { FFmpegProvider, useFFmpegContext, useOptionalFFmpegContext } from '@/contexts/FFmpegContext';
import { FFmpegStatusIndicator } from './FFmpegStatusIndicator';

// Preload FFmpeg when entering video production
const { preload, isLoaded } = useFFmpegContext();

useEffect(() => {
  if (!isLoaded) {
    preload();
  }
}, [preload, isLoaded]);

// Na UI:
<FFmpegStatusIndicator className="shrink-0" />

// DEPOIS
// Remover todos os imports e lógica FFmpeg
// Remover FFmpegStatusIndicator da UI
// Simplificar estrutura do componente
```

### VideoVersionUpload.tsx

```tsx
// ANTES
import { useVideoCompression } from '@/hooks/useVideoCompression';
import { useFFmpegContext } from '@/contexts/FFmpegContext';

const [enableCompression, setEnableCompression] = useState(true);
const [compressionComplete, setCompressionComplete] = useState(false);
const [compressionSavings, setCompressionSavings] = useState<number | null>(null);

const { compressVideo, compressing, ... } = useVideoCompression();
const { isolationStatus, isEngineReady } = useFFmpegContext();

// DEPOIS
// Remover todos os imports e estados de compressão
// Upload direto no handleUpload:
const handleUpload = async () => {
  if (!selectedFile) return;
  
  await uploadVersion({
    file: selectedFile,
    workspaceId,
    projectId,
  });
  setSelectedFile(null);
  onUploadComplete?.();
};
```
