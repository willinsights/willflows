

# Mostrar Thumbnails nas Versoes do Review Studio

## Problema
Quando se carrega um video, a thumbnail e gerada automaticamente pelo Cloudflare Stream e guardada no campo `thumbnail_path` da base de dados (ex: `https://videodelivery.net/{uid}/thumbnails/thumbnail.jpg`). No entanto, a lista de versoes mostra apenas um circulo com "V1", "V2", etc., sem mostrar a thumbnail.

## Solucao
Alterar o componente `VideoVersionsList` para exibir a thumbnail do video em vez do circulo com o numero da versao. O numero da versao aparecera como badge sobreposto.

## Resultado Visual

```text
+--------------------------------------------------+
|  [thumbnail]  nome-do-video.mp4        [icons]    |
|  [V1 badge ]  12 Jan, 14:30 · 245 MB             |
+--------------------------------------------------+
```

## Alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/video-production/VideoVersionsList.tsx` | Substituir o circulo com numero por uma imagem thumbnail (usando `thumbnail_path`). Adicionar badge "V1" sobreposto. Fallback para o circulo actual se nao houver thumbnail. |

### Detalhe Tecnico

- Usar `version.thumbnail_path` como `src` da imagem thumbnail
- Dimensoes da thumbnail: ~64x36px (ratio 16:9) com `rounded` e `object-cover`
- Badge com numero da versao posicionado no canto inferior esquerdo da thumbnail
- Se `thumbnail_path` for `null` (video ainda a processar ou legacy), manter o circulo actual como fallback
- Nenhuma alteracao de backend necessaria - as thumbnails ja sao geradas e guardadas pelo Cloudflare Stream

