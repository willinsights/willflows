
## Objetivo
1) Cancelar imediatamente qualquer compressão em curso (e impedir que fique “presa”).
2) Corrigir os erros atuais do motor (incluindo o “fica nos 90%”).
3) Garantir que o projeto compila sem erros (incluindo PWA build) e que a aba “Produção” não crasha.

## Diagnóstico (o que está a acontecer agora)
### 1) “Fica nos 90%”
No `FFmpegContext.tsx`, o preload sobe para 85% por intervalo e depois força `setLoadProgress(90)` antes do `ffmpeg.load()`. Se o `ffmpeg.load()` fica pendurado (não resolve nem rejeita), a UI fica para sempre nos 90%.

Causa provável: estamos a carregar **apenas** `ffmpeg-core.js` e `ffmpeg-core.wasm`, mas **não** estamos a fornecer o `workerURL`.  
Pelo próprio tipo do FFmpeg (`@ffmpeg/ffmpeg`), ele “interact with ffmpeg web worker” e expõe `terminate()`. Na prática, muitos builds do core esperam o worker para inicializar corretamente; sem ele, o load pode ficar num limbo.

### 2) “Cancelar compressão” atualmente não cancela de verdade
Em `useVideoCompression.ts`, `cancelCompression()` só faz:
- `setCompressing(false)`
- `setProgress(0)`

Mas **não interrompe** o `ffmpeg.exec()` em curso. Ou seja: mesmo que a UI “pare”, o worker pode continuar a processar e ficar preso, e depois o motor fica instável para próximas compressões.

### 3) Erros anteriores de build (já identificados)
O erro:
> Missing "./dist/umd/ffmpeg-core.js" specifier in "@ffmpeg/core" package

já foi causado por imports “bundled” para `@ffmpeg/core/dist/umd/...`. No diff mais recente, esses imports foram removidos (bom).  
O plano vai manter a abordagem “CDN + timeouts” sem reintroduzir `@ffmpeg/core` como dependência.

## Solução proposta (mudanças a implementar)
### A) Tornar o preload 100% confiável (não ficar preso)
1) **Voltar a carregar também o worker** a partir da CDN:
   - `ffmpeg-core.js`
   - `ffmpeg-core.wasm`
   - `ffmpeg-core.worker.js`
2) Passar `workerURL` no `ffmpeg.load({ coreURL, wasmURL, workerURL })`.
3) Melhorar o controlo de estado para não ficar “a meio”:
   - Se falhar/timar out: marcar `loadError`, `isLoading=false`, `loadProgress=0` (ou manter em 0/—), e permitir “Tentar novamente”.
4) Garantir que chamadas repetidas não criam múltiplos listeners/eventos.

**Arquivos alvo**
- `src/contexts/FFmpegContext.tsx`

**Notas técnicas**
- Vamos manter `CDN_BASE_URLS` (jsDelivr → unpkg) e `toBlobURLWithTimeout` com `AbortController`.
- Vamos garantir que o timeout global de 3 min realmente cancela a tentativa corrente (ver ponto C abaixo).

---

### B) Implementar cancelamento real de compressão (e “cancelar qualquer compressão actual”)
1) Em `useVideoCompression.ts`, usar um `AbortController` para o job atual:
   - Guardar `abortControllerRef` no hook.
   - Ao iniciar `compressVideo`, criar `AbortController` e passar o `signal` para:
     - `ffmpeg.writeFile(..., { signal })`
     - `ffmpeg.exec(args, undefined, { signal })`
     - `ffmpeg.readFile(..., ..., { signal })`
     - `ffmpeg.deleteFile(..., { signal })`
2) Em `cancelCompression()`:
   - chamar `abortControllerRef.current?.abort()`
   - e, para garantir “hard stop” quando necessário, chamar `ffmpeg.terminate()` (quando existir), porque a própria lib oferece isso e é a forma mais segura de parar tudo.
3) Depois de `terminate()`:
   - o motor precisa de `load()` novamente antes de voltar a comprimir.
   - portanto, o hook deve:
     - resetar estado local (progress/compressing)
     - e opcionalmente chamar `preload()` de novo quando o utilizador tentar comprimir outra vez (ou deixar o preload automático do tab tratar disso).

**Arquivos alvo**
- `src/hooks/useVideoCompression.ts`
- (pequena integração) `src/components/video-production/VideoVersionUpload.tsx` para:
  - ao clicar “Cancelar compressão”, além de setar mensagem, garantir que efetivamente aborta e “desbloqueia” o UI.

---

### C) Cancelar também carregamentos (preload) em curso quando o utilizador manda cancelar
O pedido do utilizador foi “cancela qualquer compressão actual”. Para ser completo, vamos também permitir cancelar o carregamento do motor caso esteja preso.

1) No `FFmpegContext.tsx`, manter um `AbortController` para downloads de core/wasm/worker e reutilizá-lo durante a tentativa.
2) Expor no context uma função opcional, por exemplo `cancelPreload()` (ou `terminateEngine()`), que:
   - aborta os downloads (se estiverem em curso)
   - chama `ffmpegRef.current?.terminate()` se já existe worker
   - reseta `isLoading`, `loadProgress`, `loadError` (ou mantém erro coerente)
   - limpa `loadingPromiseRef`

**Arquivos alvo**
- `src/contexts/FFmpegContext.tsx`
- `src/components/video-production/FFmpegStatusIndicator.tsx` (adicionar botão “Cancelar” quando `isLoading`)

---

### D) Remover bugs de listeners duplicados / vazamentos de eventos
Hoje, `useVideoCompression` faz `ffmpeg.on('progress', ...)` em toda compressão, mas não faz `off`. Isso pode:
- acumular listeners
- causar updates duplicados
- piorar performance

Vamos:
1) Guardar a callback e chamar `ffmpeg.off('progress', cb)` no `finally`.
2) Fazer o mesmo para outros listeners se necessário.

**Arquivos alvo**
- `src/hooks/useVideoCompression.ts`

---

### E) Verificação de “Produção” não crasha e motor volta a funcionar
1) Confirmar que `FFmpegProvider` está montado no topo (está em `src/App.tsx`) e manter o `ProviderGuard` como fallback.
2) Validar que o preload automático em `VideoProductionTab.tsx` não chama `preload()` em loop:
   - ele depende de `[preload, isLoaded]` e chama apenas quando `!isLoaded`, ok.
3) Ajustar mensagens de erro para mostrar claramente:
   - “download bloqueado/timeout”
   - “motor terminou/cancelado”
   - “tente novamente”

**Arquivos alvo**
- `src/components/video-production/VideoProductionTab.tsx`
- `src/components/video-production/FFmpegStatusIndicator.tsx`

## Como vamos testar (end-to-end)
1) Abrir um projeto → aba “Produção”:
   - observar o indicador: deve passar de “não carregado” → “a preparar” → “pronto”.
2) Iniciar compressão com um vídeo pequeno (ex.: 20–50MB):
   - confirmar progresso 0→100 e upload segue.
3) Iniciar compressão com ficheiro maior e clicar “Cancelar compressão” a meio:
   - confirmar que para rapidamente (não continua a consumir CPU)
   - confirmar que nova tentativa de compressão volta a funcionar (recarregando o motor automaticamente).
4) Simular rede lenta:
   - confirmar que não fica preso nos 90%; deve dar timeout e permitir retry.
5) Confirmar build:
   - garantir que não há imports de `@ffmpeg/core/dist/umd/...` e que o build PWA não quebra.

## Riscos / trade-offs
- `ffmpeg.terminate()` é um “hard reset”; após cancelar, o motor precisa recarregar. Preferimos estabilidade (nunca ficar preso) a tentar “retomar” o mesmo worker.
- Alguns ambientes com ad-blockers podem bloquear as CDNs; mantemos fallback e timeouts para dar erro útil em vez de ficar preso.

## Checklist de implementação (ordem)
1) Atualizar `FFmpegContext.tsx` para carregar `workerURL` e suportar cancelamento do preload.
2) Atualizar `useVideoCompression.ts` com AbortController + `ffmpeg.exec(..., { signal })` e `ffmpeg.terminate()` no cancelamento.
3) Atualizar `VideoVersionUpload.tsx` para usar o cancelamento real e melhorar UX ao cancelar.
4) Atualizar `FFmpegStatusIndicator.tsx` para permitir “Cancelar” durante loading + “Tentar novamente”.
5) Testes end-to-end na aba Produção (incluindo cancelar e tentar novamente).
