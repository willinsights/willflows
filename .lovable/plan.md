
# Plano: Corrigir Motor de Compressão FFmpeg

## Problema Raiz Identificado

O motor FFmpeg.wasm requer **headers HTTP COOP/COEP** para funcionar:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Estes headers são necessários para o `SharedArrayBuffer` funcionar, que é usado pelo worker interno do FFmpeg. **A Lovable não permite configurar estes headers** no servidor.

Por isso, `ffmpeg.load()` fica pendido (não resolve nem rejeita) porque o worker interno não consegue inicializar.

---

## Solução Recomendada: Service Worker COOP/COEP

A solução é usar um **Service Worker** que intercepta as respostas e adiciona os headers necessários. Esta técnica é documentada e usada por projetos como GitHub Pages.

### Como Funciona

```text
┌─────────────────┐      ┌──────────────────────┐      ┌──────────────┐
│   Navegador     │ ──── │  Service Worker      │ ──── │   CDN        │
│                 │      │  (adiciona headers)  │      │  (FFmpeg)    │
└─────────────────┘      └──────────────────────┘      └──────────────┘
                                    │
                                    ▼
                         Cross-Origin-Opener-Policy: same-origin
                         Cross-Origin-Embedder-Policy: credentialless
```

### Passos de Implementação

1. **Criar um Service Worker dedicado** (`public/coop-coep-worker.js`)
   - Intercepta todas as respostas
   - Adiciona headers COOP/COEP automaticamente
   - Usa `credentialless` em vez de `require-corp` para evitar conflitos com recursos externos

2. **Registar o Service Worker** antes de carregar FFmpeg
   - Só ativa quando o utilizador entra na aba "Produção"
   - Depois de registado, força um reload da página (apenas na primeira vez)

3. **Atualizar FFmpegContext** para:
   - Verificar se `crossOriginIsolated === true` antes de carregar
   - Se não estiver isolado, registar o SW e recarregar
   - Mostrar mensagem clara ao utilizador durante este processo

4. **Melhorar fallback** quando isolamento não é possível:
   - Mostrar mensagem explicativa
   - Oferecer opção de enviar vídeo sem compressão

---

## Ficheiros a Criar/Modificar

### 1. Criar: `public/coop-coep-worker.js`

```javascript
// Service Worker para adicionar headers COOP/COEP
// Baseado em: https://github.com/nicololongo/sw-coep

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.cache === "only-if-cached" && e.request.mode !== "same-origin") {
    return;
  }
  
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response.status === 0) return response;
        
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
      .catch((e) => console.error("[COOP-COEP SW] Fetch error:", e))
  );
});
```

### 2. Criar: `src/lib/coop-coep-service-worker.ts`

```typescript
// Utilitário para registar e verificar o Service Worker COOP/COEP

export async function ensureCrossOriginIsolated(): Promise<boolean> {
  // Já está isolado
  if (window.crossOriginIsolated) {
    return true;
  }
  
  // Verifica se SW é suportado
  if (!("serviceWorker" in navigator)) {
    console.warn("[COOP-COEP] Service Workers não suportados");
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.register("/coop-coep-worker.js");
    await registration.update();
    
    // Esperar que o SW fique ativo
    await new Promise<void>((resolve) => {
      if (registration.active) {
        resolve();
      } else {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing || registration.waiting;
          newWorker?.addEventListener("statechange", () => {
            if (newWorker.state === "activated") resolve();
          });
        });
      }
    });
    
    // Recarregar página para aplicar headers
    window.location.reload();
    return true;
  } catch (err) {
    console.error("[COOP-COEP] Erro ao registar SW:", err);
    return false;
  }
}

export function isCrossOriginIsolated(): boolean {
  return window.crossOriginIsolated === true;
}
```

### 3. Modificar: `src/contexts/FFmpegContext.tsx`

- Antes de chamar `ffmpeg.load()`, verificar `crossOriginIsolated`
- Se não estiver isolado, tentar registar o Service Worker
- Mostrar estado claro durante este processo

### 4. Modificar: `src/components/video-production/FFmpegStatusIndicator.tsx`

- Adicionar estado para "A preparar isolamento COOP/COEP..."
- Mostrar mensagem se isolamento não for possível

### 5. Modificar: `src/components/video-production/VideoVersionUpload.tsx`

- Se o motor não estiver disponível, permitir upload sem compressão
- Mostrar aviso explicativo

---

## Diagrama de Estados

```text
┌────────────────────────┐
│  Utilizador abre       │
│  aba "Produção"        │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ crossOriginIsolated?   │
└───────────┬────────────┘
            │
     ┌──────┴──────┐
     │             │
   true          false
     │             │
     ▼             ▼
┌─────────┐  ┌────────────────────┐
│ Carregar│  │ Registar SW        │
│ FFmpeg  │  │ COOP/COEP          │
└────┬────┘  └─────────┬──────────┘
     │                 │
     ▼                 ▼
┌─────────┐  ┌────────────────────┐
│ Pronto! │  │ Recarregar página  │
│         │  │ (uma vez)          │
└─────────┘  └────────────────────┘
```

---

## Comportamento Esperado

1. **Primeira visita** à aba Produção:
   - Mostra "A preparar ambiente seguro..."
   - Regista Service Worker
   - Recarrega página automaticamente

2. **Visitas subsequentes**:
   - `crossOriginIsolated = true`
   - Motor carrega normalmente
   - Compressão funciona

3. **Se SW falhar** (browser antigo, modo privado, etc.):
   - Mostra aviso explicativo
   - Oferece "Carregar sem compressão"
   - Utilizador pode continuar a trabalhar

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| SW pode ser bloqueado em modo privado | Fallback para upload sem compressão |
| Headers podem quebrar outros recursos | Usar `credentialless` em vez de `require-corp` |
| Reload pode frustrar utilizador | Mostrar mensagem explicativa antes do reload |
| PWA existente pode conflitar | Manter SWs separados (PWA vs COOP/COEP) |

---

## Alternativa: Compressão Server-Side

Se a solução SW não funcionar em produção, podemos implementar uma Edge Function que comprime o vídeo no servidor. Mas isso tem custos:
- Tempo de upload duplo (original + comprimido)
- Limites de memória e timeout das Edge Functions
- Complexidade adicional

**Recomendação**: Tentar primeiro a solução Service Worker, que é mais simples e mantém a compressão no cliente.

---

## Checklist de Implementação

1. Criar `public/coop-coep-worker.js`
2. Criar `src/lib/coop-coep-service-worker.ts`
3. Atualizar `FFmpegContext.tsx` com verificação de isolamento
4. Atualizar `FFmpegStatusIndicator.tsx` com novos estados
5. Atualizar `VideoVersionUpload.tsx` com fallback
6. Testar em Chrome, Edge e Firefox
7. Testar em modo privado (fallback)
8. Verificar que PWA continua a funcionar
