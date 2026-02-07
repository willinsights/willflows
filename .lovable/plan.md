

## Separar "acesso a pagina Clientes" de "ver dados de contacto"

### Problema Atual
A permissao `clients.view` controla **duas coisas ao mesmo tempo**:
1. Acesso a pagina "/app/clientes" (sidebar + rota)
2. Visibilidade de emails e telefones do cliente (`canViewClientContacts`)

Quando desativas `clients.view` para um perfil, esse utilizador perde acesso a pagina **e tambem** deixa de ver emails/telefones nos detalhes. Mas o **nome do cliente** ja aparece corretamente em projetos, tarefas, calendario e relatorios (via join `clients(name)`) -- isso nao e afetado e nao precisa mudar.

### O que vai mudar

**1. Nova permissao: `clients.view_contacts`**

Criar uma nova permissao granular que controla especificamente a visibilidade de email, telefone, NIF e morada do cliente. Separada da permissao de acesso a pagina.

- Adicionar a `PERMISSION_DEFINITIONS` em `useRolePermissions.ts`
- Adicionar aos defaults: admin e edicao terao ativa por defeito; captacao, gestao e visualizacao terao desativada
- Migrar a tabela `workspace_role_permissions` para incluir a nova permissao nos workspaces existentes

**2. Desacoplar `canViewClientContacts`**

No hook `useFinancialPermissions.ts`, linha 88:
- **Antes:** `canViewClientContacts = hasPermission('clients.view')`
- **Depois:** `canViewClientContacts = hasPermission('clients.view_contacts')`

Isto significa que um utilizador pode:
- Ter `clients.view` desativado (nao ve a pagina Clientes no menu)
- Mas continuar a ver **nomes** de clientes em projetos, tarefas, kanban, calendario, relatorios e exports
- E **nao ver** emails, telefones e dados sensiveis (controlado por `clients.view_contacts`)

**3. Onde os dados de contacto sao protegidos (ja existente)**

O componente `ClientDetailsModal.tsx` ja usa `canViewClientContacts` para esconder email e telefone -- isso continua a funcionar. Os locais que mostram apenas `client.name` (selects em projetos, filtros no kanban, colunas em relatorios, calendario) nao sao afetados.

### Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/hooks/useRolePermissions.ts` | Adicionar `clients.view_contacts` a `PERMISSION_DEFINITIONS` e `DEFAULT_PERMISSIONS` |
| `src/hooks/useFinancialPermissions.ts` | Linha 88: usar `clients.view_contacts` em vez de `clients.view` |
| Migracao SQL | Inserir a nova permissao em workspaces existentes com valores default |

### Migracao SQL

```sql
-- Inserir nova permissao para todos os workspaces existentes
INSERT INTO workspace_role_permissions (workspace_id, role, permission_key, enabled)
SELECT ws.id, r.role, 'clients.view_contacts', 
  CASE 
    WHEN r.role IN ('admin', 'edicao') THEN true
    ELSE false
  END
FROM workspaces ws
CROSS JOIN (VALUES ('edicao'::app_role), ('captacao'::app_role), ('gestao'::app_role), ('visualizacao'::app_role)) AS r(role)
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_role_permissions wrp 
  WHERE wrp.workspace_id = ws.id AND wrp.role = r.role AND wrp.permission_key = 'clients.view_contacts'
);
```

### Resultado

- Desativar `clients.view` = esconde a pagina Clientes do menu lateral. O nome do cliente continua visivel em projetos, tarefas, kanban, calendario, relatorios e exports.
- Desativar `clients.view_contacts` = esconde email, telefone e dados sensiveis, mesmo que o utilizador tenha acesso a pagina.
- Admin configura ambas independentemente no painel de permissoes.
