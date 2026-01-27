
# Sprint 2: Correções de SEO e Bugs

## Problemas Identificados

### 1. AggregateRating Inconsistente (P1.4)
**Localização:**
- `index.html:177-181` → `"ratingValue": "4.8", "ratingCount": "127"`
- `Landing.tsx:250-255` → `"ratingValue": "5", "ratingCount": "1"`

**Problema:** Dados conflitantes de avaliação no Schema.org. O Google pode penalizar por dados estruturados contraditórios.

**Solução:** Remover o AggregateRating de ambos os ficheiros até termos reviews verificáveis reais. É uma prática recomendada pelo Google não fabricar dados de avaliação.

---

### 2. Imagem OG em Falta (P1.5)
**Localização:**
- `index.html:57` → `<meta property="og:image" content="https://willflow.app/og-image.png" />`
- `public/` → Não existe ficheiro `og-image.png`

**Problema:** Quando alguém partilha o WillFlow no Facebook, LinkedIn, WhatsApp, etc., a imagem não aparece ou mostra uma genérica.

**Solução:** Usar uma das screenshots existentes como fallback temporário até criar uma OG image dedicada (1200x630px).

---

### 3. AggregateOffer Inconsistente
**Localização:**
- `index.html:171-175` → `"lowPrice": "14", "highPrice": "32"`
- `Landing.tsx:243-248` → `"lowPrice": "0", "highPrice": "99"`

**Problema:** Preços diferentes entre os dois ficheiros.

**Solução:** Unificar com os valores reais dos planos.

---

## Plano de Implementação

### Ficheiro 1: `index.html`
1. **Atualizar referência OG image** para usar screenshot existente
2. **Corrigir AggregateOffer** com preços corretos (14-32 EUR)
3. **Remover AggregateRating** até termos dados reais

### Ficheiro 2: `Landing.tsx`
1. **Corrigir AggregateOffer** para coincidir com `index.html`
2. **Remover AggregateRating** fabricado
3. Manter consistência com dados do `index.html`

---

## Mudanças Técnicas

### `index.html`
```diff
- <meta property="og:image" content="https://willflow.app/og-image.png" />
+ <meta property="og:image" content="https://willflow.app/screenshots/screenshot-dashboard-dark-full.png" />

  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "EUR",
    "lowPrice": "14",
-   "highPrice": "32",
+   "highPrice": "49",
    "offerCount": "3"
  },
- "aggregateRating": {
-   "@type": "AggregateRating",
-   "ratingValue": "4.8",
-   "ratingCount": "127"
- },
```

### `Landing.tsx`
```diff
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "EUR",
-   "lowPrice": "0",
-   "highPrice": "99",
+   "lowPrice": "14",
+   "highPrice": "49",
    "offerCount": "3"
  },
- "aggregateRating": {
-   "@type": "AggregateRating",
-   "ratingValue": "5",
-   "ratingCount": "1",
-   "bestRating": "5"
- },
```

---

## Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Schema.org Validation | ❌ Inconsistente | ✅ Consistente |
| OG Image | ❌ 404 Error | ✅ Screenshot funcional |
| Rich Results | ❌ Potencial penalização | ✅ Dados válidos |
| Social Sharing | ❌ Sem preview | ✅ Preview visual |

---

## Próximos Passos (Sprint 3)

Após estas correções:
- Criar imagem OG dedicada 1200x630px com branding
- Implementar Google Consent Mode v2 completo
- Corrigir tabela de subprocessadores em Privacy.tsx
- Adicionar aria-labels para acessibilidade

---

## Estimativa
- **Tempo:** 15 minutos
- **Risco:** Baixo (apenas metadados)
- **Rollback:** Fácil (git revert)
