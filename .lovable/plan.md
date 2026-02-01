

# Plano: Adicionar Preços BRL aos Storage Addons

## Objectivo
Permitir que workspaces com moeda BRL paguem os storage addons na sua moeda local, alinhando com a experiência dos planos principais.

---

## Situação Actual

| Componente | Estado |
|------------|--------|
| **Frontend (`plans.ts`)** | Já tem preços EUR e BRL definidos |
| **Frontend (`StorageManagementCard`)** | Detecta currency do workspace, mostra preço correcto |
| **Edge Function** | Usa `price_id` fixo (apenas EUR) |
| **Stripe** | Só tem prices em EUR criados |

---

## Alterações Necessárias

### 1. Criar Prices BRL no Stripe (Manual)

Precisas criar 4 novos preços recorrentes no Stripe Dashboard:

| Tier | Preço BRL/mês | Produto existente |
|------|---------------|-------------------|
| +25 GB | R$35 | `prod_TtVyg9RmLKqwRS` |
| +50 GB | R$59 | `prod_TsfrcvSlClixZM` |
| +100 GB | R$99 | `prod_TsfrGDXzlIOhaM` |
| +250 GB | R$197 | `prod_TsfrRubX5bCWEh` |

### 2. Actualizar `src/lib/plans.ts`

Mudar estrutura para suportar price_id por moeda:

```typescript
// ANTES (actual)
'25gb': {
  price_id: 'price_1SviwHGr2lXbVyw9V2L3pgY9',
  // ...
}

// DEPOIS
'25gb': {
  price_id: {
    eur: 'price_1SviwHGr2lXbVyw9V2L3pgY9',
    brl: 'price_NOVO_ID_BRL_25GB',
  },
  // ...
}
```

### 3. Actualizar `StorageManagementCard.tsx`

Passar a currency para o edge function:

```typescript
// ANTES
body: { tier, workspaceId: currentWorkspace?.id }

// DEPOIS  
body: { tier, workspaceId: currentWorkspace?.id, currency }
```

### 4. Actualizar Edge Function

Receber currency e seleccionar o price_id correcto:

```typescript
// ANTES
const tierInfo = STORAGE_TIERS[tier];
price: tierInfo.price_id

// DEPOIS
const { tier, workspaceId, currency } = await req.json();
const priceId = STORAGE_TIERS[tier].price_id[currency || 'eur'];
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/plans.ts` | Estrutura `STORAGE_ADDON_PRICES` com price_id por moeda |
| `src/components/video-production/StorageManagementCard.tsx` | Enviar `currency` no body |
| `supabase/functions/create-storage-addon-checkout/index.ts` | Receber `currency`, usar price_id correcto |

---

## Secção Técnica

### Nova Estrutura em `plans.ts`

```typescript
export const STORAGE_ADDON_PRICES = {
  '25gb': {
    price_id: {
      eur: 'price_1SviwHGr2lXbVyw9V2L3pgY9',
      brl: 'price_PLACEHOLDER_BRL_25GB', // Substituir após criar no Stripe
    },
    product_id: 'prod_TtVyg9RmLKqwRS',
    bytes: 25 * 1024 * 1024 * 1024,
    displayName: '+25 GB',
    price: { eur: 6, brl: 35 },
  },
  '50gb': {
    price_id: {
      eur: 'price_1SuuVQGr2lXbVyw9OybAtJ9i',
      brl: 'price_PLACEHOLDER_BRL_50GB',
    },
    // ...
  },
  // ...
} as const;

// Helper actualizado
export function getStorageAddonPriceId(tier: StorageAddonTier, currency: Currency): string {
  return STORAGE_ADDON_PRICES[tier].price_id[currency];
}
```

### Edge Function Actualizada

```typescript
const STORAGE_TIERS = {
  '25gb': {
    price_id: {
      eur: 'price_1SviwHGr2lXbVyw9V2L3pgY9',
      brl: 'price_NOVO_BRL_25GB',
    },
    product_id: 'prod_TtVyg9RmLKqwRS',
    bytes: 25 * 1024 * 1024 * 1024,
    display: '+25 GB',
  },
  // ... outros tiers
} as const;

// Na função:
const { tier, workspaceId, currency = 'eur' } = await req.json();

const tierInfo = STORAGE_TIERS[tier as StorageTier];
const priceId = tierInfo.price_id[currency as 'eur' | 'brl'];

logStep("Request parsed", { tier, workspaceId, currency, priceId });

// Usar priceId na criação do checkout
line_items: [{ price: priceId, quantity: 1 }]
```

### Frontend - Enviar Currency

```typescript
const { data, error } = await supabase.functions.invoke('create-storage-addon-checkout', {
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: { 
    tier, 
    workspaceId: currentWorkspace?.id,
    currency, // Adicionar isto
  },
});
```

---

## Passos de Implementação

1. **Tu no Stripe Dashboard**: Criar 4 preços BRL e copiar os IDs
2. **Eu actualizo**: `plans.ts` com os novos IDs
3. **Eu actualizo**: `StorageManagementCard.tsx` para enviar currency
4. **Eu actualizo**: Edge function para usar o price_id correcto

---

## Próximo Passo

Preciso que cries os 4 preços BRL no Stripe Dashboard e me forneças os IDs. Depois implemento as alterações no código.

**Link directo**: [Stripe Products](https://dashboard.stripe.com/products)

