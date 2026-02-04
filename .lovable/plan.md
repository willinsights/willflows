

# Plano: Habilitar Downloads Automaticamente Após Processamento

## Objetivo

Criar automaticamente o download do vídeo no Cloudflare Stream assim que o processamento estiver concluído, para que os utilizadores não precisem de esperar quando clicarem em "Download".

## Análise

### Melhor Local para Implementar

| Opção | Quando executa | Problema |
|-------|----------------|----------|
| `stream-process-video` | No upload | Vídeo ainda está em "processing" - download falha |
| `stream-get-status` | Quando status muda para "ready" | ✓ Momento ideal |

A edge function `stream-get-status` já faz polling e atualiza o registo quando o status muda para `ready` (linhas 102-123). É aqui que devemos adicionar a criação automática do download.

---

## Solução

### Alteração na Edge Function `stream-get-status`

Adicionar chamada para criar download quando o vídeo está pronto:

**Ficheiro:** `supabase/functions/stream-get-status/index.ts`

```typescript
// After detecting status === "ready" (around line 102)

if (versionId && (status === "ready" || status === "error")) {
  const updateData: Record<string, unknown> = {
    stream_status: status,
  };

  // ... existing update code ...

  // NEW: Auto-enable downloads when video is ready
  if (status === "ready") {
    logStep("Enabling download for ready video", { streamUid });
    
    try {
      const downloadsUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${streamUid}/downloads`;
      
      // Check if download already exists
      const checkResponse = await fetch(downloadsUrl, {
        headers: { "Authorization": `Bearer ${streamToken}` },
      });
      
      const checkData = await checkResponse.json();
      
      // Only create if not exists
      if (!checkData.result?.default) {
        const createResponse = await fetch(downloadsUrl, {
          method: "POST",
          headers: { "Authorization": `Bearer ${streamToken}` },
        });
        
        const createData = await createResponse.json();
        logStep("Download creation initiated", { 
          success: createData.success,
          status: createData.result?.status 
        });
      } else {
        logStep("Download already exists", { 
          status: checkData.result.default.status 
        });
      }
    } catch (downloadError) {
      // Non-fatal - log and continue
      logStep("Download creation error (non-fatal)", { 
        error: downloadError instanceof Error ? downloadError.message : String(downloadError) 
      });
    }
  }
}
```

---

## Fluxo Após Implementação

```text
Upload de Vídeo
    │
    ▼
stream-process-video
    │ (vídeo em "processing")
    ▼
Frontend faz polling via stream-get-status
    │
    ▼
stream-get-status deteta status = "ready"
    │
    ├─→ Atualiza BD (duration, thumbnail, playback)
    │
    └─→ POST /stream/{uid}/downloads   ← NOVO
           │
           └─→ Download começa a preparar em background
    
~30-60 segundos depois...
    
Utilizador clica "Download"
    │
    ▼
video-download-url verifica status
    │
    └─→ Download já está "ready" → Retorna URL imediatamente ✓
```

---

## Impacto

| Antes | Depois |
|-------|--------|
| 1º download: 202 "Aguarde..." | 1º download: URL imediato |
| Utilizador precisa clicar 2x | Download funciona à primeira |
| ~30-60s de espera | 0s de espera |

---

## Ficheiros a Modificar

1. `supabase/functions/stream-get-status/index.ts` - Adicionar criação automática de download

---

## Secção Técnica

### Timing do Download

O Cloudflare Stream leva algum tempo para preparar o ficheiro de download:
- Vídeos curtos (< 1 min): ~5-10 segundos
- Vídeos médios (1-10 min): ~30-60 segundos
- Vídeos longos (> 10 min): ~2-5 minutos

Ao iniciar o processo assim que o vídeo fica "ready", garantimos que quando o utilizador clicar em download, o ficheiro já estará pronto na maioria dos casos.

### Idempotência

A implementação verifica primeiro se o download já existe antes de criar, evitando chamadas desnecessárias à API do Cloudflare em caso de múltiplas chamadas ao `stream-get-status`.

### Erro Non-Fatal

Se a criação do download falhar, o processo continua normalmente. O fallback na `video-download-url` continua a funcionar (cria o download on-demand).

