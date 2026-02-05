
# Plano: Corrigir Permissões de Clientes para Colaboradores

## Problemas Identificados

### 1. Política RLS de INSERT Incorrecta
A política de INSERT na tabela `clients` usa `clients.edit` em vez de `clients.create`:

```sql
-- Política actual (INCORRECTA)
WITH CHECK: has_workspace_permission(auth.uid(), workspace_id, 'clients.edit')

-- Deveria ser
WITH CHECK: has_workspace_permission(auth.uid(), workspace_id, 'clients.create')
```

**Impacto**: Utilizadores com permissão `clients.create` mas sem `clients.edit` não conseguem criar clientes.

### 2. Falta de Permissão `clients.view_financials` no Frontend
A página de Clientes usa `canViewAllFinancials` (permissão global de dashboard) para esconder valores financeiros, mas deveria usar a permissão específica `clients.view_financials`.

### 3. Campos Financeiros na Tabela Clients
A tabela `clients` tem um campo `estimated_value` que é valor financeiro e não deveria ser visível a colaboradores sem permissão financeira.

---

## Solução

### Parte 1: Corrigir Políticas RLS da Tabela `clients`

Actualizar as políticas para usar as permissões correctas:

```sql
-- DROP e recriar política INSERT
DROP POLICY IF EXISTS "Members with edit permission can create clients" ON public.clients;

CREATE POLICY "Members with create permission can create clients"
ON public.clients FOR INSERT
WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'clients.create'));

-- Manter políticas existentes de SELECT, UPDATE e DELETE
-- SELECT já usa 'clients.view' (correcto)
-- UPDATE já usa 'clients.edit' (correcto)
-- DELETE já usa 'clients.edit' (correcto)
```

### Parte 2: Adicionar Permissão `clients.view_financials` ao Hook

Actualizar `useFinancialPermissions.ts` para incluir verificação de `clients.view_financials`:

```typescript
// Adicionar nova permissão
const canViewClientFinancials = hasPermission('clients.view_financials');
```

### Parte 3: Actualizar Página de Clientes

Na página `Clientes.tsx`, usar `canViewClientFinancials` específico em vez de `canViewAllFinancials` para os valores de receita dos clientes:

```typescript
// Em vez de
const { canViewClients, canViewAllFinancials } = useFinancialPermissions();

// Usar também
const { canViewClients, canViewAllFinancials, canViewClientFinancials } = useFinancialPermissions();

// Usar canViewClientFinancials para mostrar/esconder receita na lista de clientes
{canViewClientFinancials && (
  <p className="font-semibold text-success">{formatCurrency(stats.totalRevenue)}</p>
)}
```

### Parte 4: Adicionar Permissão `clients.edit` ao Hook para UI de Edição

Adicionar verificação para esconder botões de edição/eliminação se não tiver permissão:

```typescript
const canEditClients = hasPermission('clients.edit');
const canCreateClients = hasPermission('clients.create');
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| **Migration SQL** | Corrigir política INSERT de `clients.edit` → `clients.create` |
| `src/hooks/useFinancialPermissions.ts` | Adicionar `canViewClientFinancials`, `canEditClients`, `canCreateClients` |
| `src/pages/app/Clientes.tsx` | Usar permissões granulares para valores financeiros e botões de edição |
| `src/components/projects/CreateProjectModal.tsx` | Verificar `clients.view` para mostrar dropdown de clientes |
| `src/components/projects/ProjectDetailsSheet.tsx` | Idem |

---

## Lógica de Permissões Final

| Role | Ver Clientes | Criar Clientes | Editar Clientes | Ver Valores Financeiros |
|------|--------------|----------------|-----------------|------------------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Edição | ✅ (default) | ✅ (default) | ✅ (default) | ✅ (default) |
| Captação | ✅ (default) | ✅ (default) | ✅ (default) | ❌ (default) |
| Gestão | ✅ (default) | ❌ | ❌ | ❌ |
| Visualização | ✅ (default) | ❌ | ❌ | ❌ |

**Nota**: Estas são as permissões por omissão. O admin do workspace pode personalizar através da página de Permissões.

---

## Comportamento Esperado Após Correcção

1. **Colaboradores com `clients.view`**: Podem ver a lista de clientes e seleccionar clientes em projectos
2. **Colaboradores com `clients.create`**: Podem criar novos clientes
3. **Colaboradores com `clients.edit`**: Podem editar e eliminar clientes
4. **Colaboradores sem `clients.view_financials`**: Vêem a lista de clientes mas valores de receita aparecem como "---"

---

## Impacto

- Colaboradores autorizados acedem à página Clientes sem erros
- Podem seleccionar/criar clientes em projectos
- Valores financeiros ficam ocultos para quem não tem permissão
- Botões de edição/eliminação só aparecem para quem tem permissão
