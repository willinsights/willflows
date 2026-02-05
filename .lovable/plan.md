
# ✅ Plano Concluído: Corrigir Permissões de Clientes para Colaboradores

## Alterações Implementadas

### 1. Política RLS de INSERT Corrigida ✅
Actualizada a política de INSERT na tabela `clients` para usar `clients.create` em vez de `clients.edit`:

```sql
DROP POLICY IF EXISTS "Members with edit permission can create clients" ON public.clients;

CREATE POLICY "Members with create permission can create clients"
ON public.clients FOR INSERT
WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'clients.create'));
```

### 2. Hook `useFinancialPermissions` Actualizado ✅
Adicionadas novas permissões granulares:
- `canViewClientFinancials` - para ver valores financeiros de clientes
- `canEditClients` - para editar/eliminar clientes  
- `canCreateClients` - para criar novos clientes

### 3. Página de Clientes Actualizada ✅
- Botão "Novo Cliente" só aparece se `canCreateClients`
- Valores financeiros (Receita Total, Valor Médio) usam `canViewClientFinancials`
- Botão "Eliminar" no menu só aparece se `canEditClients`
- Early return movido para depois de todos os hooks

---

## Comportamento Final

| Role | Ver Clientes | Criar Clientes | Editar Clientes | Ver Valores Financeiros |
|------|--------------|----------------|-----------------|------------------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Edição | ✅ (default) | ✅ (default) | ✅ (default) | ✅ (default) |
| Captação | ✅ (default) | ✅ (default) | ✅ (default) | ❌ (default) |
| Gestão | ✅ (default) | ❌ | ❌ | ❌ |
| Visualização | ✅ (default) | ❌ | ❌ | ❌ |

**Nota**: O admin do workspace pode personalizar através da página de Permissões.

---

## Ficheiros Modificados

| Ficheiro | Alteração |
|----------|-----------|
| Migration SQL | Política INSERT corrigida |
| `src/hooks/useFinancialPermissions.ts` | +3 permissões granulares |
| `src/pages/app/Clientes.tsx` | UI com permissões granulares |
