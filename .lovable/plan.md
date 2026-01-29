
# Plano: Usar HLS Direto em vez de iframe Cloudflare Stream

## Problema
O iframe do Cloudflare Stream continua bloqueado (`customer-y2wrascmexrvzepp.cloudflarestream.com recusou estabelecer ligação`) porque o vídeo existente foi processado com `allowedOrigins: ["*"]` - que o Cloudflare não aceita como wildcard.

A alteração na edge function só afeta **novos uploads**. Os vídeos já processados mantêm as restrições antigas.

## Solução
Alterar o `VideoPlayer` para usar **HLS playback direto** via `hls.js` em vez de iframe. Esta abordagem:
- Funciona sem restrições de domínio
- Oferece controlos nativos customizáveis
- Funciona nativamente em Safari (sem hls.js)
- Resolve o problema para vídeos existentes e futuros

## Alterações

### 1. Adicionar dependência hls.js
Instalar `hls.js` para suporte HLS em browsers que não suportam nativamente (Chrome, Firefox, Edge).

### 2. Atualizar VideoPlayer.tsx
Modificar o componente para:
- Detetar se o browser suporta HLS nativo (Safari) ou precisa de hls.js
- Converter `streamUid` para URL HLS: `https://customer-{hash}.cloudflarestream.com/{uid}/manifest/video.m3u8`
- Usar elemento `<video>` nativo com controlos customizados (já existentes)
- Remover lógica de iframe para Cloudflare Stream

### 3. Atualizar VideoProductionTab.tsx
Garantir que passa o URL HLS correto ao player quando disponível.

## Benefícios
- Resolve o bloqueio de iframe imediatamente
- Funciona para vídeos existentes sem alterações no Cloudflare Dashboard
- Mantém controlos nativos (seek, volume, fullscreen)
- Permite comentários por timestamp (funcionalidade existente)
- Compatível com todos os browsers modernos

## Detalhes Técnicos

### Estrutura HLS URL
```text
https://customer-{hash}.cloudflarestream.com/{streamUid}/manifest/video.m3u8
```

O `{hash}` é extraído da variável de ambiente `VITE_CLOUDFLARE_CUSTOMER_HASH` ou do `stream_playback_url` guardado na base de dados.

### Lógica de Playback
```text
if (Safari ou browser com suporte nativo HLS) {
  video.src = hlsUrl  // Nativo
} else if (Hls.isSupported()) {
  hls.loadSource(hlsUrl)
  hls.attachMedia(videoElement)
} else {
  // Fallback: erro ou iframe como último recurso
}
```

### Ficheiros a Modificar
1. `package.json` - adicionar `hls.js`
2. `src/components/video-production/VideoPlayer.tsx` - implementar HLS
3. `src/components/video-production/VideoProductionTab.tsx` - passar URL HLS
4. `src/hooks/useVideoVersions.ts` - atualizar `getPlaybackUrl` para gerar HLS URL

