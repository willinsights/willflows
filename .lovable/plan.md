

## Diagnóstico do Erro "código 4" no Playback de Vídeo

### Causa Raiz Identificada

O erro "Falha ao carregar o vídeo (código 4)" é causado por **restrições de domínio no Cloudflare Stream**. Quando um vídeo é carregado, o Cloudflare Stream aplica automaticamente `allowedOrigins` restritivos que bloqueiam o playback em domínios como `*.lovableproject.com`.

### Problemas Encontrados

1. **`stream-process-video`**: Ao criar o vídeo via API `/copy`, envia `requireSignedURLs: false` mas **não envia `allowedOrigins: []`**, deixando o Cloudflare aplicar restrições por defeito

2. **`stream-get-status`**: Quando faz polling e o vídeo fica "ready", sobrescreve o URL canónico `videodelivery.net` com o URL `customer-*.cloudflarestream.com` retornado pela API - embora o VideoPlayer normalize isto, a BD fica com o URL errado

3. **Fluxo actual**: O utilizador precisa de clicar manualmente em "Corrigir" para remover as restrições - não há correção automática

### Solução Proposta

#### 1. Corrigir `stream-process-video` (Prioridade Alta)
Adicionar `allowedOrigins: []` ao pedido de criação do vídeo para permitir playback de qualquer origem:

```typescript
body: JSON.stringify({
  url: signedR2Url,
  meta: { ... },
  requireSignedURLs: false,
  allowedOrigins: [], // <-- ADICIONAR ESTA LINHA
}),
```

#### 2. Corrigir `stream-get-status` (Prioridade Média)
Normalizar o URL do playback para usar sempre `videodelivery.net`:

```typescript
// Em vez de usar playback.hls directamente:
if (playback?.hls) {
  // Extrair UID e usar URL canónico
  const uid = extractUidFromUrl(playback.hls) || streamUid;
  updateData.stream_playback_url = `https://videodelivery.net/${uid}/manifest/video.m3u8`;
}
```

#### 3. Corrigir o vídeo actual (Imediato)
Executar a Edge Function `stream-update-video` para remover as restrições do vídeo já carregado:
- Remove `allowedOrigins` do Cloudflare
- Actualiza a BD com o URL canónico

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/stream-process-video/index.ts` | Adicionar `allowedOrigins: []` ao criar vídeo |
| `supabase/functions/stream-get-status/index.ts` | Normalizar URLs para `videodelivery.net` |

### Passos de Implementação

1. Actualizar `stream-process-video` para enviar `allowedOrigins: []`
2. Actualizar `stream-get-status` para normalizar URLs
3. Fazer deploy das edge functions
4. Chamar `stream-update-video` para o vídeo actual (ID: `5c3d54b64d31cb281d68487916effc9b`)
5. Testar upload e playback de um novo vídeo

### Resultado Esperado

- Vídeos novos funcionam imediatamente sem necessidade de "Corrigir"
- O vídeo actual é corrigido automaticamente
- URLs na BD usam sempre o domínio canónico `videodelivery.net`

