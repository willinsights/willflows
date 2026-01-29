
# Plano: Corrigir Bloqueio do iframe Cloudflare Stream

## Problema Identificado
O vídeo foi processado com sucesso (`stream_status: ready`, `readyToStream: true`), mas o iframe do Cloudflare Stream está a ser bloqueado. A mensagem "iframe.cloudflarestream.com recusou estabelecer ligação" indica que o Cloudflare Stream está a rejeitar o embed por restrições de domínio.

## Causa Raiz
Quando o vídeo foi submetido ao Stream via `/copy`, foi usado `allowedOrigins: ["*"]`, mas o Cloudflare Stream não aceita wildcards literais - é necessário especificar os domínios explicitamente, ou não definir restrições.

## Solucao

### Passo 1: Atualizar a Edge Function `stream-process-video`
Alterar a configuracao de `allowedOrigins` para incluir os dominios corretos:

```text
allowedOrigins: [
  "willflow.app",
  "willflows.lovable.app",
  "lovableproject.com"
]
```

Ou remover completamente o campo `allowedOrigins` para permitir embed de qualquer domínio (comportamento padrão).

### Passo 2: Atualizar Vídeos Existentes via API
Para o vídeo já processado (uid: `1a69a6dafc25337b7716b4c1afe84f6c`), será necessário atualizar as configurações via API do Cloudflare Stream:

```text
PATCH /accounts/{account_id}/stream/{video_uid}
Body: { "allowedOrigins": [] }
```

Isto pode ser feito:
- Manualmente no dashboard do Cloudflare
- Ou criando uma edge function temporária para atualizar

### Passo 3: Alternativa - Usar HLS em vez de iframe
Se as restrições de domínio continuarem a causar problemas, podemos alterar o `VideoPlayer` para usar o URL HLS direto em vez do iframe:

```text
https://customer-{hash}.cloudflarestream.com/{uid}/manifest/video.m3u8
```

Isto requer adicionar suporte HLS ao player (usando hls.js ou video nativo em Safari).

## Opções

**Opção A (Recomendada)**: Remover `allowedOrigins` da edge function e atualizar o vídeo existente via dashboard Cloudflare

**Opção B**: Usar HLS direto em vez de iframe para evitar restrições de CORS

## Detalhes Técnicos

### Alteracoes em `stream-process-video/index.ts`
Linha 191-193: Mudar de:
```javascript
requireSignedURLs: false,
allowedOrigins: ["*"],
```
Para:
```javascript
requireSignedURLs: false,
// Remover allowedOrigins para permitir embed de qualquer origem
```

### Video Existente
O vídeo com UID `1a69a6dafc25337b7716b4c1afe84f6c` precisa de ser atualizado no dashboard do Cloudflare:
1. Ir a Cloudflare Dashboard → Stream → Videos
2. Selecionar o vídeo
3. Em "Security", remover restrições de domínio ou adicionar os domínios corretos

### Dominios a adicionar (se necessario)
- `willflow.app`
- `*.willflow.app`
- `*.lovableproject.com`
- `willflows.lovable.app`
