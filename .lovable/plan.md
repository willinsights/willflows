

# Plano: Melhorar Cards de Pricing com Destaque nas Diferenças

## Objectivo
Reformular os cards de pricing para:
1. Destacar visualmente as **diferenças** entre planos (não repetir features comuns)
2. Adicionar no **Studio** destaque para "Aprovação de vídeo" e "Desenho de Timeline"
3. Criar uma apresentação mais limpa e orientada à conversão

---

## Mudanças Propostas

### 1. Adicionar Feature "Timeline" em `plans.ts`

Actualmente só existe `videoApproval`. Vou adicionar `timeline` como feature separada:

```typescript
// Em studio.features (plans.ts)
{ key: 'timeline', name: 'Desenho de Timeline', value: true, included: true, category: 'studio' },
{ key: 'videoApproval', name: 'Aprovação de vídeo', value: true, included: true, category: 'studio' },
```

E adicionar `timeline: false` nos planos Starter e Pro para aparecer como não incluído.

---

### 2. Reformular Cards em `Pricing.tsx`

#### Estrutura Proposta (por plano):

**STARTER** - Mostrar apenas features incluídas:
- Kanban Captação + Edição
- CRM básico
- Calendário integrado
- Media Hub
- Relatórios simples
- Relatórios financeiros

**PRO** - Mostrar features que **diferenciam** do Starter:
- Tudo do Starter, **MAIS**:
- Chat interno ← diferenciador
- CRM completo ← diferenciador
- Exportação Excel ← diferenciador
- Google Calendar ← diferenciador
- Relatórios avançados ← diferenciador

**STUDIO** - Mostrar features **exclusivas** com destaque especial:
- Tudo do Pro, **MAIS**:
- 🎬 **Aprovação de vídeo** ← destaque visual
- 🎞️ **Desenho de Timeline** ← destaque visual
- 📦 10 GB armazenamento incluído
- Frame.io integrado
- API & Webhooks

---

### 3. Design Visual dos Cards

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   STARTER                PRO (Mais vendido)           STUDIO               │
│   €14/mês                €24/mês                      €42/mês              │
│                                                                             │
│   1 workspace            Até 3 workspaces             Até 10 workspaces    │
│   Até 2 utilizadores     Até 10 utilizadores          Utilizadores ilimit. │
│   20 projetos ativos     Projetos ilimitados          Projetos ilimitados  │
│   ─────────────────      ─────────────────            ─────────────────    │
│                                                                             │
│   ✓ Kanban               ✓ Tudo do Starter, mais:     ✓ Tudo do Pro, mais: │
│   ✓ CRM básico           ✓ Chat interno               ┌──────────────────┐ │
│   ✓ Calendário           ✓ CRM completo               │ 🎬 Aprovação de  │ │
│   ✓ Media Hub            ✓ Exportação Excel           │    vídeo         │ │
│   ✓ Relatórios simples   ✓ Google Calendar            │ 🎞️ Desenho de    │ │
│   ✓ Relatórios finan.    ✓ Relatórios avançados       │    Timeline      │ │
│                                                        │ 📦 10GB incluído │ │
│                                                        └──────────────────┘ │
│                                                        ✓ Frame.io           │
│                                                        ✓ API & Webhooks     │
│                                                                             │
│   [Testar grátis 30 dias] [Testar grátis 30 dias]    [Testar grátis 30 dias]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementação Técnica

### Ficheiro: `src/lib/plans.ts`

1. Adicionar feature `timeline` a todos os planos:
   - Starter: `included: false`
   - Pro: `included: false`
   - Studio: `included: true`

2. Adicionar categoria `studio` para features exclusivas do Studio

### Ficheiro: `src/pages/Pricing.tsx`

1. Criar lógica para **mostrar apenas diferenças**:
   ```typescript
   // Definir features a mostrar por plano
   const HIGHLIGHT_FEATURES = {
     starter: ['kanban', 'crmBasic', 'calendar', 'mediaHub', 'reportsBasic', 'financialReports'],
     pro: ['chat', 'crmComplete', 'exportExcel', 'googleCalendar', 'reportsAdvanced'],
     studio: ['timeline', 'videoApproval', 'videoStorage', 'frameio', 'api'],
   };
   ```

2. Adicionar **secção de destaque especial** para Studio:
   ```tsx
   {planId === 'studio' && (
     <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30">
       <div className="flex items-center gap-2 text-sm font-semibold text-primary">
         <span>🎬</span> Aprovação de vídeo
       </div>
       <div className="flex items-center gap-2 text-sm font-semibold text-primary mt-1">
         <span>🎞️</span> Desenho de Timeline
       </div>
       <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
         <span>📦</span> 10 GB incluído
       </div>
     </div>
   )}
   ```

3. Adicionar texto "Tudo do [Plano anterior], mais:" para Pro e Studio:
   ```tsx
   {planId !== 'starter' && (
     <p className="text-xs text-muted-foreground mb-3 italic">
       Tudo do {planId === 'pro' ? 'Starter' : 'Pro'}, mais:
     </p>
   )}
   ```

---

## Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Features listadas | Todas (repetidas) | Apenas diferenciadoras |
| Timeline no Studio | Não aparecia | Destaque visual |
| Aprovação de vídeo | Não aparecia destacado | Destaque visual com box colorido |
| 10GB storage | Não aparecia | Mencionado no destaque |
| Clareza das diferenças | Baixa | Alta |

---

## Ficheiros a Modificar

1. **`src/lib/plans.ts`**
   - Adicionar feature `timeline` aos 3 planos
   - Adicionar categoria `studio` para features exclusivas

2. **`src/pages/Pricing.tsx`**
   - Reformular renderização dos cards
   - Adicionar box de destaque para Studio
   - Filtrar features para mostrar apenas diferenças
   - Adicionar texto "Tudo do X, mais:"

