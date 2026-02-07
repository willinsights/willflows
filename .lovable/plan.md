

## Melhorar indexacao no Google Search Console

### Problema atual
O site e uma SPA (Single Page Application) sem pre-renderizacao. O Google consegue indexar SPAs, mas de forma mais lenta. Alem disso:
- O **sitemap.xml estatico** nao inclui nenhum artigo do blog
- O **sitemap dinamico** (edge function) esta num dominio diferente (supabase), o que pode confundir o Google
- O **robots.txt** aponta para dois sitemaps separados

### Solucao

#### 1. Unificar sitemaps com Sitemap Index
Converter o `public/sitemap.xml` estatico num **Sitemap Index** que aponta para dois sub-sitemaps:
- `sitemap-pages.xml` (paginas estaticas, servido localmente)
- Sitemap dinamico do blog (edge function, com posts da base de dados)

Atualizar o `robots.txt` para apontar apenas para o sitemap index principal.

#### 2. Atualizar a edge function do sitemap
Corrigir o `baseUrl` na edge function para usar `https://willflow.app` (atualmente usa `willflows.lovable.app` no RSS). Garantir que retorna URLs corretas.

#### 3. Atualizar robots.txt
```text
Sitemap: https://willflow.app/sitemap.xml
```
Remover a referencia direta ao sitemap do supabase — fica referenciado dentro do sitemap index.

#### 4. Adicionar Google Search Console verification tag
Adicionar a meta tag de verificacao do Google Search Console no `index.html` (se ainda nao estiver — confirmar com o utilizador se tem o codigo).

#### 5. Criar pagina de ping para indexacao
Adicionar um link `<link rel="alternate" type="application/rss+xml">` no Blog.tsx e BlogPost.tsx apontando para o feed RSS, para que o Google descubra novos conteudos mais rapidamente.

#### 6. Corrigir lastmod no sitemap estatico
As datas estao fixas em janeiro 2026. Atualizar para a data atual para que o Google saiba que o conteudo e recente.

---

### Detalhes tecnicos

**Ficheiros a alterar:**

1. **`public/sitemap.xml`** — Converter para Sitemap Index:
```text
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://willflow.app/sitemap-pages.xml</loc>
    <lastmod>2026-02-07</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/sitemap</loc>
    <lastmod>2026-02-07</lastmod>
  </sitemap>
</sitemapindex>
```

2. **`public/sitemap-pages.xml`** (novo ficheiro) — Mover todo o conteudo atual do sitemap.xml para aqui, com datas `lastmod` atualizadas para `2026-02-07`.

3. **`public/robots.txt`** — Simplificar para um unico sitemap:
```text
Sitemap: https://willflow.app/sitemap.xml
```

4. **`supabase/functions/sitemap/index.ts`** — Verificar que `baseUrl` e `https://willflow.app` (ja esta correto).

5. **`supabase/functions/blog-rss/index.ts`** — Corrigir `baseUrl` de `https://willflows.lovable.app` para `https://willflow.app`.

6. **`index.html`** — Adicionar RSS discovery link e atualizar preloads de imagens obsoletas (linhas 96-97 apontam para assets que podem ja nao existir).

7. **`src/pages/Blog.tsx`** — Ja tem link RSS, confirmar que URL esta correta.

**Resultado:** O Google Search Console vai encontrar um unico sitemap index que agrega todas as paginas estaticas e todos os artigos do blog dinamicamente. O feed RSS ajuda na descoberta rapida de novos artigos.
