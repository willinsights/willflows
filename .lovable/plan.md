

# Plano: Destacar Funcionalidades Studio - Aprovação de Vídeo e Desenho de Timeline

## Objectivo

Criar visibilidade máxima para as funcionalidades exclusivas do plano Studio:
- 🎬 **Aprovação de Vídeo** (Video Approval)
- 🎞️ **Desenho de Timeline** (Timeline Design)

Estas são funcionalidades premium que diferenciam o WillFlow de concorrentes como Frame.io e justificam o plano mais avançado.

---

## Estado Actual

| Local | Aprovação de Vídeo | Timeline |
|-------|-------------------|----------|
| Landing.tsx (Pricing) | ✅ Box Studio | ✅ Box Studio |
| Pricing.tsx | ✅ Box Studio | ✅ Box Studio |
| Features.tsx | ❌ Não aparece | ❌ Não aparece |
| Páginas dedicadas | ❌ Não existe | ❌ Não existe |
| RelatedFeatures | ❌ Não listado | ❌ Não listado |
| Secção Features (Landing) | ❌ Não aparece | ❌ Não aparece |
| ParaVideomakers.tsx | ❌ Menção breve | ⚠️ Menção breve |

---

## Estratégia de Destaque

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          NÍVEIS DE VISIBILIDADE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   NÍVEL 1    │    │   NÍVEL 2    │    │   NÍVEL 3    │              │
│  │  Páginas     │    │  Features    │    │   Listagens  │              │
│  │  Dedicadas   │    │  Grid + Hero │    │  e Links     │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│        ↓                   ↓                   ↓                        │
│  VideoApproval.tsx   Features.tsx       RelatedFeatures.tsx            │
│  Timeline.tsx        Landing.tsx        ParaVideomakers.tsx            │
│                                         Navigation                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Propostas

### 1. Criar Páginas Dedicadas (Nível 1)

#### Ficheiro: `src/pages/features/VideoApproval.tsx`

Nova página seguindo o padrão de Chat.tsx:

**Estrutura:**
- Hero com badge "Exclusivo Studio 🎬"
- Diagrama de fluxo: Upload → Review → Comentário → Aprovação
- Secções de features com screenshots
- Comparação com Frame.io / Vimeo Review
- CTA focado no plano Studio

**Conteúdo Principal:**
- Portal público para clientes
- Comentários por timestamp (SMPTE timecode)
- Múltiplas versões A/B
- Notificações de feedback
- Retenção de 7 dias após conclusão

---

#### Ficheiro: `src/pages/features/Timeline.tsx`

Nova página para Desenho de Timeline:

**Estrutura:**
- Hero com badge "Exclusivo Studio 🎞️"
- Diagrama visual da timeline
- Secções explicativas
- Templates reutilizáveis
- CTA focado no plano Studio

**Conteúdo Principal:**
- Guia estrutural para editores
- Segmentos com durações (min/max)
- Drag & drop para reordenar
- Guardar como template
- Visualização de timeline estilo Frame.io

---

### 2. Adicionar ao Grid de Features (Nível 2)

#### Ficheiro: `src/pages/Features.tsx`

Adicionar 2 novos cards ao array `features`:

```typescript
{
  icon: Film,
  title: '🎬 Aprovação de Vídeo',
  description: 'Portal de review para clientes com comentários por timestamp. Alternativa integrada ao Frame.io.',
  href: '/funcionalidades/video-approval',
  badge: 'Studio',
  details: [
    'Portal público para clientes',
    'Comentários no timestamp exato',
    'Comparação de versões A/B',
    'Notificações de feedback',
  ],
},
{
  icon: Clapperboard,
  title: '🎞️ Desenho de Timeline',
  description: 'Estrutura visual para guiar a edição. Defina segmentos e durações antes de começar.',
  href: '/funcionalidades/timeline',
  badge: 'Studio',
  details: [
    'Segmentos com duração',
    'Drag & drop para reordenar',
    'Templates reutilizáveis',
    'Timecode profissional SMPTE',
  ],
},
```

**Visual diferenciado:** Cards com badge "Studio" e borda gradient especial

---

### 3. Adicionar à Landing Page (Nível 2)

#### Ficheiro: `src/pages/Landing.tsx`

Adicionar as 2 features ao array `features` (linha ~53):

```typescript
{
  icon: Film,
  title: '🎬 Aprovação de Vídeo',
  description: 'Portal de review para clientes com comentários por timecode. Exclusivo Studio.',
},
{
  icon: Clapperboard,
  title: '🎞️ Timeline',
  description: 'Estrutura visual para guiar a edição de vídeo. Exclusivo Studio.',
},
```

---

### 4. Actualizar Listagens e Links (Nível 3)

#### Ficheiro: `src/components/marketing/RelatedFeatures.tsx`

Adicionar ao array `allFeatures`:

```typescript
{ name: 'Aprovação de Vídeo', href: '/funcionalidades/video-approval', icon: Film, description: 'Review de vídeos' },
{ name: 'Timeline', href: '/funcionalidades/timeline', icon: Clapperboard, description: 'Estrutura de edição' },
```

---

#### Ficheiro: `src/pages/ParaVideomakers.tsx`

Adicionar secções dedicadas com FeatureSection para:
- Aprovação de Vídeo (alternativa ao Frame.io)
- Desenho de Timeline

---

### 5. Actualizar Rotas

#### Ficheiro: `src/App.tsx`

Adicionar imports e rotas:

```typescript
import VideoApprovalFeature from './pages/features/VideoApproval';
import TimelineFeature from './pages/features/Timeline';

// Nas rotas:
<Route path="/funcionalidades/video-approval" element={<VideoApprovalFeature />} />
<Route path="/funcionalidades/timeline" element={<TimelineFeature />} />
```

---

### 6. SEO e Sitemap

Adicionar ao sitemap:
- `/funcionalidades/video-approval`
- `/funcionalidades/timeline`

Incluir schemas JSON-LD Product para cada página.

---

## Resumo de Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/pages/features/VideoApproval.tsx` | Criar (nova página) |
| `src/pages/features/Timeline.tsx` | Criar (nova página) |
| `src/pages/Features.tsx` | Modificar (adicionar 2 cards) |
| `src/pages/Landing.tsx` | Modificar (adicionar 2 features) |
| `src/components/marketing/RelatedFeatures.tsx` | Modificar (adicionar 2 links) |
| `src/pages/ParaVideomakers.tsx` | Modificar (expandir secções) |
| `src/App.tsx` | Modificar (adicionar 2 rotas) |
| `public/sitemap.xml` | Modificar (adicionar 2 URLs) |

---

## Resultado Visual Esperado

### Features.tsx (Grid)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ 💬 Chat      │  │ 📋 Kanban    │  │ 👥 CRM       │              │
│  │              │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ 📅 Calendário│  │ 💰 Pagamentos│  │ 📊 Relatórios│              │
│  │              │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 ⭐ EXCLUSIVO PLANO STUDIO ⭐                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │ 🎬 Aprovação de Vídeo    │  │ 🎞️ Desenho de Timeline   │        │
│  │     [STUDIO]             │  │     [STUDIO]             │        │
│  │ Portal de review para    │  │ Estrutura visual para    │        │
│  │ clientes com timecode    │  │ guiar a edição           │        │
│  │                          │  │                          │        │
│  │ ─────────────────────    │  │ ─────────────────────    │        │
│  │ • Portal público         │  │ • Segmentos duração      │        │
│  │ • Comentários timestamp  │  │ • Drag & drop            │        │
│  │ • Versões A/B            │  │ • Templates              │        │
│  │ • Notificações           │  │ • Timecode SMPTE         │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Secção Técnica: Estrutura das Novas Páginas

### VideoApproval.tsx (Estrutura)

```tsx
import { Helmet } from 'react-helmet-async';
import { Film, Play, MessageSquare, CheckCircle, Upload, Eye } from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FeatureHero } from '@/components/marketing/FeatureHero';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { RelatedFeatures } from '@/components/marketing/RelatedFeatures';
import { AutoBreadcrumbs } from '@/components/seo/Breadcrumbs';
// ... SEO completo + schemas
// ... Secções: Hero, Flow, Features, Comparison vs Frame.io, CTA
```

### Timeline.tsx (Estrutura)

```tsx
import { Helmet } from 'react-helmet-async';
import { Clapperboard, Clock, Layers, Copy, Move } from 'lucide-react';
// ... mesma estrutura
// ... Secções específicas para Timeline Design
```

---

## SEO para Novas Páginas

Cada página incluirá:
- Title optimizado (<70 chars)
- Meta description (<160 chars)
- Canonical URL
- Open Graph completo
- Twitter Cards
- Schema Product JSON-LD
- Schema BreadcrumbList

**Exemplo Video Approval:**
```html
<title>Aprovação de Vídeo | WillFlow - Alternativa ao Frame.io</title>
<meta name="description" content="Portal de review de vídeo para clientes. Comentários por timestamp, comparação de versões e aprovação online. Exclusivo plano Studio." />
```

