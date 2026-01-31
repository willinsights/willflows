
# Plano de Correção - Preços, Limites e Features

## Resumo das Discrepâncias Identificadas

| Item | Valor Actual | Valor Correcto | Ficheiro |
|------|--------------|----------------|----------|
| Pro JSON-LD | €22 | €24 | Pricing.tsx |
| highPrice JSON-LD | €49 | €42 | Landing.tsx |
| Projetos Starter (backend) | 15 | 20 | check-subscription/index.ts |
| Studio mensal EUR | €32 | €42 | plans.ts + Stripe |
| Chat interno Starter | NÃO (correcto) | NÃO ✅ | Já está correcto |
| Timeline | Não registada como feature | Já existe no código | Verificado em useVideoStructure.ts |

## Alterações Necessárias

### 1. Corrigir Preço Pro no JSON-LD (SEO)
**Ficheiro:** `src/pages/Pricing.tsx` (linha 184)

```text
ANTES:  "price": "22"
DEPOIS: "price": "24"
```

### 2. Corrigir highPrice na Landing.tsx
**Ficheiro:** `src/pages/Landing.tsx` (linha 248)

```text
ANTES:  "highPrice": "49"
DEPOIS: "highPrice": "42"
```

### 3. Corrigir Limite de Projetos no Backend
**Ficheiro:** `supabase/functions/check-subscription/index.ts`

Há **3 locais** onde `projects: 15` precisa ser alterado para `projects: 20`:
- Linha 124: Dentro do bloco `userSubData`
- Linha 184: Fallback quando não há cliente Stripe
- Linha 247: Fallback final após verificação Stripe

### 4. Actualizar Preço Studio para €42
**Ficheiro:** `src/lib/plans.ts` (linhas 221-224)

```typescript
// ANTES
prices: {
  eur: { monthly: 32, yearly: 307 },
  brl: { monthly: 197, yearly: 1891 },
},

// DEPOIS (€42 mensais, anual = 42 × 12 × 0.8 = 403.2 ≈ 403)
prices: {
  eur: { monthly: 42, yearly: 403 },
  brl: { monthly: 247, yearly: 2371 }, // Proporcional ao aumento
},
```

### 5. Actualizar JSON-LD do Studio na Pricing.tsx
**Ficheiro:** `src/pages/Pricing.tsx` (linha 193)

```text
ANTES:  "price": "32"
DEPOIS: "price": "42"
```

### 6. Actualizar Storage Addons no plans.ts
**Ficheiro:** `src/lib/plans.ts` (linhas 104-127)

O utilizador indicou novos tiers de storage:
- +25 GB → €6 (NOVO - não existe)
- +50 GB → €10 (actual: €9)
- +100 GB → €18 (actual: €15)
- +250 GB → €35 (actual: €29)

---

## Secção Técnica

### Ficheiros a Modificar

1. **`src/pages/Pricing.tsx`**
   - Linha 184: `"price": "22"` → `"price": "24"`
   - Linha 193: `"price": "32"` → `"price": "42"`

2. **`src/pages/Landing.tsx`**
   - Linha 248: `"highPrice": "49"` → `"highPrice": "42"`

3. **`supabase/functions/check-subscription/index.ts`**
   - Linha 124: `projects: 15` → `projects: 20`
   - Linha 184: `projects: 15` → `projects: 20`
   - Linha 247: `projects: 15` → `projects: 20`

4. **`src/lib/plans.ts`**
   - Linhas 221-224: Actualizar preços Studio para €42/€403 (EUR)
   - Linhas 104-127: Actualizar preços dos Storage Addons

### Acção Necessária no Stripe

O preço do Studio no Stripe está actualmente a **€32**. Para alterar para **€42**, será necessário:
1. Criar novos preços no Stripe para o produto Studio (€42 mensal / €403 anual)
2. Actualizar os price_ids em `src/lib/plans.ts`
3. Criar o produto +25GB Storage Addon no Stripe

Posso criar os novos preços no Stripe durante a implementação.

### Verificações de Segurança

- ✅ Chat interno no Starter já está como `included: false` (correcto)
- ✅ Desenho de Timeline já existe no código (`useVideoStructure.ts`) e está integrado na UI de detalhes de tarefa
- ✅ Feature `videoApproval` já está registada no Studio

### Timeline (Desenho de Timeline)

Confirmo que a feature "Desenho de Timeline" já existe no sistema:
- Componente em `useVideoStructure.ts` com funções de `clearTimeline`
- Está disponível no detalhe de tarefa/projecto
- A feature `videoApproval` (que engloba timeline e aprovação de vídeo) já está correctamente gatilhada ao plano Studio

---

## Resumo de Implementação

| Prioridade | Tarefa | Esforço |
|------------|--------|---------|
| 🔴 CRÍTICO | Corrigir preço Pro JSON-LD (€22→€24) | Baixo |
| 🔴 CRÍTICO | Corrigir limite projectos (15→20) | Baixo |
| 🟡 ALTO | Actualizar preço Studio (€32→€42) | Médio |
| 🟡 ALTO | Corrigir highPrice Landing (€49→€42) | Baixo |
| 🟢 MÉDIO | Actualizar Storage Addons preços | Médio |
| 🟢 MÉDIO | Criar +25GB Storage Addon | Médio |
