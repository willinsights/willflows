

# Plano: Corrigir Permissões de Criação de Projetos para Visualizador e Freelancer

## Problema Identificado

A política RLS (Row-Level Security) para **INSERT** na tabela `projects` está codificada de forma rígida:

```sql
-- Política actual (bloqueadora):
get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin', 'editor', 'captacao'])
```

Isto bloqueia **freelancer** e **visualizador** ao nível da base de dados, **independentemente** das permissões configuradas em `workspace_role_permissions`.

Quando o admin activa `projects.create = true` para estas roles, a configuração é guardada mas não tem efeito porque o RLS ignora-a.

---

## Solução

Criar uma **função de verificação dinâmica** que consulta a tabela `workspace_role_permissions` e actualizar a policy RLS para usá-la.

---

## Alterações Necessárias

### 1. Criar Função `has_workspace_permission`

```sql
CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  _user_id uuid,
  _workspace_id uuid,
  _permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Admin tem sempre todas as permissões
      WHEN get_workspace_role(_user_id, _workspace_id) = 'admin' THEN true
      -- Verificar permissão dinâmica
      ELSE COALESCE(
        (SELECT enabled 
         FROM workspace_role_permissions 
         WHERE workspace_id = _workspace_id 
           AND role = get_workspace_role(_user_id, _workspace_id)
           AND permission_key = _permission_key),
        false
      )
    END
$$;
```

### 2. Actualizar Policy RLS de INSERT

```sql
-- Remover policy antiga
DROP POLICY IF EXISTS "Members with editing rights can create projects" 
  ON public.projects;

-- Criar nova policy dinâmica
CREATE POLICY "Members with create permission can create projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.create')
  );
```

### 3. Actualizar Policy RLS de UPDATE

```sql
DROP POLICY IF EXISTS "Members with editing rights can update projects" 
  ON public.projects;

CREATE POLICY "Members with edit permission can update projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
  );
```

### 4. Actualizar Policy RLS de DELETE

```sql
DROP POLICY IF EXISTS "Admins can delete projects" 
  ON public.projects;

CREATE POLICY "Members with delete permission can delete projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.delete')
  );
```

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Freelancer com `projects.create = true` | ❌ Bloqueado | ✅ Pode criar |
| Visualizador com `projects.create = true` | ❌ Bloqueado | ✅ Pode criar |
| Freelancer com `projects.create = false` | ❌ Bloqueado | ❌ Bloqueado |
| Admin | ✅ Sempre pode | ✅ Sempre pode |

---

## Secção Técnica

### Migração SQL Completa

```sql
-- 1. Criar função de verificação dinâmica
CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  _user_id uuid,
  _workspace_id uuid,
  _permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN get_workspace_role(_user_id, _workspace_id) = 'admin' THEN true
      ELSE COALESCE(
        (SELECT enabled 
         FROM workspace_role_permissions 
         WHERE workspace_id = _workspace_id 
           AND role = get_workspace_role(_user_id, _workspace_id)
           AND permission_key = _permission_key),
        false
      )
    END
$$;

-- 2. Actualizar policy INSERT
DROP POLICY IF EXISTS "Members with editing rights can create projects" 
  ON public.projects;

CREATE POLICY "Members with create permission can create projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.create')
  );

-- 3. Actualizar policy UPDATE
DROP POLICY IF EXISTS "Members with editing rights can update projects" 
  ON public.projects;

CREATE POLICY "Members with edit permission can update projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
  );

-- 4. Actualizar policy DELETE
DROP POLICY IF EXISTS "Admins can delete projects" 
  ON public.projects;

CREATE POLICY "Members with delete permission can delete projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.delete')
  );
```

### Considerações de Performance

A função `has_workspace_permission` usa `STABLE` e `SECURITY DEFINER`:
- `STABLE`: Indica que a função retorna o mesmo resultado para os mesmos argumentos dentro de uma transação
- `SECURITY DEFINER`: Executa com privilégios do owner, permitindo ler `workspace_role_permissions` sem recursão RLS

### Verificação Pós-Implementação

Após aplicar a migração, testar:
1. Login como visualizador/freelancer com permissão `projects.create = true`
2. Tentar criar um projecto
3. Confirmar que o projecto é criado com sucesso

