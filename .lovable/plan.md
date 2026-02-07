

## Escolher thumbnail personalizado para cada versao de video

### Problema
As thumbnails usam o primeiro frame do video (URL padrao do Cloudflare Stream: `/thumbnails/thumbnail.jpg`). Se o video comeca com fade-in preto, a miniatura fica escura/invisivel.

### Solucao
O Cloudflare Stream suporta um parametro `time` no URL da thumbnail:
```text
https://videodelivery.net/{uid}/thumbnails/thumbnail.jpg?time=5s
```

Vamos adicionar um seletor de thumbnail no player: o utilizador pausa no frame desejado, clica num botao "Definir thumbnail", e o sistema guarda o timestamp escolhido.

### Alteracoes

#### 1. Base de dados
Adicionar coluna `thumbnail_time_seconds` (float, nullable, default null) na tabela `video_versions`. Quando preenchida, o URL da thumbnail passa a incluir `?time=Xs`.

#### 2. Hook `useVideoVersions.ts`
- Adicionar `thumbnail_time_seconds` ao tipo `VideoVersion`
- Criar funcao `setThumbnailTime(versionId, seconds)` que faz update na base de dados e reconstroi o `thumbnail_path` com o parametro `?time=`

#### 3. Componente `VideoProductionTab.tsx`
- Passar callback `onSetThumbnail` ao `VideoPlayer`
- Quando acionado, chamar `setThumbnailTime` com o tempo atual do player

#### 4. Componente `VideoPlayer.tsx`
- Adicionar botao "Definir thumbnail" (icone Camera/Image) na barra de controlos
- Ao clicar, chama `onSetThumbnail(currentTime)` com o segundo atual do video

#### 5. Componente `VideoVersionsList.tsx`
- Ja usa `version.thumbnail_path` para exibir a miniatura — nao precisa de alteracao, o URL atualizado ja inclui o `?time=`

#### 6. Edge functions (`stream-process-video`, `stream-get-status`, `stream-update-video`)
- Ao construir `thumbnail_path`, verificar se existe `thumbnail_time_seconds` na versao e anexar `?time=Xs` ao URL
- No upload inicial, usar `?time=50%` como default inteligente (meio do video) em vez do primeiro frame

### Ficheiros a alterar
1. **Migracao SQL** — adicionar coluna `thumbnail_time_seconds`
2. `src/hooks/useVideoVersions.ts` — tipo + funcao `setThumbnailTime`
3. `src/components/video-production/VideoPlayer.tsx` — botao "Definir thumbnail"
4. `src/components/video-production/VideoProductionTab.tsx` — passar callback
5. `supabase/functions/stream-process-video/index.ts` — default `?time=50%`  no thumbnail URL
6. `supabase/functions/stream-get-status/index.ts` — preservar time param
7. `supabase/functions/stream-update-video/index.ts` — preservar time param

### Resultado
- Thumbnails deixam de ser pretas por defeito (usam meio do video)
- O utilizador pode escolher qualquer frame como thumbnail
- Sem necessidade de gerar/armazenar imagens extra — tudo via parametro URL do Cloudflare

