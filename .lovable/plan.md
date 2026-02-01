

# Plano: Configurar VAT Português no Stripe

## Situação Actual

### ✅ Já Implementado no Código

A Edge Function `create-checkout` já tem configuração completa de VAT para subscrições:

```typescript
automatic_tax: { enabled: true },
billing_address_collection: 'required',
tax_id_collection: { enabled: true },
```

### ❌ Falta Implementar

1. **Edge Function `create-storage-addon-checkout`** - Não tem configuração de VAT
2. **Configuração no Stripe Dashboard** - Registar Portugal como localização fiscal

---

## Passos a Executar

### Parte 1: Configuração no Stripe Dashboard

Isto requer acção manual no Dashboard Stripe:

| Passo | Acção | Link |
|-------|-------|------|
| 1 | Ir a **Tax Settings** | [dashboard.stripe.com/settings/tax](https://dashboard.stripe.com/settings/tax) |
| 2 | Clicar em **"Get started"** ou **"Add a registration"** | |
| 3 | Seleccionar **Portugal** como país | |
| 4 | Inserir o **NIF português** da empresa | |
| 5 | Confirmar a taxa de **23% VAT** (padrão PT) | |

**Nota**: O Stripe aplicará automaticamente:
- 23% VAT para clientes PT
- Taxas VAT correctas para outros países EU
- Reverse charge para B2B com VAT ID válido

### Parte 2: Actualizar Edge Function

Adicionar configuração de VAT ao `create-storage-addon-checkout`:

---

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/create-storage-addon-checkout/index.ts` | Adicionar `automatic_tax`, `billing_address_collection`, `tax_id_collection` |

---

## Secção Técnica

### Alterações em `create-storage-addon-checkout/index.ts`

**Linhas 130-156 - Adicionar configurações de VAT ao checkout session:**

```typescript
// Create checkout session for the storage addon
const session = await stripe.checkout.sessions.create({
  customer: customerId || undefined,
  customer_email: customerId ? undefined : user.email,
  
  // Allow updating customer address for existing customers
  customer_update: customerId ? {
    address: 'auto',
    name: 'auto',
  } : undefined,
  
  line_items: [
    {
      price: tierInfo.price_id,
      quantity: 1,
    },
  ],
  mode: "subscription",
  allow_promotion_codes: true,
  
  // EU VAT Compliance: Enable automatic tax calculation
  automatic_tax: {
    enabled: true,
  },
  
  // EU VAT Compliance: Require billing address for tax determination
  billing_address_collection: 'required',
  
  // EU VAT Compliance: Allow B2B customers to enter VAT ID
  tax_id_collection: {
    enabled: true,
  },
  
  success_url: `${requestOrigin}/app/planos?storage=success&tier=${tier}`,
  cancel_url: `${requestOrigin}/app/planos?storage=cancelled`,
  metadata: {
    user_id: user.id,
    workspace_id: workspaceId,
    storage_tier: tier,
    addon_type: 'storage',
  },
  subscription_data: {
    metadata: {
      user_id: user.id,
      workspace_id: workspaceId,
      storage_tier: tier,
      addon_type: 'storage',
    },
  },
});
```

---

## Taxas VAT Aplicáveis (Automático via Stripe Tax)

| País | Taxa |
|------|------|
| Portugal | 23% |
| Espanha | 21% |
| França | 20% |
| Alemanha | 19% |
| Brasil | 0% (fora EU) |
| B2B com VAT ID | 0% (reverse charge) |

---

## Resumo

| Tarefa | Tipo | Responsável |
|--------|------|-------------|
| Registar Portugal no Stripe Tax | Dashboard | Utilizador |
| Actualizar `create-storage-addon-checkout` | Código | Lovable |
| `create-checkout` | ✅ Já feito | - |

---

## Próximos Passos Após Aprovação

1. Actualizo a Edge Function `create-storage-addon-checkout`
2. Forneço link directo para configurar no Stripe Dashboard
3. Testo a integração

