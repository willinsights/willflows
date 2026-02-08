

## Corrigir sitemap -- remover ficheiros estaticos que dao 404

### Problema
Os ficheiros `sitemap.xml` e `sitemap-pages.xml` na pasta `public/` nao sao servidos corretamente pelo hosting SPA -- o React Router interceta os pedidos e mostra a pagina 404. O Google nao consegue ler o sitemap.

A edge function (`/functions/v1/sitemap`) ja inclui todas as paginas estaticas E os artigos do blog num unico sitemap funcional.

### Solucao

**1. Atualizar `robots.txt`** -- remover referencia ao `sitemap.xml` que da 404 e manter apenas o URL da edge function:

```
Sitemap: https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/sitemap
```

**2. Remover ficheiros estaticos desnecessarios:**
- `public/sitemap.xml` (sitemapindex que da 404)
- `public/sitemap-pages.xml` (paginas duplicadas que ja estao na edge function)

### Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `public/robots.txt` | Remover linha `Sitemap: https://willflow.app/sitemap.xml`, manter apenas a edge function |
| `public/sitemap.xml` | Eliminar |
| `public/sitemap-pages.xml` | Eliminar |

### Resultado
- Google Search Console consegue aceder ao sitemap via edge function
- Sem ficheiros 404 referenciados no robots.txt
- Sitemap unico e dinamico com todas as paginas + blog
