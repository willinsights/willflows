

## Recriar pagina de permissoes: eliminar redundancias e adaptar ao sistema atual

### Problemas identificados

**Hooks duplicados:**
- `useWorkspacePermissions` e `useFinancialPermissions` fazem exatamente a mesma coisa (criam `hasPermission`, consultam a mesma tabela, retornam campos quase identicos). So `MobileBottomNav` usa `useWorkspacePermissions`; todo o resto usa `useFinancialPermissions`.
- Solucao: eliminar `useWorkspacePermissions` e migrar `MobileBottomNav` para usar `useFinancialPermissions`.

**Permissoes definidas mas nunca usadas no codigo:**
- `payments.view` — definido mas nunca verificado (so `payments.manage` e usado)
- `projects.delete` — definido mas nunca verificado (eliminacao de projetos nao e controlada por esta key)
- `team.invite` — definido mas nunca verificado
- `team.manage` — definido mas nunca verificado

Estas aparecem na UI de permissoes mas nao fazem nada. Confundem o admin.

**Categorias confusas na UI:**
- "Visibilidade" mistura acesso a paginas (`visibility.leads`, `visibility.contracts`) com filtragem de dados (`visibility.all_projects`)
- "Dashboard" e "Pagamentos" e "Relatorios" estao separados quando fazem parte do mesmo contexto (financeiro)
- "Clientes" tem 5 permissoes granulares que podiam ser agrupadas de forma mais clara

### Plano de implementacao

#### 1. Eliminar `useWorkspacePermissions.ts`
- Apagar o ficheiro `src/hooks/useWorkspacePermissions.ts`
- Em `src/components/layout/MobileBottomNav.tsx`: substituir `useWorkspacePermissions` por `useFinancialPermissions`
- Em `src/contexts/WorkspaceContext.tsx`: remover comentario referente ao hook

#### 2. Limpar `PERMISSION_DEFINITIONS` em `useRolePermissions.ts`
Remover permissoes que nao sao usadas em lado nenhum do codigo:
- `payments.view` (remover — so `payments.manage` importa)
- `projects.delete` (remover — nao e verificado)
- `team.invite` (remover — convites sao geridos apenas por admin)
- `team.manage` (remover — gestao de membros e admin-only)

Resultado: de 20 permissoes para **16 permissoes reais e usadas**.

#### 3. Reorganizar categorias para a UI
Nova organizacao mais clara e adaptada ao sistema:

| Categoria | Permissoes |
|-----------|-----------|
| **Projetos** | `projects.view`, `projects.create`, `projects.edit` |
| **Clientes** | `clients.view` (pagina), `clients.create`, `clients.edit`, `clients.view_contacts` (email/tel), `clients.view_financials` (valores) |
| **Paginas e Navegacao** | `visibility.leads`, `visibility.contracts`, `visibility.all_projects`, `team.view`, `reports.view` |
| **Financeiro e Dashboard** | `dashboard.view_global_financials`, `dashboard.view_own_earnings`, `dashboard.view_performance`, `payments.manage` |

#### 4. Reescrever `PermissionsMatrix.tsx`
- Usar as novas categorias reorganizadas
- Melhorar descricoes para serem mais claras (ex: "Ver pagina de Clientes" em vez de "Visualizar lista de clientes")
- Corrigir `colSpan` hardcoded (era `6`, deve ser dinamico: `2 + rolesWithoutAdmin.length`)
- Atualizar notas informativas no rodape para refletir o sistema atual
- Manter toda a logica existente de guardar/restaurar/labels

#### 5. Atualizar `DEFAULT_PERMISSIONS`
Remover as keys eliminadas dos defaults de cada role.

### Ficheiros a alterar

| Ficheiro | Acao |
|----------|------|
| `src/hooks/useWorkspacePermissions.ts` | Apagar |
| `src/hooks/useRolePermissions.ts` | Remover 4 permissoes nao usadas, reorganizar categorias |
| `src/hooks/useFinancialPermissions.ts` | Sem alteracoes (ja esta correto) |
| `src/components/settings/PermissionsMatrix.tsx` | Reescrever UI com novas categorias e descricoes |
| `src/components/layout/MobileBottomNav.tsx` | Migrar de `useWorkspacePermissions` para `useFinancialPermissions` |

### Sem migracao SQL necessaria
As permissoes removidas (`payments.view`, `projects.delete`, `team.invite`, `team.manage`) ficam na tabela `workspace_role_permissions` como registos orfaos — nao causam problemas. Opcionalmente podem ser limpas depois, mas nao e urgente.

### Resultado final
- 1 hook de permissoes em vez de 2 (elimina duplicacao)
- 16 permissoes reais em vez de 20 (elimina confusao)
- Categorias reorganizadas para fazer sentido no contexto do WillFlow
- Admin ve apenas toggles que realmente controlam algo no sistema
