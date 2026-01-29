
# Plano de Correção: Loop Infinito no Player de Vídeo

## Problema Identificado

O preview está a recarregar infinitamente porque:

1. **Os vídeos actuais foram carregados com Supabase Storage** (antes do deploy das novas Edge Functions), por isso não têm `cloudflare_stream_uid`
2. **O componente `VideoProductionTab` não distingue entre vídeos Cloudflare e Supabase Storage**
3. **A função `getSignedUrl` recria-se em cada render**, causando um loop infinito no `useEffect` que carrega a URL do vídeo
4. **O signed URL do Supabase pode estar a falhar** (código de erro 4 = video não encontrado ou acesso negado)

---

## Solução em 3 Partes

### Parte 1: Corrigir o Hook `useVideoVersions`

**Ficheiro:** `src/hooks/useVideoVersions.ts`

**Alterações:**
- Memoizar `getSignedUrl` com `useCallback`
- Adicionar lógica para verificar se deve usar Cloudflare ou Supabase

```typescript
// Memoizar getSignedUrl para evitar loops
const getSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
  if (!filePath || filePath.startsWith('r2://')) {
    return null;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('video-versions')
      .createSignedUrl(filePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}, []); // Sem dependências - é estável
```

### Parte 2: Corrigir `VideoProductionTab`

**Ficheiro:** `src/components/video-production/VideoProductionTab.tsx`

**Alterações:**
- Usar `getPlaybackUrl` primeiro para Cloudflare
- Fallback para `getSignedUrl` apenas se necessário
- Verificar `stream_status` antes de tentar reproduzir
- Adicionar estado de "processamento" para vídeos Cloudflare

```typescript
// Novo useEffect corrigido
useEffect(() => {
  const loadVideoUrl = async () => {
    if (!selectedVersion) {
      setVideoUrl(null);
      return;
    }

    // Check if version is still processing (Cloudflare)
    if (selectedVersion.stream_status === 'processing' || selectedVersion.stream_status === 'pending') {
      setVideoUrl(null);
      setIsVersionProcessing(true);
      return;
    }
    setIsVersionProcessing(false);

    // Priority 1: Cloudflare Stream (new uploads)
    if (selectedVersion.cloudflare_stream_uid) {
      // Use iframe embed, no URL needed
      setVideoUrl(null);
      return;
    }

    // Priority 2: Legacy Supabase Storage (old uploads)
    setLoadingUrl(true);
    try {
      const url = await getSignedUrl(selectedVersion.file_path);
      setVideoUrl(url);
    } catch {
      setVideoUrl(null);
    }
    setLoadingUrl(false);
  };

  loadVideoUrl();
}, [selectedVersion?.id, selectedVersion?.stream_status, getSignedUrl]);
```

### Parte 3: Corrigir `VideoPlayer`

**Ficheiro:** `src/components/video-production/VideoPlayer.tsx`

**Alterações:**
- Passar `streamUid` como prop separada
- Mostrar estado de processamento
- Usar iframe do Cloudflare Stream quando disponível

```typescript
// Props actualizadas
interface VideoPlayerProps {
  src?: string;
  streamUid?: string | null;
  isProcessing?: boolean;
  // ... resto igual
}

// No render
if (isProcessing) {
  return (
    <div className="processing-state">
      <Loader2 className="animate-spin" />
      <p>A processar vídeo...</p>
    </div>
  );
}

// Prioridade: Cloudflare Stream
if (streamUid) {
  return (
    <iframe
      src={`https://iframe.cloudflarestream.com/${streamUid}`}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}

// Fallback: video nativo
if (src) {
  return <video src={src} ... />;
}
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useVideoVersions.ts` | Memoizar `getSignedUrl` com `useCallback([])` |
| `src/components/video-production/VideoProductionTab.tsx` | Distinguir Cloudflare vs Supabase, corrigir dependências do `useEffect` |
| `src/components/video-production/VideoPlayer.tsx` | Aceitar `streamUid` prop, mostrar iframe Cloudflare |

---

## O que acontece após a correção

1. **Vídeos antigos (Supabase):** Continuam a funcionar com signed URLs
2. **Novos vídeos (Cloudflare):** Usam o iframe do Stream
3. **Vídeos em processamento:** Mostram estado "A processar..."
4. **Sem mais loops:** O `useEffect` terá dependências estáveis

---

## Para testar a integração Cloudflare

Depois de corrigir o loop, podes fazer um **novo upload** para verificar se:
1. As Edge Functions `r2-upload-url` e `stream-process-video` são chamadas
2. O progresso de upload aparece (0-80% R2, 80-100% Stream)
3. O vídeo aparece com estado "A processar..."
4. Após transcodificação, o player Cloudflare Stream funciona
