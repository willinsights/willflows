-- Inserir nova permissao clients.view_contacts para todos os workspaces existentes
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