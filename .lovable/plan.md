

## Corrigir Subscrição Stripe — IDs de Produto + Fix Manual

### 1. Fix Imediato: Atualizar registo do Júnio na BD

```sql
UPDATE user_subscriptions 
SET subscription_plan = 'pro',
    subscription_status = 'active',
    stripe_subscription_id = 'sub_1T6yYlGr2lXbVyw9VcBUrPmb',
    stripe_customer_id = 'cus_Tq3ROXZ7uyl9bG',
    current_period_end = '2026-04-01T12:44:44Z',
    trial_ends_at = NULL
WHERE user_id = '47b648bc-0097-468a-a474-06e49048578d';
```

Também atualizar o workspace dele:
```sql
UPDATE workspaces SET subscription_plan = 'pro', subscription_status = 'active',
  stripe_customer_id = 'cus_Tq3ROXZ7uyl9bG', stripe_subscription_id = 'sub_1T6yYlGr2lXbVyw9VcBUrPmb'
WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = '47b648bc-0097-468a-a474-06e49048578d' AND role = 'admin');
```

### 2. Corrigir Product IDs nas Edge Functions

**`supabase/functions/stripe-webhook/index.ts`** — Linha 11-15:
```typescript
const PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_TpNVDQjhG0wlZ4': 'starter',
  'prod_TpNVjl9D0tQ8wQ': 'pro',
  'prod_TpNVM1mlDtAvKA': 'studio',
};
```

**`supabase/functions/check-subscription/index.ts`** — Linha 30-34:
```typescript
const PLAN_MAPPING: Record<string, string> = {
  'prod_TpNVDQjhG0wlZ4': 'starter',
  'prod_TpNVjl9D0tQ8wQ': 'pro',
  'prod_TpNVM1mlDtAvKA': 'studio',
};
```

### 3. Verificar Webhook URL no Stripe

O webhook não está a receber eventos. Precisas verificar no dashboard do Stripe:
- O endpoint URL deve ser: `https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/stripe-webhook`
- O `STRIPE_WEBHOOK_SECRET` configurado no projeto deve corresponder ao signing secret do endpoint

---

### Ficheiros a modificar: 2
1. `supabase/functions/stripe-webhook/index.ts` — corrigir product IDs
2. `supabase/functions/check-subscription/index.ts` — corrigir product IDs

### Operações de dados: 2 queries UPDATE (user_subscriptions + workspaces)

### Impacto
- **Crítico** — sem esta correção, nenhuma subscrição Live será reconhecida
- Risco baixo — apenas IDs de mapeamento, sem alteração de lógica

