
Objetivo
- Reconfirmar e resolver o erro “Falha ao carregar o vídeo (código 4)” na reprodução (player), que continua a acontecer tanto no Preview como no Publicado, mesmo após a correção de allowedOrigins.

O que já confirmei no teu backend (dados reais)
- Existem versões com stream_status = ready e stream_playback_url preenchido.
- Exemplo (mais recente):
  - id: 9ff0d938-f71d-443f-bf4c-eec5754821d9
  - cloudflare_stream_uid: be4b722c63cf9aa1581642373c5a47c6
  - stream_playback_url:
    https://customer-y2wrascmexrvzepp.cloudflarestream.com/be4b722c63cf9aa1581642373c5a47c6/manifest/video.m3u8
- Ou seja: o player está a receber um HLS .m3u8 “válido” (pelo menos em formato), mas o browser ainda está a falhar a reprodução com código 4.

Hipótese mais provável (e porquê)
- O domínio “customer-<hash>.cloudflarestream.com” é o que estamos a usar hoje como playback URL.
- Mesmo com allowedOrigins “corrigido”, esse endpoint pode continuar a falhar no browser por:
  1) Restrições/CORS específicas do Cloudflare Stream nesse domínio “customer-*” (o browser não consegue buscar o manifest/segments)
  2) Alguma política/variação de “allowedOrigins” que não está a ser removida como esperado para todos os vídeos
  3) Requisições HLS que exigem headers/cookies/redirects que o Hls.js trata de forma diferente e acabam em erro fatal (o teu UI hoje não mostra o motivo real, só “código 4”)

Estratégia de correção (mais robusta)
- Trocar o playback HLS para o domínio padrão e mais compatível do Cloudflare Stream:
  https://videodelivery.net/<STREAM_UID>/manifest/video.m3u8
- Vantagens:
  - Não depende de “customer hash”
  - Normalmente é o endpoint recomendado para reprodução pública HLS
  - Reduz a superfície de erros de CORS/allowedOrigins porque o “customer-*” costuma ser o que mais sofre com restrições

Plano de implementação (passo a passo)

1) Ajustar o Player para preferir videodelivery.net
- Alterar o componente src/components/video-production/VideoPlayer.tsx para:
  - Se existir streamUid (ou hlsUrl), construir/usar sempre:
    https://videodelivery.net/${streamUid}/manifest/video.m3u8
  - Manter fallback para src normal (mp4) apenas quando não existir streamUid.
- Resultado: mesmo que a BD tenha “customer-...cloudflarestream.com”, o player passa a tentar o endpoint “videodelivery.net”.

2) Garantir que novos vídeos passam a gravar a URL de playback correta
- Rever e ajustar a função de backend (stream-process-video) para gravar stream_playback_url como:
  https://videodelivery.net/${streamUid}/manifest/video.m3u8
- Isto garante consistência a partir de agora.

3) “Corrigir” os vídeos existentes automaticamente (sem depender do cliente)
- Atualizar a função de backend stream-update-video para:
  - Continuar a remover allowedOrigins/restrições (como já faz)
  - E, adicionalmente, atualizar o registo na tabela video_versions com:
    stream_playback_url = https://videodelivery.net/${streamUid}/manifest/video.m3u8
- Depois, usar o botão “Corrigir” existente na UI para reescrever a playback URL de versões antigas (e remover quaisquer restrições).

4) Melhorar diagnóstico (para termos prova do erro real)
- Atualizar o VideoPlayer para, quando o Hls.js disparar erro fatal, mostrar no UI:
  - Tipo do erro do Hls.js (ex: NETWORK_ERROR / MEDIA_ERROR)
  - E, se disponível, o “response code” (403/404) para o manifest/segment.
- Isto evita ficarmos presos no “código 4” genérico e acelera troubleshooting.

5) Checklist de validação (end-to-end)
- No Preview e no Publicado:
  - Abrir uma versão “ready”
  - Confirmar em DevTools > Network:
    - GET .../manifest/video.m3u8 retorna 200
    - Requests de segmentos (m4s/ts) retornam 200
  - Confirmar que o player não mostra “código 4”
- Validar também o fluxo:
  - Upload (PUT R2) -> Processamento -> Ready -> Playback

Riscos / Edge cases previstos
- Se “videodelivery.net” estiver com algum tipo de restrição de domínio na conta, o erro continuará — mas com o diagnóstico melhorado vamos ver exatamente se é 403/blocked.
- Alguns vídeos podem estar “ready” mas ainda sem segmentos acessíveis por alguns minutos; o diagnóstico ajudará a diferenciar “ainda a propagar” vs “bloqueado”.

Ficheiros que provavelmente serão alterados
- Frontend:
  - src/components/video-production/VideoPlayer.tsx (priorizar videodelivery.net + melhores erros)
- Backend (funções):
  - supabase/functions/stream-process-video/index.ts (gravar playback url canonical)
  - supabase/functions/stream-update-video/index.ts (ao “Corrigir”, também gravar playback url canonical)
  - supabase/config.toml (apenas se for necessário alterar config da função)

Resultado esperado
- Mesmo que existam restos de configurações antigas, a reprodução passa a funcionar usando o endpoint mais compatível (videodelivery.net), e o botão “Corrigir” passa a “normalizar” versões antigas para esse mesmo padrão.
