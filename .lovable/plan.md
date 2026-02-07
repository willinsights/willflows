

## Corrigir thumbnail quebrado durante processamento

### Problema
Quando um video e carregado, a edge function `stream-process-video` define imediatamente o `thumbnail_path` com o URL do Cloudflare Stream (ex: `https://videodelivery.net/{uid}/thumbnails/thumbnail.jpg?time=50p`). Porem, nesse momento o video ainda esta em estado "downloading" ou "inprogress" -- o Cloudflare Stream ainda nao gerou o thumbnail, e o URL devolve erro/imagem quebrada.

A lista de versoes (`VideoVersionsList.tsx`) mostra o `<img>` com esse URL partido, resultando num thumbnail em branco ou com icone de erro.

### Solucao

**1. `stream-process-video` -- nao definir `thumbnail_path` durante o upload**

Na edge function, remover a atribuicao de `thumbnail_path` no `update` apos submeter ao Stream. Deixar como `null` ate o video estar pronto.

Antes:
```
update({ cloudflare_stream_uid, stream_playback_url, thumbnail_path, stream_status })
```

Depois:
```
update({ cloudflare_stream_uid, stream_playback_url, stream_status })
// thumbnail_path fica null -- sera preenchido pelo stream-get-status quando ready
```

**2. `stream-get-status` -- ja esta correto**

Esta edge function ja define `thumbnail_path` quando o status muda para "ready". Nao precisa de alteracoes.

**3. `VideoVersionsList.tsx` -- mostrar placeholder durante processamento**

Adicionar uma verificacao: se a versao esta em processamento (`stream_status` e "processing"/"downloading"/"inprogress"/"pending"), mostrar um placeholder animado em vez de tentar carregar o thumbnail. Tambem adicionar `onError` ao `<img>` para tratar casos onde o URL existe mas a imagem falha.

```text
Antes:
  thumbnail_path existe -> mostra <img>
  thumbnail_path null   -> mostra circulo com V{n}

Depois:
  stream_status e processing/downloading/inprogress/pending -> mostra placeholder animado (spinner)
  thumbnail_path existe E stream_status e ready              -> mostra <img> com onError fallback
  thumbnail_path null                                        -> mostra circulo com V{n}
```

### Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/stream-process-video/index.ts` | Remover `thumbnail_path` do update apos submissao ao Stream (linhas 233-239) |
| `src/components/video-production/VideoVersionsList.tsx` | Adicionar placeholder animado para versoes em processamento e `onError` fallback no `<img>` |

### Resultado
- Durante o processamento: mostra um placeholder com spinner em vez de imagem quebrada
- Quando o video fica pronto: `stream-get-status` preenche `thumbnail_path` e o realtime atualiza a UI automaticamente com o thumbnail real
- Se o thumbnail falhar por outro motivo: `onError` esconde a imagem e mostra o fallback circular

