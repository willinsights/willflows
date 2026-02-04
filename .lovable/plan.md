

# Plano: Corrigir Erros de Reprodução e Download de Vídeo

## Problemas Identificados

### 1. Erro de Vídeo (Código 4) ao Pausar e Voltar Atrás

O erro acontece quando o utilizador:
1. Pausa o vídeo
2. Arrasta o slider para trás no timeline
3. Tenta reproduzir

O HLS.js perde a conexão com o stream e a recuperação atual falha.

**Causa raiz**: A lógica de recuperação atual tenta `recoverMediaError()` que não funciona bem para erros de seek. É necessário forçar um reload do stream quando o erro acontece após um seek.

### 2. Erro de Download (Toast Vermelho)

O frontend mostra "Link de download não disponível" mesmo quando a edge function está a devolver códigos corretos.

**Causa raiz**: O `useVideoDownload` foi atualizado para tratar 202, mas pode haver um problema com a forma como o erro é tratado quando a resposta não tem `download_url`.

---

## Solução

### Parte 1: Melhorar Resiliência do VideoPlayer

**Ficheiro:** `src/components/video-production/VideoPlayer.tsx`

Modificar a lógica de recuperação para:
1. Detetar quando o erro acontece após um seek (mudança de `currentTime`)
2. Forçar reinicialização completa do HLS após seek + erro
3. Preservar a posição do timeline durante a recuperação

```typescript
// Adicionar tracking de seek recente
const lastSeekTimeRef = useRef(0);
const seekDetectedRef = useRef(false);

// No handleSeek, marcar que houve seek
const handleSeek = useCallback((value: number[]) => {
  seekDetectedRef.current = true;
  lastSeekTimeRef.current = value[0];
  // ... resto
}, []);

// No handleVideoError, priorizar reinicialização se houve seek recente
const handleVideoError = useCallback(() => {
  // Se houve seek recente, ir direto para reinicialização
  if (seekDetectedRef.current) {
    seekDetectedRef.current = false;
    reinitializeHls(lastSeekTimeRef.current);
    return;
  }
  // ... resto da lógica existente
}, [...]);
```

### Parte 2: Corrigir Mensagem de Erro do Download

**Ficheiro:** `src/hooks/useVideoDownload.ts`

O código atual já trata o 202, mas precisa de ajustar a mensagem de erro quando `download_url` é null:

```typescript
// Garantir que o erro é mais específico
if (!download_url) {
  // Verificar se há mensagem da API
  const apiMessage = data.error || 'Download ainda não está disponível';
  toast({
    title: 'Download em preparação',
    description: apiMessage,
  });
  return;
}
```

### Parte 3: Verificar Edge Function

A edge function `video-download-url` pode estar a falhar silenciosamente. Adicionar melhor logging e garantir que o GET inicial ao endpoint `/downloads` funciona corretamente.

---

## Alterações Detalhadas

### 1. VideoPlayer.tsx - Recuperação Aprimorada

Adicionar ao estado:
```typescript
const seekDetectedRef = useRef(false);
const lastSeekPositionRef = useRef(0);
```

Modificar `handleSeek`:
```typescript
const handleSeek = useCallback((value: number[]) => {
  const newTime = value[0];
  seekDetectedRef.current = true;
  lastSeekPositionRef.current = newTime;
  
  if (videoRef.current) {
    videoRef.current.currentTime = newTime;
  }
  setCurrentTime(newTime);
}, []);
```

Modificar `handleVideoError`:
```typescript
const handleVideoError = useCallback(() => {
  const video = videoRef.current;
  const mediaError = video?.error;
  
  // Save current position for recovery
  const preserveTime = seekDetectedRef.current 
    ? lastSeekPositionRef.current 
    : (video?.currentTime || lastTimeRef.current);
  
  lastTimeRef.current = preserveTime;
  
  // Se foi um seek recente, reinicializar imediatamente
  if (seekDetectedRef.current && videoSource.type === 'hls') {
    console.log('[VideoPlayer] Seek-triggered error, reinitializing at:', preserveTime);
    seekDetectedRef.current = false;
    reinitializeHls(preserveTime);
    return;
  }
  
  // ... resto da lógica existente
}, [reinitializeHls, videoSource.type, videoSource.url]);
```

Resetar flag após sucesso:
```typescript
// No evento 'canplay' ou 'playing', resetar a flag
video.addEventListener('playing', () => {
  seekDetectedRef.current = false;
  retryCountRef.current = 0;
});
```

### 2. useVideoDownload.ts - Melhor Tratamento de Erros

```typescript
// Após receber resposta 200
const { download_url, file_name } = await response.json();

if (!download_url) {
  // Download ainda não disponível mas não é erro
  toast({
    title: 'Download em preparação',
    description: 'O ficheiro está a ser processado. Tenta novamente em alguns segundos.',
  });
  return;
}
```

---

## Impacto

| Problema | Antes | Depois |
|----------|-------|--------|
| Erro código 4 após seek | Player fica bloqueado | Reinicializa automaticamente |
| Toast "Link não disponível" | Mensagem de erro genérica | Mensagem informativa "Em preparação" |
| Múltiplos erros de recovery | 5 tentativas todas falham | Reinicialização direta após seek |

---

## Ficheiros a Modificar

1. `src/components/video-production/VideoPlayer.tsx` - Melhorar lógica de recuperação após seek
2. `src/hooks/useVideoDownload.ts` - Melhorar mensagens de erro/status

---

## Secção Técnica

### Porque o Código 4 acontece após Seek

O HLS.js mantém um buffer de segmentos. Quando fazes seek para uma posição fora do buffer:
1. O player tenta carregar novos segmentos
2. Se a conexão falhou (por qualquer razão), o `mediaError` é disparado
3. O `recoverMediaError()` tenta recuperar mas não funciona se o source foi perdido

A solução é detetar que o erro foi causado por um seek e forçar reinicialização completa do HLS, preservando a posição desejada.

### Download API Cloudflare

A resposta do endpoint `/downloads` contém:
```json
{
  "result": {
    "default": {
      "status": "ready|inprogress|pendingUrl",
      "url": "https://...",
      "percentComplete": 0-100
    }
  }
}
```

Quando `status` não é `ready`, não há URL disponível e devemos informar o utilizador para tentar novamente.

