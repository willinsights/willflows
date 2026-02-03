

# Plano: Actualizar RLS de Tabelas Relacionadas com Projectos

## Problema Identificado

Mesmo após corrigir a tabela `projects`, existem **múltiplas tabelas relacionadas** que ainda usam verificações hardcoded de roles. Isto impede colaboradores (freelancer/visualizador) de:

- Adicionar/editar links de media
- Gerir equipa do projecto
- Criar/editar tarefas
- Atribuir membros a tarefas
- Gerir checklists
- Criar eventos de calendário

---

## Tabelas a Actualizar

| Tabela | Policy Actual | Nova Lógica |
|--------|--------------|-------------|
| `project_media_links` | `admin, editor, captacao` | Quem pode editar projecto pode gerir links |
| `project_team` | `admin, editor` | Quem pode editar projecto pode gerir equipa |
| `tasks` | `admin, editor, captacao` | Quem pode editar projecto pode gerir tarefas |
| `task_assignees` | `admin, editor, captacao` | Quem pode editar projecto pode atribuir |
| `task_checklists` | `admin, editor, captacao` + assignees | Manter assignees + permissão dinâmica |
| `calendar_events` | `admin, editor, captacao` | Quem pode editar projecto pode criar eventos |

---

## Lógica de Permissão

Um utilizador pode gerir recursos de um projecto se:
1. Tem `projects.edit` = true no workspace, **OU**
2. É assignee da tarefa específica (para `task_checklists`)

---

## Alterações Necessárias

### 1. Criar Função Helper para Projectos

Para evitar repetição, criar uma função que verifica se o utilizador pode editar um projecto específico:

```sql
CREATE OR REPLACE FUNCTION public.can_edit_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = _project_id
      AND has_workspace_permission(_user_id, p.workspace_id, 'projects.edit')
  )
$$;
```

### 2. Actualizar `project_media_links`

```sql
DROP POLICY IF EXISTS "Members with editing rights can manage project media links" 
  ON project_media_links;

CREATE POLICY "Members with edit permission can manage project media links"
  ON project_media_links FOR ALL TO authenticated
  USING (can_edit_project(auth.uid(), project_id));
```

### 3. Actualizar `project_team`

```sql
DROP POLICY IF EXISTS "Members with editing rights can manage project team" 
  ON project_team;

CREATE POLICY "Members with edit permission can manage project team"
  ON project_team FOR ALL TO authenticated
  USING (can_edit_project(auth.uid(), project_id));
```

### 4. Actualizar `tasks`

```sql
-- INSERT
DROP POLICY IF EXISTS "Members with editing rights can create tasks" ON tasks;

CREATE POLICY "Members with edit permission can create tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
    OR EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = tasks.project_id 
      AND has_workspace_permission(auth.uid(), p.workspace_id, 'projects.edit')
    )
  );

-- UPDATE (manter assignees)
DROP POLICY IF EXISTS "Members with editing rights can update tasks" ON tasks;

CREATE POLICY "Members with edit permission can update tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
    OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = id AND ta.user_id = auth.uid())
  );
```

### 5. Actualizar `task_assignees`

```sql
DROP POLICY IF EXISTS "Members with editing rights can manage task assignees" 
  ON task_assignees;

CREATE POLICY "Members with edit permission can manage task assignees"
  ON task_assignees FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND has_workspace_permission(auth.uid(), t.workspace_id, 'projects.edit')
    )
  );
```

### 6. Actualizar `task_checklists`

```sql
DROP POLICY IF EXISTS "Assignees and editors can manage checklists" 
  ON task_checklists;

CREATE POLICY "Assignees and editors can manage checklists"
  ON task_checklists FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_checklists.task_id
      AND (
        has_workspace_permission(auth.uid(), t.workspace_id, 'projects.edit')
        OR EXISTS (
          SELECT 1 FROM task_assignees ta 
          WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
        )
      )
    )
  );
```

### 7. Actualizar `calendar_events`

```sql
DROP POLICY IF EXISTS "Members with editing rights can create events" 
  ON calendar_events;

CREATE POLICY "Members with edit permission can create events"
  ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
  );
```

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Freelancer com `projects.edit = true` adicionar link | ❌ Bloqueado | ✅ Pode adicionar |
| Freelancer atribuído a tarefa editar checklist | ❌/✅ Incerto | ✅ Pode editar |
| Visualizador com `projects.edit = true` criar tarefa | ❌ Bloqueado | ✅ Pode criar |
| Admin | ✅ Sempre pode | ✅ Sempre pode |

---

## Secção Técnica

### Migração SQL Completa

Uma única migração que:
1. Cria função `can_edit_project` 
2. Actualiza 7 policies em 6 tabelas
3. Mantém lógica de assignees onde aplicável

### Considerações de Performance

- `can_edit_project` usa `SECURITY DEFINER` para evitar recursão RLS
- Todas as funções são `STABLE` para caching dentro da transação
- Índices existentes em `project_id` optimizam as queries

### Ordem de Execução

1. Criar função `can_edit_project`
2. Actualizar policies uma a uma (DROP + CREATE)

