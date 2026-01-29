
# Plano: Correção do Motor de Compressão FFmpeg

## Problema Identificado

O motor de compressão falha com "Failed to fetch" / "HTTP 404" porque o código está a tentar descarregar um ficheiro que não existe:

- **Ficheiros disponíveis** em `@ffmpeg/core@0.12.10/dist/umd/`:
  - `ffmpeg-core.js` (existe)
  - `ffmpeg-core.wasm` (existe)

- **Ficheiro que NÃO existe**:
  - `ffmpeg-core.worker.js` (404!)

A documentação oficial do `@ffmpeg/ffmpeg@0.12` confirma que o build UMD single-threaded **não requer** workerURL. O `ffmpeg.load()` apenas precisa de `coreURL` e `wasmURL`.

---

## Solução

Remover a tentativa de descarregar `ffmpeg-core.worker.js` e usar apenas os dois ficheiros que existem (`coreURL` e `wasmURL`), seguindo a documentação oficial.

---

## Alterações Técnicas

### Ficheiro: `src/contexts/FFmpegContext.tsx`

1. **Remover download do worker**: Alterar de 3 ficheiros para apenas 2:

```text
Antes:
const [coreURL, wasmURL, workerURL] = await Promise.all([
  toBlobURLWithTimeout(`${base}/ffmpeg-core.js`, ...),
  toBlobURLWithTimeout(`${base}/ffmpeg-core.wasm`, ...),
  toBlobURLWithTimeout(`${base}/ffmpeg-core.worker.js`, ...), // <- 404!
]);

Depois:
const [coreURL, wasmURL] = await Promise.all([
  toBlobURLWithTimeout(`${base}/ffmpeg-core.js`, ...),
  toBlobURLWithTimeout(`${base}/ffmpeg-core.wasm`, ...),
]);
```

2. **Remover workerURL do ffmpeg.load()**: Usar apenas `coreURL` e `wasmURL`:

```text
Antes:
await ffmpeg.load({
  coreURL,
  wasmURL,
  workerURL, // <- não existe no UMD build
});

Depois:
await ffmpeg.load({
  coreURL,
  wasmURL,
});
```

3. **Atualizar log de debug**: Remover referência ao worker nos logs.

---

## Diagrama de Fluxo Corrigido

```text
+-------------------+
|  Utilizador abre  |
|  aba "Produção"   |
+--------+----------+
         |
         v
+-------------------+
|  preload() é      |
|  chamado          |
+--------+----------+
         |
         v
+-------------------+
| Download CDN      |
| (jsDelivr/unpkg)  |
+--------+----------+
         |
    +----+----+
    |         |
    v         v
+-------+ +--------+
|.js    | |.wasm   |
|(109KB)| |(31MB)  |
+---+---+ +---+----+
    |         |
    +----+----+
         |
         v
+-------------------+
| ffmpeg.load({     |
|   coreURL,        |
|   wasmURL         |
| })                |
+--------+----------+
         |
         v
+-------------------+
| Motor pronto!     |
| isLoaded = true   |
+-------------------+
```

---

## Impacto

- **Mínimo**: Apenas uma linha de código a remover
- **Sem regressões**: Esta é a forma documentada de usar o FFmpeg WASM
- **Funcionalidade mantida**: A compressão de vídeo funcionará exatamente igual

---

## Próximos Passos

Após aprovar, farei a alteração no ficheiro `src/contexts/FFmpegContext.tsx`. O motor deverá carregar corretamente e mostrar "Motor de compressão pronto" em vez do erro atual.
