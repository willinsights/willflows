
# Plano: Aplicar Estilo de Pricing da Página /planos à Homepage

## Objectivo
Uniformizar a apresentação dos cards de pricing na Homepage (Landing.tsx) com o mesmo estilo já implementado na página /planos (Pricing.tsx), incluindo:
1. Mostrar apenas **features diferenciadas** por plano
2. Adicionar texto "Tudo do X, mais:" para Pro e Studio
3. Adicionar **box de destaque exclusivo Studio** com Aprovação de vídeo, Timeline e 10GB

---

## Estado Actual (Landing.tsx)

```text
┌──────────────────────────────────────────────────────────────────┐
│  STARTER          PRO (Mais vendido)       STUDIO               │
│  €14/mês          €24/mês                  €42/mês              │
│                                                                  │
│  1 workspace      Até 3 workspaces         Até 10 workspaces    │
│  Até 2 users      Até 10 users             Ilimitado            │
│  20 projetos      Ilimitado                Ilimitado            │
│  ──────────       ──────────               ──────────           │
│                                                                  │
│  ✓ Feature 1      ✓ Feature 1              ✓ Feature 1          │
│  ✓ Feature 2      ✓ Feature 2              ✓ Feature 2          │
│  ✓ Feature 3      ✓ Feature 3              ✓ Feature 3          │
│  ... (todas)      ... (todas)              ... (todas)          │
│                                                                  │
│  [Testar grátis]  [Testar grátis]          [Testar grátis]      │
└──────────────────────────────────────────────────────────────────┘
```

**Problemas:**
- Mostra todas as features incluídas (repetição entre planos)
- Não destaca as diferenças
- Studio não tem highlight box especial

---

## Estado Desejado (igual a Pricing.tsx)

```text
┌──────────────────────────────────────────────────────────────────┐
│  STARTER          PRO (Mais vendido)       STUDIO               │
│  €14/mês          €24/mês                  €42/mês              │
│                                                                  │
│  1 workspace      Até 3 workspaces         Até 10 workspaces    │
│  Até 2 users      Até 10 users             Ilimitado            │
│  20 projetos      Ilimitado                Ilimitado            │
│  ──────────       ──────────               ──────────           │
│                                                                  │
│  ✓ Kanban         ✓ Tudo do Starter, +     ✓ Tudo do Pro, +     │
│  ✓ CRM básico     ✓ Chat interno           ┌────────────────┐   │
│  ✓ Calendário     ✓ CRM completo           │ 🎬 Aprovação   │   │
│  ✓ Media Hub      ✓ Exportação Excel       │ 🎞️ Timeline    │   │
│  ✓ Relatórios     ✓ Google Calendar        │ 📦 10GB        │   │
│  ✓ Financeiro     ✓ Relatórios avançados   └────────────────┘   │
│                                             ✓ Automações        │
│                                             ✓ Permissões        │
│                                                                  │
│  [Testar grátis]  [Testar grátis]          [Testar grátis]      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Ficheiro: `src/pages/Landing.tsx`

#### 1. Substituir lógica de displayFeatures (linhas 720-785)

**Antes (linhas 723-724):**
```typescript
const displayFeatures = plan.features.filter(f => f.category !== 'limit' && f.included);
```

**Depois:**
```typescript
// Features a mostrar por plano (apenas diferenças)
const HIGHLIGHT_FEATURES: Record<PlanId, string[]> = {
  starter: ['kanban', 'crmBasic', 'calendar', 'mediaHub', 'reportsBasic', 'financialReports'],
  pro: ['chat', 'crmComplete', 'exportExcel', 'googleCalendar', 'reportsAdvanced'],
  studio: ['automations', 'permissions'],
};

const highlightKeys = HIGHLIGHT_FEATURES[planId];
const displayFeatures = plan.features.filter(f => 
  f.category !== 'limit' && 
  f.category !== 'studio' && 
  highlightKeys.includes(f.key) && 
  f.included
);
```

#### 2. Adicionar texto "Tudo do X, mais:" (após os limites, linha ~763)

```tsx
{/* Texto "Tudo do X, mais:" para Pro e Studio */}
{planId !== 'starter' && (
  <p className="text-xs text-muted-foreground mb-3 italic">
    ✓ Tudo do {planId === 'pro' ? 'Starter' : 'Pro'}, mais:
  </p>
)}
```

#### 3. Adicionar Studio Highlight Box (antes das features, linha ~764)

```tsx
{/* Studio Exclusive Highlight Box */}
{planId === 'studio' && (
  <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-primary/20 via-purple-500/15 to-pink-500/10 border border-primary/30 shadow-lg shadow-primary/5">
    <p className="text-xs font-semibold text-primary/80 uppercase tracking-wide mb-3">Exclusivo Studio</p>
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-lg">🎬</span>
        <span className="text-sm font-semibold text-foreground">Aprovação de vídeo</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg">🎞️</span>
        <span className="text-sm font-semibold text-foreground">Desenho de Timeline</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg">📦</span>
        <span className="text-sm text-muted-foreground">10 GB armazenamento incluído</span>
      </div>
    </div>
  </div>
)}
```

#### 4. Remover `.slice(0, 6)` das features (linha 766)

**Antes:**
```tsx
{displayFeatures.slice(0, 6).map((feature) => (
```

**Depois:**
```tsx
{displayFeatures.map((feature) => (
```

---

## Código Completo do Bloco (linhas 720-785)

```tsx
<div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto focal-container">
  {PLAN_ORDER.map((planId, index) => {
    const plan = PLANS[planId];
    
    // Features a mostrar por plano (apenas diferenças)
    const HIGHLIGHT_FEATURES: Record<PlanId, string[]> = {
      starter: ['kanban', 'crmBasic', 'calendar', 'mediaHub', 'reportsBasic', 'financialReports'],
      pro: ['chat', 'crmComplete', 'exportExcel', 'googleCalendar', 'reportsAdvanced'],
      studio: ['automations', 'permissions'],
    };
    
    const highlightKeys = HIGHLIGHT_FEATURES[planId];
    const displayFeatures = plan.features.filter(f => 
      f.category !== 'limit' && 
      f.category !== 'studio' && 
      highlightKeys.includes(f.key) && 
      f.included
    );
    
    return (
      <motion.div
        key={planId}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true }}
        className={`focal-card relative flex flex-col rounded-2xl border p-6 ${
          plan.popular 
            ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 md:scale-105 z-10' 
            : 'border-border/50 bg-background/50'
        }`}
      >
        {plan.popular && (
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary px-4">
            Mais vendido
          </Badge>
        )}
        
        <div className="text-center mb-6">
          <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
          
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">
              {currencySymbol}{getPrice(planId)}
            </span>
            <span className="text-muted-foreground">/mês</span>
          </div>
        </div>

        {/* Limits */}
        <div className="space-y-2 mb-6 pb-6 border-b border-border/50">
          <p className="text-sm font-medium">{plan.limitsDisplay.workspaces}</p>
          <p className="text-sm font-medium">{plan.limitsDisplay.users}</p>
          <p className="text-sm font-medium">{plan.limitsDisplay.projects}</p>
        </div>

        {/* Texto "Tudo do X, mais:" */}
        {planId !== 'starter' && (
          <p className="text-xs text-muted-foreground mb-3 italic">
            ✓ Tudo do {planId === 'pro' ? 'Starter' : 'Pro'}, mais:
          </p>
        )}

        {/* Studio Exclusive Highlight Box */}
        {planId === 'studio' && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-primary/20 via-purple-500/15 to-pink-500/10 border border-primary/30 shadow-lg shadow-primary/5">
            <p className="text-xs font-semibold text-primary/80 uppercase tracking-wide mb-3">Exclusivo Studio</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-lg">🎬</span>
                <span className="text-sm font-semibold text-foreground">Aprovação de vídeo</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">🎞️</span>
                <span className="text-sm font-semibold text-foreground">Desenho de Timeline</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">📦</span>
                <span className="text-sm text-muted-foreground">10 GB armazenamento incluído</span>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <ul className="space-y-3 mb-6 flex-1">
          {displayFeatures.map((feature) => (
            <li key={feature.key} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success flex-shrink-0" />
              <span>{feature.name}</span>
            </li>
          ))}
        </ul>

        <Link to="/auth?trial=true">
          <Button
            className={`w-full glow-ring ${plan.popular ? 'gradient-primary' : ''}`}
            variant={plan.popular ? 'default' : 'outline'}
          >
            Testar grátis 30 dias
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </motion.div>
    );
  })}
</div>
```

---

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Landing.tsx` | Substituir bloco de pricing (linhas ~720-785) com a nova lógica |

---

## Resultado Final

| Elemento | Antes | Depois |
|----------|-------|--------|
| Features listadas | Todas incluídas (repetição) | Apenas diferenças |
| Texto introdutório | Nenhum | "Tudo do X, mais:" |
| Studio destaque | Nenhum | Box visual com 🎬🎞️📦 |
| Consistência | Diferente de /planos | Idêntico a /planos |
