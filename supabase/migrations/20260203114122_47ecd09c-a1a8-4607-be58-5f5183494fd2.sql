-- 1. Criar função de verificação dinâmica de permissões
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
      -- Verificar permissão dinâmica na tabela workspace_role_permissions
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

-- 2. Actualizar policy INSERT - permitir criação baseada em permissões dinâmicas
DROP POLICY IF EXISTS "Members with editing rights can create projects" 
  ON public.projects;

CREATE POLICY "Members with create permission can create projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.create')
  );

-- 3. Actualizar policy UPDATE - permitir edição baseada em permissões dinâmicas
DROP POLICY IF EXISTS "Members with editing rights can update projects" 
  ON public.projects;

CREATE POLICY "Members with edit permission can update projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
  );

-- 4. Actualizar policy DELETE - permitir eliminação baseada em permissões dinâmicas
DROP POLICY IF EXISTS "Admins can delete projects" 
  ON public.projects;

CREATE POLICY "Members with delete permission can delete projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.delete')
  );