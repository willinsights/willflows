
# Plano: Remover Features Não Implementadas da Página de Pricing

## Objectivo
Limpar a lista de features para mostrar apenas funcionalidades **realmente disponíveis**, mantendo a honestidade com os clientes.

---

## Resumo das Alterações

| Feature | Estado Actual | Acção |
|---------|---------------|-------|
| Templates de projeto | ❌ Sem UI | **Remover** do Pro |
| Frame.io integrado | ❌ Substituído | **Remover** do Studio |
| API & Webhooks | ❌ Não existe | **Remover** do Studio |
| Permissões avançadas | ✅ Funcional | **Manter** |

---

## Alterações Técnicas

### 1. Ficheiro: `src/lib/plans.ts`

#### Remover `templates` de todos os planos:
- **Linha 182** (Starter): Remover `{ key: 'templates', ... }`
- **Linha 221** (Pro): Remover `{ key: 'templates', ... }`
- **Linha 259** (Studio): Remover `{ key: 'templates', ... }`

#### Remover `frameio` de todos os planos:
- **Linha 183** (Starter): Remover `{ key: 'frameio', ... }`
- **Linha 222** (Pro): Remover `{ key: 'frameio', ... }`
- **Linha 260** (Studio): Remover `{ key: 'frameio', ... }`

#### Remover `api` de todos os planos:
- **Linha 185** (Starter): Remover `{ key: 'api', ... }`
- **Linha 224** (Pro): Remover `{ key: 'api', ... }`
- **Linha 263** (Studio): Remover `{ key: 'api', ... }`

---

### 2. Ficheiro: `src/pages/Pricing.tsx`

#### Actualizar `HIGHLIGHT_FEATURES` (linhas ~233-237):

```typescript
// ANTES
const HIGHLIGHT_FEATURES: Record<PlanId, string[]> = {
  starter: ['kanban', 'crmBasic', 'calendar', 'mediaHub', 'reportsBasic', 'financialReports'],
  pro: ['chat', 'crmComplete', 'exportExcel', 'googleCalendar', 'reportsAdvanced', 'templates'],
  studio: ['frameio', 'automations', 'permissions', 'api'],
};

// DEPOIS (remover templates, frameio, api)
const HIGHLIGHT_FEATURES: Record<PlanId, string[]> = {
  starter: ['kanban', 'crmBasic', 'calendar', 'mediaHub', 'reportsBasic', 'financialReports'],
  pro: ['chat', 'crmComplete', 'exportExcel', 'googleCalendar', 'reportsAdvanced'],
  studio: ['automations', 'permissions'],
};
```

---

### 3. Ficheiro: `src/lib/plans.ts` - Actualizar `getCompactFeatures`

```typescript
// ANTES (linha 365-366)
case 'studio':
  return ['Tudo do Pro', 'Frame.io', 'Automações', 'API'];

// DEPOIS
case 'studio':
  return ['Tudo do Pro', 'Automações', 'Permissões avançadas'];
```

---

## Impacto Visual

### Antes da Limpeza
**Studio** mostrava:
- Frame.io integrado ← **Não existe**
- API & Webhooks ← **Não existe**
- Templates de projeto ← **Não existe**

### Depois da Limpeza
**Studio** mostrará apenas features reais:
- 🎬 Aprovação de vídeo ✅
- 🎞️ Desenho de Timeline ✅
- 📦 10 GB armazenamento ✅
- Automações avançadas ✅
- Permissões avançadas ✅

---

## Ficheiros a Modificar

| Ficheiro | Alterações |
|----------|------------|
| `src/lib/plans.ts` | Remover features `templates`, `frameio`, `api` dos 3 planos |
| `src/lib/plans.ts` | Actualizar `getCompactFeatures()` |
| `src/pages/Pricing.tsx` | Actualizar `HIGHLIGHT_FEATURES` |

---

## Resultado Final

A página de pricing mostrará apenas funcionalidades que:
1. **Existem** e estão implementadas
2. **Funcionam** e o utilizador pode aceder
3. Mantêm **honestidade** com os potenciais clientes

Quando API & Webhooks e Templates forem implementados no futuro, basta re-adicionar à lista.
