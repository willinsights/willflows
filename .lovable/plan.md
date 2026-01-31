

# Plano: Auditoria e Otimização SEO Completa para Indexação no Google

## Estado Actual da Implementação SEO

### O que JÁ ESTÁ Implementado ✅

| Elemento | Estado | Detalhes |
|----------|--------|----------|
| **robots.txt** | ✅ Completo | Permite indexação de todas as rotas públicas, bloqueia /app/, /auth, /video-approval/ |
| **Sitemap estático** | ✅ Existe | `public/sitemap.xml` com todas as páginas estáticas |
| **Sitemap dinâmico** | ✅ Existe | Edge function que gera sitemap com posts do blog + imagens |
| **Meta tags básicas** | ✅ Maioria | `<title>`, `<description>` em quase todas as páginas |
| **Tags canónicas** | ✅ Maioria | `<link rel="canonical">` em ~90% das páginas |
| **Open Graph** | ⚠️ Parcial | Apenas algumas páginas têm `og:title`, `og:description`, `og:url` |
| **Twitter Cards** | ⚠️ Parcial | Apenas algumas páginas têm `twitter:title`, `twitter:description` |
| **og:image** | ❌ Em falta | Apenas BlogPost usa og:image dinâmico; demais páginas não têm |
| **Structured Data** | ⚠️ Parcial | index.html tem Organization, SoftwareApplication, WebSite; algumas páginas têm schemas específicos |
| **FAQPage Schema** | ✅ Implementado | Help.tsx e Pricing.tsx têm FAQPage schema |
| **Breadcrumbs Schema** | ✅ Implementado | Componente Breadcrumbs.tsx com schema JSON-LD |
| **Hreflang** | ✅ Implementado | pt-PT, pt-BR e x-default no index.html |
| **noindex correto** | ✅ Implementado | Tutorial, NotFound, VideoApproval, BlogPost (erro) têm noindex |
| **Geo Tags** | ✅ Implementado | geo.region=PT, geo.placename=Lisboa |
| **Bing Verification** | ✅ Implementado | msvalidate.01 no index.html |
| **Preconnect** | ✅ Implementado | fonts.googleapis, supabase.co |

---

## Problemas Identificados e Soluções

### 1. **og:image em falta nas páginas públicas** (Prioridade Alta)

**Problema:** Apenas o BlogPost.tsx usa og:image. Todas as outras páginas públicas (Landing, Features, Pricing, etc.) não têm og:image definido, usando apenas o fallback do index.html.

**Impacto:** Quando partilhado em redes sociais, as páginas não mostram imagem específica.

**Solução:** Adicionar og:image a todas as páginas públicas usando a imagem genérica `/og-image.png` ou imagens específicas por secção.

**Páginas a atualizar:**
- `Landing.tsx`
- `Features.tsx`
- `Pricing.tsx`
- `ParaFotografos.tsx`
- `ParaVideomakers.tsx`
- `ParaAgencias.tsx`
- `ParaProdutoras.tsx`
- `Security.tsx`
- `Integrations.tsx`
- `Help.tsx`
- `Contact.tsx`
- `About.tsx`
- `Blog.tsx`
- `Privacy.tsx`
- `Terms.tsx`
- `Cookies.tsx`
- Todas as páginas em `/features/*`
- Todas as páginas em `/comparisons/*`

---

### 2. **Twitter Cards incompletos** (Prioridade Alta)

**Problema:** Várias páginas têm og:* tags mas faltam twitter:* equivalentes.

**Solução:** Adicionar twitter:card, twitter:image a todas as páginas públicas.

---

### 3. **Falta schema Product/Service nas Feature Pages** (Prioridade Média)

**Problema:** As páginas de funcionalidades (Chat, Kanban, CRM, etc.) já têm alguns schemas, mas podem beneficiar de schemas mais ricos.

**Estado actual:** Chat.tsx tem schema Product básico; outras features podem estar incompletas.

---

### 4. **Landing Page sem Helmet** (Prioridade Alta)

**Problema:** Verificar se Landing.tsx tem tags SEO completas.

---

### 5. **Falta schema FAQPage na Landing** (Prioridade Média)

**Problema:** Landing.tsx tem uma secção FAQ mas não tem o schema FAQPage.

**Impacto:** Perde oportunidade de rich snippets nos resultados de pesquisa.

---

### 6. **Sitemap estático desatualizado** (Prioridade Baixa)

**Problema:** O sitemap estático em `public/sitemap.xml` tem datas de lastmod antigas (2026-01-21/22).

**Solução:** Remover sitemap estático e usar apenas o dinâmico da Edge Function, ou automatizar atualização de datas.

---

## Alterações Técnicas Propostas

### Ficheiros a Criar/Modificar

#### 1. Novo componente SEO reutilizável: `src/components/seo/SEOHead.tsx`

Criar componente centralizado para garantir consistência:

```typescript
interface SEOHeadProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noindex?: boolean;
  schemaData?: object;
}
```

Inclui automaticamente:
- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:url">`
- `<meta property="og:image">` (default: /og-image.png)
- `<meta property="og:image:width">` (1200)
- `<meta property="og:image:height">` (630)
- `<meta property="og:type">`
- `<meta name="twitter:card">` (summary_large_image)
- `<meta name="twitter:title">`
- `<meta name="twitter:description">`
- `<meta name="twitter:image">`
- Schema JSON-LD se fornecido

---

#### 2. Atualizar páginas para usar SEOHead

| Página | Alterações |
|--------|------------|
| `Landing.tsx` | Usar SEOHead + adicionar FAQPage schema |
| `Features.tsx` | Usar SEOHead com og:image |
| `Pricing.tsx` | Já tem boa estrutura, adicionar og:image |
| `ParaFotografos.tsx` | Adicionar og:image, twitter:image |
| `ParaVideomakers.tsx` | Adicionar og:image, twitter:image |
| `ParaAgencias.tsx` | Adicionar og:image, twitter:image |
| `ParaProdutoras.tsx` | Adicionar og:image, twitter:image |
| `Security.tsx` | Adicionar og:image, twitter:image |
| `Integrations.tsx` | Adicionar og:image, twitter:image |
| `Help.tsx` | Adicionar og:image, twitter:image |
| `Contact.tsx` | Adicionar og:image, twitter:image |
| `About.tsx` | Adicionar og:image, twitter:image |
| `Blog.tsx` | Adicionar og:image (lista), twitter:* |
| `Privacy.tsx` | Adicionar og:*, twitter:* |
| `Terms.tsx` | Adicionar og:*, twitter:* |
| `Cookies.tsx` | Adicionar og:*, twitter:* |
| `features/Chat.tsx` | Adicionar og:image, twitter:* |
| `features/Kanban.tsx` | Adicionar og:image, twitter:* |
| `features/CRM.tsx` | Adicionar og:image, twitter:* |
| `features/Calendario.tsx` | Adicionar og:image, twitter:* |
| `features/Pagamentos.tsx` | Adicionar og:image, twitter:* |
| `features/Relatorios.tsx` | Adicionar og:image, twitter:* |
| `features/MediaHub.tsx` | Adicionar og:image, twitter:* |
| `comparisons/ComparisonsHub.tsx` | Adicionar og:image, twitter:* |
| `comparisons/VsAsana.tsx` | Adicionar og:image, twitter:* |
| `comparisons/VsClickUp.tsx` | Adicionar og:image, twitter:* |
| `comparisons/VsTrello.tsx` | Adicionar og:image, twitter:* |
| `public/PlanosComparar.tsx` | Adicionar og:image, twitter:* |

---

#### 3. Adicionar FAQPage Schema à Landing

```javascript
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
}
```

---

## Resumo de Alterações

| Tipo | Quantidade |
|------|------------|
| Criar novo ficheiro | 1 (SEOHead.tsx) |
| Modificar páginas | ~30 páginas |
| Schema JSON-LD novos | 1 (FAQPage na Landing) |
| og:image adicionados | ~30 páginas |
| twitter:* adicionados | ~30 páginas |

---

## Resultado Final

Após implementação:
1. **100% das páginas públicas** terão SEO completo
2. **Rich snippets** para FAQs em Landing, Help, Pricing
3. **Open Graph** completo para partilhas em redes sociais
4. **Twitter Cards** completos para partilhas no Twitter/X
5. **Schema estruturado** para melhor compreensão pelo Google
6. **Consistência** através do componente SEOHead reutilizável

---

## Secção Técnica Detalhada

### Componente SEOHead.tsx

```typescript
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noindex?: boolean;
  schemaData?: object | object[];
  twitterCard?: 'summary' | 'summary_large_image';
}

export function SEOHead({
  title,
  description,
  canonical,
  ogImage = 'https://willflow.app/og-image.png',
  ogType = 'website',
  noindex = false,
  schemaData,
  twitterCard = 'summary_large_image',
}: SEOHeadProps) {
  const fullCanonical = canonical.startsWith('http') 
    ? canonical 
    : `https://willflow.app${canonical}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonical} />
      
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="WillFlow" />
      <meta property="og:locale" content="pt_PT" />
      
      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Schema.org */}
      {schemaData && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(schemaData) 
              ? schemaData 
              : schemaData
          )}
        </script>
      )}
    </Helmet>
  );
}
```

### Exemplo de Uso na Landing.tsx

```tsx
import { SEOHead } from '@/components/seo/SEOHead';

// No componente Landing:
<SEOHead
  title="WillFlow - Gestão de Projetos para Fotógrafos e Filmmakers"
  description="Sistema completo de gestão de projetos e produção para fotógrafos, filmmakers, agências e produtoras. Kanban, CRM, calendário e finanças num só lugar."
  canonical="/"
  schemaData={{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }}
/>
```

