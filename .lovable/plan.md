

## Corrigir nome do ficheiro no download de video

### Problema
O atributo `download` do elemento `<a>` e ignorado pelo browser quando o URL e cross-origin (Cloudflare Stream). Por isso, o ficheiro fica sempre com o nome "default" em vez do nome original do video.

### Solucao
Em vez de redirecionar diretamente para o URL do Cloudflare, fazer fetch do video como blob, criar um object URL local, e so depois acionar o download. Como o object URL e same-origin, o atributo `download` funciona corretamente.

### Alteracao

**Ficheiro:** `src/hooks/useVideoDownload.ts`

Substituir o bloco de download (linhas 72-80) que cria um link com `href = download_url` por:

1. Fazer `fetch(download_url)` para obter o conteudo como blob
2. Criar `URL.createObjectURL(blob)` (URL local)
3. Usar esse URL no `link.href` com `link.download = fileName`
4. Revogar o object URL apos o download

```text
// Antes:
const link = document.createElement('a');
link.href = download_url;
link.download = fileName || file_name || 'video.mp4';
link.target = '_blank';
document.body.appendChild(link);
link.click();

// Depois:
const blob = await fetch(download_url).then(r => r.blob());
const blobUrl = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = blobUrl;
link.download = fileName || file_name || 'video.mp4';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(blobUrl);
```

Remover `target='_blank'` e `rel='noopener'` pois ja nao sao necessarios com blob URL.

### Ficheiro a alterar
- `src/hooks/useVideoDownload.ts` (1 bloco alterado, ~8 linhas)

### Resultado
O video descarregado tera o nome original do ficheiro (ex: `video-cliente-final.mp4`) em vez de "default".

