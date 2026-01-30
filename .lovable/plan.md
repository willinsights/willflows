

## Correção: Erro ao Pausar/Retomar Vídeo (Código 4)

### Problema Identificado

O erro "Falha ao carregar o vídeo (código 4)" ocorre frequentemente ao pausar e retomar o vídeo porque:

1. **O `useEffect` de inicialização HLS** depende de `getVideoSource`, que é um `useCallback` recriado em cada render quando as props mudam
2. **A destruição prematura do HLS.js** acontece quando o `useEffect` cleanup é executado, mas o vídeo ainda está ativo
3. **Não há recuperação de erro** - quando ocorre um erro de media, não tentamos recarregar

O **Error Code 4** (MEDIA_ERR_SRC_NOT_SUPPORTED) indica que o HLS.js foi destruído antes de tempo, deixando o elemento `<video>` sem source válida.

---

### Causa Raiz no Código

```typescript
// VideoPlayer.tsx - linha 214
useEffect(() => {
  // ... inicializa HLS
  return () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();  // ← Destruído sem verificar estado
      hlsRef.current = null;
    }
  };
}, [getVideoSource]);  // ← Recriado a cada re-render!
```

Quando há um re-render (ex: estado de outra componente muda), o `getVideoSource` pode ser recriado, causando:
1. Cleanup do `useEffect` anterior (destrói HLS)
2. Re-execução do `useEffect` (tenta criar novo HLS)
3. Se o timing não é perfeito → Error Code 4

---

### Solução

**1. Memoizar a URL do vídeo** em vez de depender de `getVideoSource`:

```typescript
// Memorizar a URL do source para evitar re-renders desnecessários
const videoSource = useMemo(() => {
  if (streamUid) {
    return { type: 'hls' as const, url: buildCanonicalHlsUrl(streamUid) };
  }
  if (hlsUrl) {
    const extractedUid = extractStreamUidFromUrl(hlsUrl);
    if (extractedUid) {
      return { type: 'hls' as const, url: buildCanonicalHlsUrl(extractedUid) };
    }
    return { type: 'hls' as const, url: hlsUrl };
  }
  if (src) {
    const extractedUid = extractStreamUidFromUrl(src);
    if (extractedUid) {
      return { type: 'hls' as const, url: buildCanonicalHlsUrl(extractedUid) };
    }
    if (src.includes('.m3u8')) {
      return { type: 'hls' as const, url: src };
    }
    return { type: 'native' as const, url: src };
  }
  return { type: 'none' as const, url: null };
}, [src, streamUid, hlsUrl]);
```

**2. O `useEffect` depende da URL final** (string estável):

```typescript
useEffect(() => {
  // ... inicializa HLS
}, [videoSource.url]); // Apenas re-executa se URL realmente mudar
```

**3. Adicionar recuperação de erros de media**:

```typescript
const handleVideoError = useCallback(() => {
  const video = videoRef.current;
  const mediaError = video?.error;
  
  // Para Error Code 4, tentar recarregar automaticamente (1x)
  if (mediaError?.code === 4 && hlsRef.current && retryCountRef.current < 1) {
    retryCountRef.current++;
    console.log('Tentando recarregar vídeo após erro 4...');
    hlsRef.current.recoverMediaError();
    return;
  }
  
  const message = mediaError
    ? `Falha ao carregar o vídeo (código ${mediaError.code}).`
    : 'Falha ao carregar o vídeo.';
  setIsLoading(false);
  setIsPlaying(false);
  setLoadError(message);
}, []);
```

**4. Usar `startTransition` para evitar interrupções** (opcional):

```typescript
const handleSeek = useCallback((value: number[]) => {
  startTransition(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
    }
    setCurrentTime(value[0]);
  });
}, []);
```

---

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/video-production/VideoPlayer.tsx` | Memoizar source, adicionar recuperação de erros |

---

### Alterações Detalhadas

**Linha 87-123: Substituir `getVideoSource` por `useMemo`**

Mudar de `useCallback` para `useMemo` com uma string de URL estável:

```typescript
// Antes: useCallback que retorna novo objeto a cada chamada
const getVideoSource = useCallback((): { type: ..., url: ... } => { ... }, [...]);

// Depois: useMemo que retorna objeto memoizado
const videoSource = useMemo(() => { ... }, [src, streamUid, hlsUrl]);
```

**Linha 126-214: Atualizar o `useEffect` de inicialização**

```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  // Cleanup anterior
  if (hlsRef.current) {
    hlsRef.current.destroy();
    hlsRef.current = null;
  }

  if (videoSource.type === 'none' || !videoSource.url) {
    setIsLoading(false);
    return;
  }

  // ... resto da lógica de inicialização ...

  return () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };
}, [videoSource.url]); // ← Depende apenas da URL (string estável)
```

**Linha 268-277: Adicionar recuperação de erros**

```typescript
const retryCountRef = useRef(0);

// Reset retry count quando source muda
useEffect(() => {
  retryCountRef.current = 0;
}, [videoSource.url]);

const handleVideoError = useCallback(() => {
  const video = videoRef.current;
  const mediaError = video?.error;
  
  // Tentar recuperar de Error Code 4 uma vez
  if (mediaError?.code === 4 && hlsRef.current && retryCountRef.current < 1) {
    retryCountRef.current++;
    console.log('Recuperando de erro de media...');
    try {
      hlsRef.current.recoverMediaError();
    } catch (e) {
      // Se falhar, mostra erro
    }
    return;
  }
  
  const message = mediaError
    ? `Falha ao carregar o vídeo (código ${mediaError.code}).`
    : 'Falha ao carregar o vídeo.';
  setIsLoading(false);
  setIsPlaying(false);
  setLoadError(message);
}, []);
```

---

### Comportamento Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Pausar e retomar | ❌ Às vezes erro 4 | ✅ Funciona |
| Seek no slider | ❌ Pode dar erro 4 | ✅ Funciona |
| Mudar de tab e voltar | ❌ Recarrega HLS | ✅ Mantém estado |
| Error Code 4 esporádico | ❌ Falha permanente | ✅ Recupera automaticamente |

---

### Resumo Técnico

1. **Memoização**: `useMemo` em vez de `useCallback` para evitar recriação de objetos
2. **Dependência estável**: `useEffect` depende de `videoSource.url` (string) em vez de função
3. **Recuperação de erros**: `hlsRef.current.recoverMediaError()` para Error Code 4
4. **Contador de retry**: Evita loops infinitos de recuperação

