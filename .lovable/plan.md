

## Correção: Capturar Timecode Exato do Vídeo

### Problema Identificado
O timecode é capturado do estado React `currentTime`, que só é atualizado pelo evento `timeupdate` (4-15 vezes por segundo). Isto cria um atraso de até ~250ms entre a posição real do vídeo e o valor capturado.

### Causa Raiz (Linha 332)

```typescript
// ❌ Problema: currentTime é um estado React desatualizado
setCommentTimestamp(currentTime);
```

O estado `currentTime` pode ter sido atualizado há 50-250ms atrás. Para um serviço de aprovação de vídeo profissional, precisamos da posição **exata** no momento da captura.

---

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/public/VideoApproval.tsx` | Ler posição diretamente do elemento vídeo |

---

### Alteração

**Linhas 326-333 - Alterar de:**
```typescript
// If starting to type (from empty to something)
if (!commentText && newValue) {
  // Pause video and capture timecode
  if (videoRef.current) {
    videoRef.current.pause();
    setIsPlaying(false);
  }
  setCommentTimestamp(currentTime);
  setHasStartedTyping(true);
}
```

**Para:**
```typescript
// If starting to type (from empty to something)
if (!commentText && newValue) {
  // Pause video and capture EXACT timecode directly from video element
  if (videoRef.current) {
    // Capture exact position BEFORE pausing for maximum precision
    const exactTimestamp = videoRef.current.currentTime;
    videoRef.current.pause();
    setIsPlaying(false);
    setCommentTimestamp(exactTimestamp);
    setCurrentTime(exactTimestamp); // Sync state to match
  } else {
    // Fallback if no video ref
    setCommentTimestamp(currentTime);
  }
  setHasStartedTyping(true);
}
```

---

### Porquê Funciona

| Antes | Depois |
|-------|--------|
| `currentTime` (estado React) - pode ter ~250ms de atraso | `videoRef.current.currentTime` - posição exata no momento |

A leitura direta de `videoRef.current.currentTime` dá a posição com precisão de milissegundos, garantindo que o timecode do comentário corresponde **exatamente** ao frame visível no ecrã.

---

### Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────┐
│  Utilizador clica no campo de texto                  │
│        ↓                                             │
│  1. Lê videoRef.current.currentTime (posição EXATA)  │
│        ↓                                             │
│  2. Pausa o vídeo                                    │
│        ↓                                             │
│  3. Guarda timestamp exato no estado                 │
│        ↓                                             │
│  Resultado: Timecode = 00:00:24:09 (frame correto)   │
└──────────────────────────────────────────────────────┘
```

