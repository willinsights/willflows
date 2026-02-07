

## Melhorar player do portal externo (Studio Review)

### Problemas atuais

1. **Thumbnails**: O player externo (`VideoApproval.tsx`) nao mostra thumbnail -- o video e um bloco preto ate o utilizador carregar play. O player interno (`VideoPlayer.tsx`) tambem nao tem poster/thumbnail visivel antes do play.

2. **Controlos sempre visiveis**: No portal externo, a barra de controlos (play, volume, fullscreen, progress bar) esta **sempre visivel** sobreposta ao video. No player interno, os controlos ja seguem a logica de hover (aparecem com o rato, desaparecem apos 3s).

3. **Timecode dentro da barra de controlos**: O timecode (HH:MM:SS:FF) esta dentro do overlay de controlos, junto aos botoes. Deve estar **abaixo do player, centrado**, sempre visivel independentemente do hover.

### Alteracoes

**1. Thumbnail/poster antes do play**

Usar o URL `https://videodelivery.net/{streamUid}/thumbnails/thumbnail.jpg?time=50p` como poster do `<video>`. No portal externo, os videos vem como signed URLs (HLS), por isso vamos extrair o stream UID do URL para construir o thumbnail. Se nao for possivel extrair (URL nao e do Cloudflare), manter sem poster.

**2. Controlos com hover (como o player interno)**

Adicionar logica de `onMouseMove` / `onMouseLeave` ao container do video:
- Controlos aparecem ao mover o rato
- Desaparecem apos 3 segundos sem movimento (so quando o video esta a reproduzir)
- Overlay de play (botao grande central) aparece quando pausado

**3. Timecode abaixo do player, centrado**

Mover o `formatTimecode(currentTime) / formatTimecode(duration)` para fora do overlay de controlos. Colocar como elemento independente abaixo do `<Card>` do video, centrado horizontalmente. Visivel sempre, sem depender do hover.

### Ficheiro a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/public/VideoApproval.tsx` | Linhas 791-898: adicionar hover controls, thumbnail poster, mover timecode para baixo |

### Detalhes tecnicos

No `VideoApproval.tsx`:

1. Adicionar estados:
   - `showControls` (boolean, default true)
   - `hideControlsTimeout` (ref)

2. Adicionar handlers:
   - `handleMouseMove`: mostra controlos, reseta timer de 3s
   - `handleMouseLeave`: esconde controlos se playing

3. Na div container (`relative bg-black`):
   - Adicionar `onMouseMove={handleMouseMove}` e `onMouseLeave`
   - No `<video>`: adicionar `onClick={togglePlay}` para click-to-play

4. No overlay de controlos (div `absolute bottom-0`):
   - Adicionar transicao `opacity-0`/`opacity-100` baseada em `showControls`
   - **Remover** o timecode daqui (`formatTimecode(currentTime) / formatTimecode(duration)`)

5. Adicionar play overlay central (quando pausado e nao loading):
   - Botao circular branco com icone Play, como no player interno

6. Apos o `</Card>` do player:
   - Novo `<div className="text-center mt-2">` com o timecode em `font-mono text-sm text-muted-foreground`

7. Poster/thumbnail:
   - Tentar extrair stream UID do `videoUrl` usando regex
   - Se encontrado, adicionar `poster={thumbnailUrl}` ao `<video>`

