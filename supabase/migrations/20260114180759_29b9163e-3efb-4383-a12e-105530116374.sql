-- Eliminar conta geral@in-sights.pt e workspace "Estúdio will"
-- User ID: 0fd6d5f3-a51a-4a42-af2a-2c81206bef79
-- Workspace ID: ce3333e9-24d7-4ff3-81f3-2861717af93b

-- 1. Eliminar pagamentos do workspace
DELETE FROM payments 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 2. Eliminar comentários de projetos
DELETE FROM project_comments 
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

-- 3. Eliminar media links de projetos
DELETE FROM project_media_links 
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

-- 4. Eliminar project team
DELETE FROM project_team 
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

-- 5. Eliminar tasks e relacionados
DELETE FROM task_checklists 
WHERE task_id IN (
  SELECT id FROM tasks 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

DELETE FROM task_comments 
WHERE task_id IN (
  SELECT id FROM tasks 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

DELETE FROM task_assignees 
WHERE task_id IN (
  SELECT id FROM tasks 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

DELETE FROM task_attachments 
WHERE task_id IN (
  SELECT id FROM tasks 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

DELETE FROM tasks 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 6. Eliminar projetos do workspace
DELETE FROM projects 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 7. Eliminar comunicações e notas de clientes
DELETE FROM client_communications 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

DELETE FROM client_notes 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 8. Eliminar clientes do workspace
DELETE FROM clients 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 9. Eliminar eventos de calendário e attendees
DELETE FROM event_attendees 
WHERE event_id IN (
  SELECT id FROM calendar_events 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

DELETE FROM calendar_events 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 10. Eliminar categorias
DELETE FROM categories 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 11. Eliminar colunas kanban
DELETE FROM kanban_columns 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 12. Eliminar activity log
DELETE FROM activity_log 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 13. Eliminar notificações do workspace
DELETE FROM notifications 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 14. Eliminar feedback do workspace
DELETE FROM feedback 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 15. Eliminar templates do workspace
DELETE FROM project_templates 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 16. Eliminar permissões do workspace
DELETE FROM workspace_role_permissions 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 17. Eliminar google calendar connections
DELETE FROM google_calendar_sync_log 
WHERE connection_id IN (
  SELECT id FROM google_calendar_connections 
  WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b'
);

DELETE FROM google_calendar_connections 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 18. Eliminar subscription invoices
DELETE FROM subscription_invoices 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 19. Eliminar membros do workspace
DELETE FROM workspace_members 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 20. Eliminar convites pendentes
DELETE FROM workspace_invitations 
WHERE workspace_id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 21. Eliminar o workspace
DELETE FROM workspaces 
WHERE id = 'ce3333e9-24d7-4ff3-81f3-2861717af93b';

-- 22. Eliminar preferências do utilizador
DELETE FROM user_preferences 
WHERE user_id = '0fd6d5f3-a51a-4a42-af2a-2c81206bef79';

-- 23. Eliminar notificações do utilizador (outras)
DELETE FROM notifications 
WHERE user_id = '0fd6d5f3-a51a-4a42-af2a-2c81206bef79';

-- 24. Eliminar perfil do utilizador
DELETE FROM profiles 
WHERE id = '0fd6d5f3-a51a-4a42-af2a-2c81206bef79';