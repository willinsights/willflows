

## Descarregar o ficheiro original do R2 (em vez da versao comprimida do Stream)

### Problema
O download atual usa a **API de downloads do Cloudflare Stream**, que fornece uma versao **re-codificada/comprimida** do video (15MB). O ficheiro original (180MB) esta armazenado no **Cloudflare R2** e nao esta a ser usado para download.

Quanto a thumbnail: o sistema ja define `?time=50p` (meio do video) como default. Se nao apareceu, e porque o video ainda estava em processamento quando verificaste. Ao recarregar a pagina com o video pronto, a thumbnail deve aparecer corretamente.

### Solucao
Alterar a edge function `video-download-url` para gerar um **URL assinado diretamente do R2** (ficheiro original) em vez de usar a API de downloads do Cloudflare Stream.

### Alteracoes

#### 1. Edge function `video-download-url/index.ts`
- Adicionar a funcao `generateSignedR2Url` (reutilizar a logica ja existente em `stream-process-video`)
- Ler o campo `r2_key` da tabela `video_versions` (alem dos campos atuais)
- Gerar URL assinado do R2 apontando para o ficheiro original
- Remover toda a logica de downloads do Cloudflare Stream (verificar/criar downloads)
- Manter autenticacao e autorizacao existentes

#### 2. Campos da query
Atualizar o select de `video_versions` para incluir `r2_key`:
```text
.select('id, cloudflare_stream_uid, file_name, workspace_id, project_id, r2_key')
```

### Fluxo simplificado

```text
1. Utilizador clica "Download"
2. Frontend chama edge function video-download-url
3. Edge function le r2_key da versao
4. Gera URL assinado do R2 (ficheiro original, 180MB)
5. Retorna URL ao frontend
6. Frontend faz fetch como blob e dispara download com nome correto
```

### Ficheiros a alterar
- `supabase/functions/video-download-url/index.ts` — substituir logica de download Stream por URL assinado R2

### Resultado
- O download entrega o ficheiro original (180MB) sem recompressao
- O nome do ficheiro continua correto (ja resolvido anteriormente)
- Fallback: se nao houver `r2_key`, retorna erro informativo

