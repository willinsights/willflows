
# Plano: Corrigir Valores de Colaboradores no Dashboard

## Problemas Identificados

### Problema 1: Campo `project_id` em falta na query

A query do hook `useCollaboratorForecast` não inclui o campo `project_id`:

```typescript
// Linha 51-53 - SELECT actual
.select(`
  id, payment_amount, payment_status, phase,
  projects!inner(delivery_date, shoot_date, is_delivered, workspace_id)
`)
```

Mas na linha 89, o código tenta usar `payment.project_id`:

```typescript
if (!projectIds.has(payment.project_id)) { // ← undefined!
  projectIds.add(payment.project_id);
  projectCount++;
}
```

### Problema 2: Projectos sem datas são ignorados

Na linha 72, se o projecto não tiver `delivery_date` nem `shoot_date`, o pagamento é completamente ignorado:

```typescript
const anchorDate = project.delivery_date || project.shoot_date;
if (!anchorDate) return; // ← 46% dos pagamentos ignorados!
```

**Impacto**: De 89 pagamentos na base de dados, **41 (46%) são ignorados** porque os projectos não têm datas definidas.

---

## Solução

### Alteração no ficheiro `src/hooks/useCollaboratorForecast.ts`

#### 1. Adicionar `project_id` ao SELECT

```typescript
const { data: teamPayments } = await supabase
  .from('project_team')
  .select(`
    id, project_id, payment_amount, payment_status, phase,
    projects!inner(delivery_date, shoot_date, is_delivered, workspace_id, created_at)
  `)
  .eq('user_id', user.id)
  .eq('projects.workspace_id', currentWorkspace.id);
```

#### 2. Usar `created_at` como fallback para datas

```typescript
teamPayments?.forEach((payment: any) => {
  const project = payment.projects;
  // Determinar data âncora (delivery_date → shoot_date → created_at)
  const anchorDate = project.delivery_date || project.shoot_date || project.created_at;
  if (!anchorDate) return;

  // Extrair apenas a data se for timestamp completo
  const dateOnly = anchorDate.split('T')[0]; // '2026-01-24 14:37:46' → '2026-01-24'
  const projectMonth = format(parseISO(dateOnly), 'yyyy-MM');
  // ... resto da lógica
});
```

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Pagamentos com datas | ✅ Processados | ✅ Processados |
| Pagamentos sem datas | ❌ Ignorados (46%) | ✅ Usa `created_at` |
| Contagem de projectos | ❌ Sempre 0 | ✅ Conta correctamente |
| Totais financeiros | ❌ Incompletos | ✅ Valores correctos |

---

## Ficheiros a Modificar

1. **`src/hooks/useCollaboratorForecast.ts`**:
   - Adicionar `project_id` ao SELECT
   - Adicionar `created_at` ao SELECT de projects
   - Usar `created_at` como fallback para projectos sem datas

---

## Secção Técnica

### Alteração Completa da Query

```typescript
// Linha 49-56 - ANTES
const { data: teamPayments } = await supabase
  .from('project_team')
  .select(`
    id, payment_amount, payment_status, phase,
    projects!inner(delivery_date, shoot_date, is_delivered, workspace_id)
  `)
  .eq('user_id', user.id)
  .eq('projects.workspace_id', currentWorkspace.id);

// Linha 49-56 - DEPOIS
const { data: teamPayments } = await supabase
  .from('project_team')
  .select(`
    id, project_id, payment_amount, payment_status, phase,
    projects!inner(delivery_date, shoot_date, is_delivered, workspace_id, created_at)
  `)
  .eq('user_id', user.id)
  .eq('projects.workspace_id', currentWorkspace.id);
```

### Alteração da Lógica de Data Âncora

```typescript
// Linha 70-74 - ANTES
const anchorDate = project.delivery_date || project.shoot_date;
if (!anchorDate) return;

const projectMonth = format(parseISO(anchorDate), 'yyyy-MM');

// Linha 70-77 - DEPOIS
const anchorDate = project.delivery_date || project.shoot_date || project.created_at;
if (!anchorDate) return;

// Normalizar para data apenas (created_at inclui timestamp)
const dateString = typeof anchorDate === 'string' && anchorDate.includes('T') 
  ? anchorDate.split('T')[0] 
  : anchorDate;
const projectMonth = format(parseISO(dateString), 'yyyy-MM');
```

### Aplicar Mesma Correção ao Mobile

O componente `MobileCollaboratorForecast.tsx` usa o mesmo hook, portanto beneficia automaticamente da correcção.
