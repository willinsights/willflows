
# Plano: Corrigir Exibição de Valores de Colaboradores no Dashboard

## Problema Identificado

A lógica que determina se um utilizador é "colaborador" está incorrecta. Actualmente:

```typescript
// useFinancialPermissions.ts - Linha 86
const isCollaborator = !canViewAllProjects && role !== null;
```

Mas na base de dados, **todos os roles têm `visibility.all_projects = true`**:

| Role | visibility.all_projects | Resultado |
|------|------------------------|-----------|
| editor | `true` | `isCollaborator = false` ❌ |
| captacao | `true` | `isCollaborator = false` ❌ |
| freelancer | `true` | `isCollaborator = false` ❌ |
| visualizador | `true` | `isCollaborator = false` ❌ |

Isto significa que **nenhum colaborador vê o `CollaboratorForecastCards`** porque a condição no Dashboard:

```typescript
{isCollaborator && <CollaboratorForecastCards />}
```

Nunca é verdadeira (exceto para admin, que nunca seria colaborador de qualquer forma).

## Causa Raiz

A definição de "colaborador" para efeitos de dashboard financeiro deveria ser:
- **Alguém que não pode ver financeiros globais** (`!canViewAllFinancials`)
- **Mas pode ver os seus próprios ganhos** (`canViewOwnFinancials`)

Não deveria estar ligado à visibilidade de projectos (`visibility.all_projects`), que é uma permissão diferente.

## Solução

Corrigir a lógica no hook `useFinancialPermissions.ts`:

```typescript
// ANTES (Linha 86):
const isCollaborator = !canViewAllProjects && role !== null;

// DEPOIS:
// Um colaborador é alguém que:
// 1. Não tem acesso a financeiros globais
// 2. Mas pode ver os seus próprios ganhos
// 3. E tem um role atribuído
const isCollaborator = !canViewAllFinancials && canViewOwnFinancials && role !== null;
```

## Resultado Esperado

| Role | canViewAllFinancials | canViewOwnFinancials | isCollaborator | Vê |
|------|---------------------|---------------------|----------------|-----|
| admin | ✅ true | ✅ true | ❌ false | FinancialForecastCards |
| editor | ❌ false | ✅ true | ✅ **true** | CollaboratorForecastCards |
| captacao | ❌ false | ✅ true | ✅ **true** | CollaboratorForecastCards |
| freelancer | ❌ false | ✅ true | ✅ **true** | CollaboratorForecastCards |
| visualizador | ❌ false | ❌ false | ❌ false | Nenhum (sem acesso a ganhos) |

## Ficheiros a Modificar

1. **`src/hooks/useFinancialPermissions.ts`** - Linha 86:
   - Alterar a lógica de `isCollaborator` para usar `!canViewAllFinancials && canViewOwnFinancials`

## Secção Técnica

### Alteração Completa

```typescript
// src/hooks/useFinancialPermissions.ts - Linha 85-86

// ANTES:
// Identificar se é colaborador (não tem visão global)
const isCollaborator = !canViewAllProjects && role !== null;

// DEPOIS:
// Identificar se é colaborador (não tem visão financeira global, mas pode ver próprios ganhos)
const isCollaborator = !canViewAllFinancials && canViewOwnFinancials && role !== null;
```

### Impacto

Esta alteração afecta:
- Dashboard desktop (linha 226-228)
- Dashboard mobile (linha 159-161)
- Página de pagamentos (linha 533-542)

Todos estes locais verificam `isCollaborator` para decidir qual view mostrar.
