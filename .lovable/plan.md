
# Plano: Corrigir Video Existente e HLS Playback

## Problema Identificado
O vídeo existente (`uid: 067e920919ea6eedca72b8203c65c874`) foi processado com `allowedOrigins: ["*"]`, que o Cloudflare Stream não aceita. Isto bloqueia os pedidos HLS com CORS, resultando no erro "código 4" (`MEDIA_ERR_SRC_NOT_SUPPORTED`).

A alteração na edge function `stream-process-video` só afeta **novos uploads**. Os vídeos já processados mantêm as restrições antigas.

## Solucao

### Passo 1: Criar Edge Function para Atualizar Videos Existentes
Criar uma nova edge function `stream-update-video` que permite atualizar as configuracoes de videos existentes no Cloudflare Stream, removendo as restricoes de `allowedOrigins`.

```text
POST /stream-update-video
Body: { "streamUid": "067e920919ea6eedca72b8203c65c874", "allowedOrigins": [] }
```

### Passo 2: Chamar a Edge Function para Corrigir o Video
Apos criar a edge function, chamar automaticamente ou manualmente para corrigir o video existente.

### Passo 3: Adicionar Botao de "Reprocessar" na UI (Opcional)
Adicionar um botao na lista de versoes que permite reprocessar/atualizar configuracoes de videos com problemas.

## Ficheiros a Criar/Modificar

### 1. Nova Edge Function: `supabase/functions/stream-update-video/index.ts`
```text
- Receber streamUid e novas configuracoes (allowedOrigins)
- Chamar PATCH /accounts/{accountId}/stream/{streamUid}
- Atualizar registo na base de dados se necessario
```

## Detalhes Tecnicos

### Cloudflare Stream API
Para atualizar um video existente:
```text
PATCH https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/{video_uid}
Body: {
  "allowedOrigins": []  // Array vazio remove restricoes
}
```

### Video a Corrigir
- Stream UID: `067e920919ea6eedca72b8203c65c874`
- Status atual: `ready`
- Problema: `allowedOrigins: ["*"]` invalido

### Resultado Esperado
Apos remover as restricoes de `allowedOrigins`, o HLS playback via `hls.js` funcionara corretamente porque:
1. O browser podera fazer fetch do manifest `.m3u8`
2. Os segmentos de video `.ts` serao carregados sem CORS errors
3. O VideoPlayer mostrara o video normalmente
