

# Auditoria Completa: Verificações Hardcoded de Roles

## Resumo Executivo

Após análise extensiva do código frontend e das políticas RLS da base de dados, identifiquei **múltiplas áreas** onde as permissões são verificadas de forma hardcoded (rígida) em vez de consultarem a tabela `workspace_role_permissions`. Isto impede que as configurações feitas pelo admin tenham efeito.

---

## Problemas Identificados

### A. Verificações Hardcoded no Frontend

| Ficheiro | Linha | Problema | Impacto |
|----------|-------|----------|---------|
| `WorkspaceContext.tsx` | 573 | `canEdit = ['admin', 'editor', 'captacao'].includes(...)` | Freelancer/Visualizador nunca podem editar |
| `useCurrentWorkspace.ts` | 87-89 | `canManageTeam`, `canManagePayments`, `canViewReports` hardcoded | Permissões não respeitam configuração |
| `useConversations.ts` | 36, 72 | `role === 'freelancer' \|\| role === 'visualizador'` | Filtragem de canais ignora permissões |
| `useFinancialPermissions.ts` | 75, 82-83 | Verificações mistas com `role === 'admin'` | Contactos sempre restritos a admin |
| `useFilteredProjects.ts` | 86 | `userRole === 'admin'` redundante | Duplicação de lógica |

### B. Políticas RLS Hardcoded na Base de Dados

| Tabela | Policy | Roles Hardcoded | Deveria Usar |
|--------|--------|-----------------|--------------|
| `activity_log` | INSERT | `admin, editor` | Permissão dinâmica |
| `categories` | ALL | `admin, editor` | `has_workspace_permission` |
| `clients` | SELECT | `admin, editor, captacao` | `clients.view` |
| `clients` | UPDATE | `admin, editor, captacao` | `clients.edit` |
| `client_communications` | ALL | `admin, editor` | `clients.edit` |
| `client_notes` | ALL | `admin, editor` | `clients.edit` |
| `contracts` | ALL | `admin, editor` | `visibility.contracts` |
| `contract_templates` | ALL | `admin, editor` | `visibility.contracts` |
| `video_structures` | INSERT | `admin, editor, captacao` | `projects.edit` |
| `video_structure_templates` | INSERT | `admin, editor, captacao` | `projects.edit` |

---

## Plano de Correcção

### Fase 1: Corrigir Frontend (Verificações Hardcoded)

#### 1.1 WorkspaceContext.tsx

Actualizar `canEdit` para usar permissão dinâmica:

```typescript
// ANTES:
const canEdit = ['admin', 'editor', 'captacao'].includes(membership?.role || '');

// DEPOIS:
// canEdit será calculado pelo hook useWorkspacePermissions
// Remover esta lógica hardcoded e delegar ao hook centralizado
```

#### 1.2 useCurrentWorkspace.ts

Substituir verificações rígidas por consulta ao sistema de permissões:

```typescript
// ANTES:
const canManageTeam = ['admin', 'editor'].includes(userRole || '');
const canManagePayments = ['admin', 'editor'].includes(userRole || '');
const canViewReports = ['admin', 'editor', 'visualizador'].includes(userRole || '');

// DEPOIS:
// Remover estas verificações - devem vir de useWorkspacePermissions
// ou usar hasPermission('team.manage'), hasPermission('payments.manage'), etc.
```

#### 1.3 useConversations.ts

Remover filtragem baseada em role hardcoded:

```typescript
// ANTES:
const isRestrictedRole = membership?.role === 'freelancer' || membership?.role === 'visualizador';

// DEPOIS:
// Usar permissão dinâmica: !hasPermission('visibility.all_projects')
```

#### 1.4 useFinancialPermissions.ts

Corrigir verificações mistas:

```typescript
// ANTES:
const canViewLeads = hasPermission('visibility.leads') || (hasPermission('clients.view') && role === 'admin');
const canViewClientContacts = role === 'admin';
const canViewTeamContacts = role === 'admin';

// DEPOIS:
const canViewLeads = hasPermission('visibility.leads');
const canViewClientContacts = hasPermission('clients.view_contacts'); // Nova permissão
const canViewTeamContacts = hasPermission('team.view_contacts'); // Nova permissão
```

### Fase 2: Actualizar Políticas RLS

#### 2.1 Clientes e Relacionados

```sql
-- clients - SELECT
DROP POLICY IF EXISTS "Admin, editor, captacao can view clients" ON clients;
CREATE POLICY "Members with view permission can view clients"
  ON clients FOR SELECT TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.view'));

-- clients - UPDATE
DROP POLICY IF EXISTS "Members with editing rights can update lead status" ON clients;
CREATE POLICY "Members with edit permission can update clients"
  ON clients FOR UPDATE TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));

-- clients - INSERT/DELETE (admin, editor)
DROP POLICY IF EXISTS "Admins and editors can manage clients" ON clients;
CREATE POLICY "Members with create permission can create clients"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'clients.create'));

CREATE POLICY "Members with delete permission can delete clients"
  ON clients FOR DELETE TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.delete'));
```

#### 2.2 Comunicações e Notas de Clientes

```sql
-- client_communications
DROP POLICY IF EXISTS "Members with editing rights can manage communications" ON client_communications;
CREATE POLICY "Members with client edit permission can manage communications"
  ON client_communications FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));

-- client_notes
DROP POLICY IF EXISTS "Members with editing rights can manage notes" ON client_notes;
CREATE POLICY "Members with client edit permission can manage notes"
  ON client_notes FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));
```

#### 2.3 Contratos

```sql
-- contracts
DROP POLICY IF EXISTS "Admin and editor can manage contracts" ON contracts;
CREATE POLICY "Members with contract permission can manage contracts"
  ON contracts FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'visibility.contracts'));

-- contract_templates
DROP POLICY IF EXISTS "Admin and editor can manage templates" ON contract_templates;
CREATE POLICY "Members with contract permission can manage templates"
  ON contract_templates FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'visibility.contracts'));
```

#### 2.4 Categorias

```sql
DROP POLICY IF EXISTS "Admins and editors can manage categories" ON categories;
CREATE POLICY "Members with client edit permission can manage categories"
  ON categories FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));
```

#### 2.5 Video Structures

```sql
-- video_structures
DROP POLICY IF EXISTS "Members with editing rights can create video structures" ON video_structures;
CREATE POLICY "Members with project edit permission can create video structures"
  ON video_structures FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'));

-- video_structure_templates
DROP POLICY IF EXISTS "Members with editing rights can create templates" ON video_structure_templates;
CREATE POLICY "Members with project edit permission can create templates"
  ON video_structure_templates FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'));
```

#### 2.6 Activity Log

```sql
DROP POLICY IF EXISTS "Admin and editor can insert activity log" ON activity_log;
CREATE POLICY "Members with project edit permission can insert activity log"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'));
```

### Fase 3: Adicionar Novas Permissões (Opcional)

Para maior granularidade, adicionar novas permission keys:

```sql
-- Adicionar novas definições de permissão
INSERT INTO workspace_role_permissions (workspace_id, role, permission_key, enabled)
SELECT 
  id as workspace_id,
  unnest(ARRAY['admin', 'editor', 'captacao', 'freelancer', 'visualizador']::app_role[]) as role,
  unnest(ARRAY['clients.delete', 'clients.view_contacts', 'team.view_contacts']) as permission_key,
  CASE 
    WHEN unnest = 'admin' THEN true
    ELSE false
  END as enabled
FROM workspaces
ON CONFLICT DO NOTHING;
```

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Freelancer com `clients.view = true` ver clientes | ❌ Bloqueado | ✅ Pode ver |
| Visualizador com `clients.edit = true` editar cliente | ❌ Bloqueado | ✅ Pode editar |
| Freelancer com `visibility.contracts = true` gerir contratos | ❌ Bloqueado | ✅ Pode gerir |
| Configurações do admin | Ignoradas | ✅ Aplicadas |

---

## Secção Técnica

### Ordem de Execução

1. **Migração SQL** - Actualizar políticas RLS (prioridade alta)
2. **Frontend** - Actualizar hooks hardcoded
3. **Testes** - Verificar com utilizadores de diferentes roles

### Ficheiros a Modificar

**Base de Dados (1 migração SQL):**
- Actualizar ~15 políticas RLS em 10 tabelas

**Frontend (5 ficheiros):**
- `src/contexts/WorkspaceContext.tsx`
- `src/hooks/useCurrentWorkspace.ts`
- `src/hooks/useConversations.ts`
- `src/hooks/useFinancialPermissions.ts`
- `src/hooks/useFilteredProjects.ts`

### Riscos e Mitigação

- **Risco**: Quebrar funcionalidade existente para roles actuais
- **Mitigação**: As permissões por defeito mantêm o comportamento actual; apenas novas configurações terão efeito

