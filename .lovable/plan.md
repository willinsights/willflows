
# Plano: Corrigir Download de Vídeo (Erro 404)

## Problema Identificado

Ao clicar no botão de download na área de Produção, o utilizador é redirecionado para:
```
https://videodelivery.net/{streamUid}/downloads/default.mp4
```

E recebe **404 not found** porque os downloads **não estão habilitados** no Cloudflare Stream.

### Causa Raiz

O Cloudflare Stream requer que os downloads sejam **criados explicitamente** via API antes de estarem disponíveis. A edge function `video-download-url` apenas gera o URL mas não verifica se o download existe nem o cria.

**API Cloudflare Downloads:**
- `GET /stream/{identifier}/downloads` - Lista downloads (verifica se existe)
- `POST /stream/{identifier}/downloads` - Cria o download (habilita)

---

## Solução

Modificar a edge function `video-download-url` para:

1. **Verificar se o download existe** via `GET /downloads`
2. **Criar o download** se não existir via `POST /downloads`
3. **Aguardar processamento** (status `pendingUrl` → `ready`)
4. **Retornar URL válido** apenas quando pronto

### Alterações na Edge Function

**Ficheiro:** `supabase/functions/video-download-url/index.ts`

```typescript
// Após obter videoInfo (linha 154)...

// 1. Check if downloads exist
const downloadsListUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream/${version.cloudflare_stream_uid}/downloads`;

const downloadsResponse = await fetch(downloadsListUrl, {
  headers: { 'Authorization': `Bearer ${cloudflareStreamToken}` },
});

const downloadsData = await downloadsResponse.json();
console.log('[video-download-url] Downloads status:', downloadsData);

let downloadUrl: string | null = null;

// 2. Check if default download exists and is ready
if (downloadsData.success && downloadsData.result?.default) {
  const defaultDownload = downloadsData.result.default;
  
  if (defaultDownload.status === 'ready' && defaultDownload.url) {
    downloadUrl = defaultDownload.url;
    console.log('[video-download-url] Download already ready');
  } else if (defaultDownload.status === 'pendingUrl' || defaultDownload.status === 'inprogress') {
    // Still processing, inform user to try again
    return new Response(
      JSON.stringify({ 
        error: 'Download em preparação. Aguarde alguns segundos e tente novamente.',
        status: 'processing',
        percentComplete: defaultDownload.percentComplete || 0
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// 3. If no download exists, create it
if (!downloadUrl) {
  console.log('[video-download-url] Creating download...');
  
  const createDownloadResponse = await fetch(downloadsListUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cloudflareStreamToken}` },
  });
  
  const createData = await createDownloadResponse.json();
  console.log('[video-download-url] Create download response:', createData);
  
  if (createData.success && createData.result) {
    if (createData.result.status === 'ready' && createData.result.url) {
      downloadUrl = createData.result.url;
    } else {
      // Download is being created, user needs to wait
      return new Response(
        JSON.stringify({ 
          error: 'Download iniciado. Aguarde alguns segundos e tente novamente.',
          status: 'initiated',
          percentComplete: createData.result.percentComplete || 0
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    throw new Error('Failed to create download');
  }
}

// 4. Return the valid download URL
return new Response(
  JSON.stringify({
    download_url: downloadUrl,
    file_name: version.file_name || 'video.mp4',
    expires_in: 3600,
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

### Alterações no Frontend

**Ficheiro:** `src/hooks/useVideoDownload.ts`

Tratar o novo status 202 (processing):

```typescript
const response = await fetch(...);

if (response.status === 202) {
  // Download is being prepared
  const data = await response.json();
  toast({
    title: 'Preparando download',
    description: data.error || 'Aguarde alguns segundos e tente novamente.',
  });
  return; // Don't throw error, just inform user
}

if (!response.ok) {
  // Handle actual errors
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || 'Erro ao obter link de download');
}
```

---

## Fluxo Corrigido

```text
Utilizador clica "Download"
        │
        ▼
Edge Function: GET /downloads
        │
        ├─ Download existe e ready? → Retorna URL ✓
        │
        ├─ Download existe mas processing? → Retorna 202 "Aguarde..."
        │
        └─ Download não existe?
                │
                ▼
        Edge Function: POST /downloads
                │
                ├─ Criado e ready? → Retorna URL ✓
                │
                └─ Criado mas processing? → Retorna 202 "Aguarde..."

Frontend recebe 202 → Toast "Preparando download"
Frontend recebe 200 → Inicia download com URL válido
```

---

## Impacto

| Antes | Depois |
|-------|--------|
| 404 not found | Download funciona |
| Redireciona para URL inválido | URL válido do Cloudflare |
| Sem feedback ao utilizador | Toast informativo |

---

## Ficheiros a Modificar

1. `supabase/functions/video-download-url/index.ts` - Lógica de criação de download
2. `src/hooks/useVideoDownload.ts` - Tratamento de status 202

---

## Secção Técnica

### API Cloudflare Stream Downloads

**Listar downloads:**
```
GET /accounts/{account_id}/stream/{identifier}/downloads
```

**Response:**
```json
{
  "success": true,
  "result": {
    "default": {
      "status": "ready|pendingUrl|inprogress",
      "url": "https://...",
      "percentComplete": 100
    }
  }
}
```

**Criar download:**
```
POST /accounts/{account_id}/stream/{identifier}/downloads
```

**Response:**
```json
{
  "success": true,
  "result": {
    "status": "pendingUrl",
    "percentComplete": 0
  }
}
```

### Tempos de Processamento

- Vídeos curtos (< 1 min): ~5-10 segundos
- Vídeos médios (1-10 min): ~30-60 segundos
- Vídeos longos (> 10 min): ~2-5 minutos

### Consideração Futura

Opcionalmente, podemos habilitar downloads automaticamente no `stream-process-video` após o upload ser concluído, para que estejam prontos quando o utilizador precisar.
