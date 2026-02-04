
# Plano: Normalizar Roles e Corrigir Sistema de Permissões

## Resumo Executivo

O objetivo é padronizar os roles técnicos do sistema para:

| Role Atual | Novo Role | Label Padrão |
|------------|-----------|--------------|
| `admin` | `admin` | Admin |
| `editor` | `edicao` | Edição |
| `captacao` | `captacao` | Captação |
| `freelancer` | `gestao` | Gestão |
| `visualizador` | `visualizacao` | Visualização |

Esta alteração envolve:
1. Migração do enum `app_role` no Postgres
2. Atualização de todas as referências no código TypeScript
3. Correção de verificações hardcoded para usar permissões dinâmicas
4. Atualização das funções SQL e RLS policies

---

## Fase 1: Migração do Banco de Dados

### 1.1 Alterar o Enum `app_role`

```sql
-- Renomear valores do enum (Postgres 10+)
ALTER TYPE app_role RENAME VALUE 'editor' TO 'edicao';
ALTER TYPE app_role RENAME VALUE 'freelancer' TO 'gestao';
ALTER TYPE app_role RENAME VALUE 'visualizador' TO 'visualizacao';
```

### 1.2 Atualizar Funções SQL

A função `initialize_workspace_permissions` precisa ser atualizada:

```sql
CREATE OR REPLACE FUNCTION initialize_workspace_permissions(_workspace_id uuid)
RETURNS void AS $$
DECLARE
  permission_keys text[] := ARRAY[...];
  roles app_role[] := ARRAY['admin', 'edicao', 'captacao', 'gestao', 'visualizacao']::app_role[];
  -- resto da lógica...
```

### 1.3 Atualizar Labels Padrão

A tabela `workspace_role_labels` mantém os labels personalizáveis. Os defaults no código serão:

```typescript
export const DEFAULT_ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  edicao: 'Edição',
  captacao: 'Captação',
  gestao: 'Gestão',
  visualizacao: 'Visualização',
};
```

---

## Fase 2: Atualização do Frontend

### 2.1 Ficheiros a Modificar (Tipos e Constantes)

| Ficheiro | Alteração |
|----------|-----------|
| `src/contexts/WorkspaceContext.tsx` | Atualizar `VALID_ROLES` e interface `WorkspaceMember` |
| `src/hooks/useRoleLabels.ts` | Atualizar `DEFAULT_ROLE_LABELS`, `CUSTOMIZABLE_ROLES`, `INVITE_ROLES` |
| `src/hooks/useRolePermissions.ts` | Atualizar `ALL_ROLES`, `ROLE_LABELS`, `DEFAULT_PERMISSIONS` |
| `src/hooks/useCurrentWorkspace.ts` | Atualizar tipo `userRole` e verificações hardcoded |

### 2.2 Verificações Hardcoded a Corrigir

Ficheiros com verificações diretas de role que devem usar permissões dinâmicas:

| Ficheiro | Linha | Problema | Solução |
|----------|-------|----------|---------|
| `src/contexts/WorkspaceContext.tsx` | 613 | `canEdit` hardcoded | Manter para retrocompatibilidade, mas documentar uso de `useWorkspacePermissions` |
| `src/hooks/useCurrentWorkspace.ts` | 86-89 | `isEditor`, `canManageTeam` hardcoded | Substituir por `hasPermission()` |
| `src/hooks/useDashboardMetrics.ts` | 278 | `role === 'freelancer'` | Substituir por verificação de `canViewOwnFinancials` |
| `src/pages/app/Faturacao.tsx` | 69 | `isAdmin` local | Usar `useWorkspace().isAdmin` |
| `src/components/dashboard/MonthlyGoalsCard.tsx` | 39 | `userRole === 'admin'` | Já usa `userRole`, mas deve verificar permissão dinâmica |

### 2.3 Ficheiros com Referências a Roles Antigos

Todos os ficheiros que mencionam `'editor'`, `'freelancer'`, `'visualizador'` precisam ser atualizados:

```text
src/pages/AcceptInvite.tsx
src/pages/app/Equipa.tsx
src/components/team/TeamMemberRow.tsx
src/components/workspace/WorkspaceSelector.tsx
supabase/functions/send-invitation-email/index.ts
supabase/functions/create-test-accounts/index.ts
... (37 ficheiros no total)
```

---

## Fase 3: Mapeamento de Permissões

### 3.1 Permissões Default por Role

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               MATRIZ DE PERMISSÕES                                   │
├──────────────────────────────┬───────┬────────┬─────────┬────────┬──────────────────┤
│ Permissão                    │ admin │ edicao │ captacao│ gestao │ visualizacao     │
├──────────────────────────────┼───────┼────────┼─────────┼────────┼──────────────────┤
│ projects.view                │   ✓   │   ✓    │    ✓    │   ✓    │        ✓         │
│ projects.create              │   ✓   │   ✓    │         │        │                  │
│ projects.edit                │   ✓   │   ✓    │    ✓    │        │                  │
│ projects.delete              │   ✓   │        │         │        │                  │
├──────────────────────────────┼───────┼────────┼─────────┼────────┼──────────────────┤
│ clients.view                 │   ✓   │   ✓    │    ✓    │        │        ✓         │
│ clients.create               │   ✓   │   ✓    │    ✓    │        │                  │
│ clients.edit                 │   ✓   │   ✓    │    ✓    │        │                  │
│ clients.view_financials      │   ✓   │   ✓    │         │        │                  │
├──────────────────────────────┼───────┼────────┼─────────┼────────┼──────────────────┤
│ team.view                    │   ✓   │   ✓    │    ✓    │   ✓    │        ✓         │
│ team.invite                  │   ✓   │        │         │        │                  │
│ team.manage                  │   ✓   │        │         │        │                  │
├──────────────────────────────┼───────┼────────┼─────────┼────────┼──────────────────┤
│ payments.view                │   ✓   │   ✓    │         │        │                  │
│ payments.manage              │   ✓   │   ✓    │         │        │                  │
├──────────────────────────────┼───────┼────────┼─────────┼────────┼──────────────────┤
│ reports.view                 │   ✓   │   ✓    │         │        │        ✓         │
├──────────────────────────────┼───────┼────────┼─────────┼────────┼──────────────────┤
│ visibility.leads             │   ✓   │   ✓    │    ✓    │        │                  │
│ visibility.contracts         │   ✓   │   ✓    │         │        │                  │
│ visibility.all_projects      │   ✓   │   ✓    │         │        │                  │
├──────────────────────────────┼───────┼────────┼─────────┼────────┼──────────────────┤
│ dashboard.view_global_fin    │   ✓   │   ✓    │         │        │                  │
│ dashboard.view_own_earnings  │   ✓   │   ✓    │    ✓    │   ✓    │        ✓         │
│ dashboard.view_performance   │   ✓   │   ✓    │         │        │        ✓         │
└──────────────────────────────┴───────┴────────┴─────────┴────────┴──────────────────┘
```

---

## Fase 4: Correção das Verificações Hardcoded

### 4.1 useCurrentWorkspace.ts

**Antes:**
```typescript
const isEditor = userRole === 'editor';
const canManageTeam = ['admin', 'editor'].includes(userRole || '');
const canManagePayments = ['admin', 'editor'].includes(userRole || '');
const canViewReports = ['admin', 'editor', 'visualizador'].includes(userRole || '');
```

**Depois:**
```typescript
// Importar useWorkspacePermissions ou receber como prop
const isEditor = userRole === 'edicao';
// Nota: Idealmente estas flags devem vir de permissões dinâmicas
// Manter por retrocompatibilidade, mas marcar como deprecated
```

### 4.2 useDashboardMetrics.ts (Linha 278)

**Antes:**
```typescript
if (user?.id && membership?.role === 'freelancer') {
```

**Depois:**
```typescript
// Usar flag de permissão em vez de role específico
if (user?.id && !canViewGlobalFinancials && canViewOwnFinancials) {
```

---

## Fase 5: Ordem de Execução

1. **Migração SQL** - Alterar enum e funções
2. **Regenerar tipos** - `types.ts` será atualizado automaticamente
3. **Atualizar constantes** - `VALID_ROLES`, `DEFAULT_ROLE_LABELS`, etc.
4. **Atualizar hooks** - `useRolePermissions`, `useRoleLabels`, `useCurrentWorkspace`
5. **Corrigir verificações hardcoded** - Usar permissões dinâmicas
6. **Atualizar edge functions** - Labels de email, etc.
7. **Testar** - Verificar que colaboradores acedem corretamente

---

## Secção Técnica

### Impacto nas Tabelas

| Tabela | Coluna | Impacto |
|--------|--------|---------|
| `workspace_members` | `role` | Valores migrados automaticamente pelo ALTER TYPE |
| `workspace_invitations` | `role` | Valores migrados automaticamente |
| `workspace_role_permissions` | `role` | Valores migrados automaticamente |
| `workspace_role_labels` | `role` | Valores migrados automaticamente |
| `pending_invitations` | `role` | Valores migrados automaticamente |

### Funções SQL a Atualizar

1. `initialize_workspace_permissions` - Lista de roles
2. `has_workspace_permission` - Já genérica, não precisa alteração
3. `get_workspace_role` - Já genérica, não precisa alteração
4. `is_workspace_admin` - Já verifica `'admin'`, não precisa alteração

### RLS Policies

As políticas RLS que usam `get_workspace_role()` com comparações explícitas precisam atualização:

```sql
-- Antes
get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role])

-- Depois
get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'edicao'::app_role])
```

Políticas afetadas em ~18 ficheiros de migração (já aplicadas), mas futuras policies devem usar `has_workspace_permission()`.

### Retrocompatibilidade

Para evitar quebrar sessões ativas:
1. A migração do enum é instantânea e preserva dados
2. O frontend deve limpar cache local se detetar role inválido (já implementado)
3. Utilizadores ativos terão roles atualizados no próximo login

---

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|----------|------|
| Nova migração SQL | Criar - Alterar enum e funções |
| `src/contexts/WorkspaceContext.tsx` | Modificar - Atualizar VALID_ROLES, tipos |
| `src/hooks/useRoleLabels.ts` | Modificar - Atualizar DEFAULT_ROLE_LABELS |
| `src/hooks/useRolePermissions.ts` | Modificar - Atualizar ALL_ROLES, ROLE_LABELS, DEFAULT_PERMISSIONS |
| `src/hooks/useCurrentWorkspace.ts` | Modificar - Atualizar tipo userRole, remover hardcoded |
| `src/hooks/useDashboardMetrics.ts` | Modificar - Usar permissão em vez de role |
| `src/pages/AcceptInvite.tsx` | Modificar - Atualizar labels |
| `src/pages/app/Equipa.tsx` | Modificar - Atualizar ALL_ROLES |
| `src/components/team/TeamMemberRow.tsx` | Modificar - Atualizar roleColors |
| `src/components/workspace/WorkspaceSelector.tsx` | Modificar - Atualizar roleLabels |
| `supabase/functions/send-invitation-email/index.ts` | Modificar - Atualizar roleLabels |
| `supabase/functions/create-test-accounts/index.ts` | Modificar - Atualizar roles |
