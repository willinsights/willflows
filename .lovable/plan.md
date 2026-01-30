
## Proteção Contra Indexação - Links de Aprovação de Vídeo

### Objetivo
Impedir que motores de pesquisa (Google, Bing, etc.) indexem as páginas de aprovação de vídeo dos clientes.

---

### Alterações a Implementar

| Ficheiro | Alteração |
|----------|-----------|
| `public/robots.txt` | Adicionar `Disallow: /video-approval/` |
| `src/pages/public/VideoApproval.tsx` | Adicionar `Helmet` com meta tags `noindex` |

---

### Alteração 1: robots.txt

**Ficheiro:** `public/robots.txt`

Adicionar antes da secção "Sitemaps" (linha 29):
```txt
Disallow: /video-approval/
```

**Estado final da secção de bloqueio:**
```txt
# Block app routes (require authentication)
Disallow: /app/
Disallow: /auth
Disallow: /onboarding
Disallow: /convite
Disallow: /checkout-success
Disallow: /tutorial
Disallow: /video-approval/
```

---

### Alteração 2: Meta Tags noindex

**Ficheiro:** `src/pages/public/VideoApproval.tsx`

**Passo 1 - Adicionar import (linha 3):**
```tsx
import { Helmet } from 'react-helmet-async';
```

**Passo 2 - Adicionar Helmet no JSX (após o return principal, antes do primeiro elemento):**
```tsx
<>
  <Helmet>
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="googlebot" content="noindex, nofollow, noarchive" />
    <title>Studio Review | WillFlow</title>
  </Helmet>
  {/* ... resto do componente */}
</>
```

---

### Porquê 2 Camadas de Proteção?

| Camada | Propósito |
|--------|-----------|
| `robots.txt` | Primeira linha de defesa - crawlers bem-comportados respeitam isto |
| Meta tags `noindex` | Segunda linha - aplicada mesmo que o crawler ignore robots.txt |

### Directivas Utilizadas

- **noindex** - Não mostrar esta página nos resultados de pesquisa
- **nofollow** - Não seguir links encontrados nesta página  
- **noarchive** - Não guardar versão em cache da página

---

### Resultado Esperado

Os vídeos dos clientes ficam completamente protegidos contra indexação em qualquer motor de pesquisa.
