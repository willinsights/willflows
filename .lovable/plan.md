# Plano: Normalizar Roles e Corrigir Sistema de Permissões ✅ CONCLUÍDO

## Resumo Executivo

O sistema de roles foi **normalizado com sucesso**. Os novos roles técnicos são:

| Role Técnico | Label Padrão |
|--------------|--------------|
| `admin` | Admin |
| `edicao` | Edição |
| `captacao` | Captação |
| `gestao` | Gestão |
| `visualizacao` | Visualização |

---

## Alterações Realizadas ✅

### 1. Migração SQL ✅
- Enum `app_role` atualizado: `editor→edicao`, `freelancer→gestao`, `visualizador→visualizacao`
- Função `initialize_workspace_permissions` atualizada com novos roles
- Função `has_workspace_permission` recriada para garantir compatibilidade

### 2. Frontend - Contextos e Hooks ✅
- `src/contexts/WorkspaceContext.tsx` - VALID_ROLES e WorkspaceMember interface
- `src/hooks/useRoleLabels.ts` - DEFAULT_ROLE_LABELS, CUSTOMIZABLE_ROLES, INVITE_ROLES
- `src/hooks/useRolePermissions.ts` - ALL_ROLES, ROLE_LABELS, DEFAULT_PERMISSIONS
- `src/hooks/useCurrentWorkspace.ts` - userRole type e verificações

### 3. Frontend - Componentes ✅
- `src/components/team/TeamMemberRow.tsx` - roleColors
- `src/components/team/InviteMemberForm.tsx` - role default state
- `src/components/account/AccountTeamTab.tsx` - role default state
- `src/components/workspace/ActiveWorkspacesList.tsx` - WorkspaceWithRole interface e roleLabels
- `src/components/workspace/WorkspaceSelector.tsx` - roleLabels

### 4. Frontend - Páginas ✅
- `src/pages/app/Equipa.tsx` - ALL_ROLES
- `src/pages/app/Configuracoes.tsx` - roles array e getRoleBadgeVariant
- `src/pages/AcceptInvite.tsx` - getRoleLabel

### 5. Hooks com Verificações Hardcoded ✅
- `src/hooks/useDashboardMetrics.ts` - Atualizado `freelancer` → `gestao` para cálculo de ganhos próprios

### 6. Edge Functions ✅
- `supabase/functions/send-invitation-email/index.ts` - getRoleLabel
- `supabase/functions/create-test-accounts/index.ts` - roles de teste

---

## Matriz de Permissões

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

## Notas de Compatibilidade

1. **Migração automática de dados**: O `ALTER TYPE RENAME VALUE` migra automaticamente todos os dados existentes nas tabelas
2. **Cache local**: O sistema já tem proteção para limpar cache corrompido em `WorkspaceContext.tsx` (valida roles contra VALID_ROLES)
3. **Sessões ativas**: Utilizadores ativos terão roles atualizados automaticamente no próximo refresh
4. **Labels personalizados**: Workspaces com labels customizados mantêm funcionamento normal através da tabela `workspace_role_labels`
