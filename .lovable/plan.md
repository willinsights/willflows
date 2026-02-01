# ✅ Plano Concluído: Preços BRL nos Storage Addons

## Resultado

Implementação completa do suporte a preços BRL nos storage addons.

---

## Alterações Realizadas

### 1. Stripe Dashboard - Preços BRL Criados

| Tier | Preço BRL/mês | Price ID |
|------|---------------|----------|
| +25 GB | R$35 | `price_1Sw5TGGr2lXbVyw9u8hw1ul0` |
| +50 GB | R$59 | `price_1Sw5TIGr2lXbVyw94wWjWSOz` |
| +100 GB | R$99 | `price_1Sw5TJGr2lXbVyw9pG3eUgiu` |
| +250 GB | R$197 | `price_1Sw5TKGr2lXbVyw91lqsbx3Y` |

### 2. Ficheiros Modificados

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/plans.ts` | `STORAGE_ADDON_PRICES` agora tem `price_id: { eur, brl }` + nova função `getStorageAddonPriceId()` |
| `src/components/video-production/StorageManagementCard.tsx` | Envia `currency` no body do checkout |
| `supabase/functions/create-storage-addon-checkout/index.ts` | Recebe `currency`, selecciona price_id correcto |

---

## Fluxo Implementado

1. Frontend detecta currency do workspace (`currentWorkspace?.currency`)
2. Ao clicar "Adicionar", envia `{ tier, workspaceId, currency }`
3. Edge function valida currency e usa o `price_id` correcto
4. Checkout Stripe abre com preço na moeda correcta

---

## Próximos Passos (Opcional)

- Webhook pode ser actualizado para registar a currency usada na subscrição
- Considerar migração de clientes existentes se mudarem de país
