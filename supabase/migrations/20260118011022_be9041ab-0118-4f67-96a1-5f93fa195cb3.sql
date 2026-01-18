-- Criar seed data para chat
DO $$
DECLARE
  v_workspace_id UUID := '84bc30cd-c660-41c0-843a-1698ca547577';
  v_admin_id UUID := '4e926d67-dd8d-481c-87f0-2e334caf0d2c';
  v_editor_id UUID := 'e3bec0ec-a72a-4c5e-b358-7918e7a4f474';
  v_project_ana_id UUID := 'a2b33f31-d683-4a42-ad64-db1dfec3d033';
  v_project_pedro_id UUID := '3f9dda4a-b22e-4e58-a823-7f728b293398';
  
  -- Conversation IDs
  v_conv_geral UUID;
  v_conv_anuncios UUID;
  v_conv_edicao UUID;
  v_conv_proj_ana UUID;
  v_conv_proj_pedro UUID;
  v_conv_dm UUID;
  
  -- Message IDs for references
  v_msg_id UUID;
  v_msg_templates UUID;
  v_msg_filmar UUID;
  v_msg_cor UUID;
BEGIN
  -- 1. CRIAR CONVERSAS
  
  -- #geral
  INSERT INTO conversations (workspace_id, type, name, is_private, created_by)
  VALUES (v_workspace_id, 'channel', 'geral', false, v_admin_id)
  RETURNING id INTO v_conv_geral;
  
  -- #anuncios
  INSERT INTO conversations (workspace_id, type, name, is_private, created_by)
  VALUES (v_workspace_id, 'channel', 'anuncios', false, v_admin_id)
  RETURNING id INTO v_conv_anuncios;
  
  -- #edicao
  INSERT INTO conversations (workspace_id, type, name, is_private, created_by)
  VALUES (v_workspace_id, 'channel', 'edicao', false, v_admin_id)
  RETURNING id INTO v_conv_edicao;
  
  -- Project chats
  INSERT INTO conversations (workspace_id, type, name, project_id, is_private, created_by)
  VALUES (v_workspace_id, 'project', 'Vídeo Institucional - Ana', v_project_ana_id, false, v_admin_id)
  RETURNING id INTO v_conv_proj_ana;
  
  INSERT INTO conversations (workspace_id, type, name, project_id, is_private, created_by)
  VALUES (v_workspace_id, 'project', 'Cobertura de Evento - Pedro', v_project_pedro_id, false, v_admin_id)
  RETURNING id INTO v_conv_proj_pedro;
  
  -- DM
  INSERT INTO conversations (workspace_id, type, is_private, created_by)
  VALUES (v_workspace_id, 'dm', true, v_admin_id)
  RETURNING id INTO v_conv_dm;
  
  -- 2. ADICIONAR MEMBROS
  INSERT INTO conversation_members (conversation_id, user_id, role) VALUES
    (v_conv_geral, v_admin_id, 'admin'),
    (v_conv_geral, v_editor_id, 'member'),
    (v_conv_anuncios, v_admin_id, 'admin'),
    (v_conv_anuncios, v_editor_id, 'member'),
    (v_conv_edicao, v_admin_id, 'admin'),
    (v_conv_edicao, v_editor_id, 'member'),
    (v_conv_proj_ana, v_admin_id, 'admin'),
    (v_conv_proj_ana, v_editor_id, 'member'),
    (v_conv_proj_pedro, v_admin_id, 'admin'),
    (v_conv_proj_pedro, v_editor_id, 'member'),
    (v_conv_dm, v_admin_id, 'member'),
    (v_conv_dm, v_editor_id, 'member');
  
  -- 3. CRIAR MENSAGENS
  
  -- #geral
  INSERT INTO messages (conversation_id, user_id, body, created_at) VALUES
    (v_conv_geral, v_admin_id, 'Bom dia equipa! Como estão os projetos desta semana?', NOW() - INTERVAL '2 days'),
    (v_conv_geral, v_editor_id, 'Tudo a correr bem por aqui! Estou a finalizar a cobertura do evento.', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
    (v_conv_geral, v_admin_id, 'Excelente! Não esqueçam de atualizar o Kanban.', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
    (v_conv_geral, v_editor_id, 'Alguém sabe onde está o disco externo com os ficheiros do Resort?', NOW() - INTERVAL '1 day'),
    (v_conv_geral, v_admin_id, 'Está na gaveta do estúdio, ao lado do Mac.', NOW() - INTERVAL '1 day' + INTERVAL '3 minutes');
  
  -- #anuncios (posts)
  INSERT INTO messages (conversation_id, user_id, body, type, metadata, created_at) VALUES
    (v_conv_anuncios, v_admin_id, '📢 **REUNIÃO DE EQUIPA**

Sexta-feira às 10h na sala de reuniões.

Agenda:
- Revisão de projetos
- Novos clientes
- Feedback da equipa', 'post', '{"important": true, "ack_required": true}', NOW() - INTERVAL '3 days');
  
  INSERT INTO messages (conversation_id, user_id, body, type, created_at)
  VALUES (v_conv_anuncios, v_admin_id, 'Novos templates de exportação disponíveis na pasta partilhada. Usem o "WillFlow_Export_v2" para os próximos projetos.', 'post', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_msg_templates;
  
  -- Thread reply no anúncio de templates
  INSERT INTO messages (conversation_id, user_id, body, parent_message_id, created_at) VALUES
    (v_conv_anuncios, v_editor_id, 'Excelente! Já atualizei o Premiere. Funciona muito bem!', v_msg_templates, NOW() - INTERVAL '5 days' + INTERVAL '2 hours');
  
  -- Chat Projeto Ana
  INSERT INTO messages (conversation_id, user_id, body, created_at) VALUES
    (v_conv_proj_ana, v_admin_id, 'Acabei de receber o briefing da cliente. Ela quer algo moderno e dinâmico.', NOW() - INTERVAL '4 days');
  
  INSERT INTO messages (conversation_id, user_id, body, created_at) VALUES
    (v_conv_proj_ana, v_editor_id, 'Perfeito! Vou preparar o storyboard para amanhã.', NOW() - INTERVAL '4 days' + INTERVAL '30 minutes');
  
  INSERT INTO messages (conversation_id, user_id, body, created_at)
  VALUES (v_conv_proj_ana, v_admin_id, 'Precisamos filmar até sexta-feira. Consegues confirmar disponibilidade?', NOW() - INTERVAL '3 days')
  RETURNING id INTO v_msg_filmar;
  
  INSERT INTO messages (conversation_id, user_id, body, created_at) VALUES
    (v_conv_proj_ana, v_editor_id, 'Confirmado! Estou livre quinta e sexta. Vou preparar o equipamento.', NOW() - INTERVAL '3 days' + INTERVAL '1 hour');
  
  INSERT INTO messages (conversation_id, user_id, body, created_at)
  VALUES (v_conv_proj_ana, v_admin_id, 'A cor do céu no clip 3 precisa de correção. Está muito saturado.', NOW() - INTERVAL '1 day')
  RETURNING id INTO v_msg_cor;
  
  INSERT INTO messages (conversation_id, user_id, body, created_at) VALUES
    (v_conv_proj_ana, v_editor_id, 'Já corrigi! Dá uma olhada e diz-me o que achas. 🎨', NOW() - INTERVAL '1 day' + INTERVAL '2 hours');
  
  -- Chat Projeto Pedro
  INSERT INTO messages (conversation_id, user_id, body, created_at) VALUES
    (v_conv_proj_pedro, v_editor_id, 'O evento é no sábado às 14h. Vou levar 2 câmaras e o gimbal.', NOW() - INTERVAL '5 days'),
    (v_conv_proj_pedro, v_admin_id, 'Boa! Não esqueças os cartões de memória extra. O último evento enchemos 3 cartões.', NOW() - INTERVAL '5 days' + INTERVAL '15 minutes'),
    (v_conv_proj_pedro, v_editor_id, 'Já exportei o teaser de 30 segundos. O cliente adorou! 🎉', NOW() - INTERVAL '2 days'),
    (v_conv_proj_pedro, v_admin_id, 'Fantástico! Agora falta entregar o vídeo completo até terça-feira.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour');
  
  -- DM
  INSERT INTO messages (conversation_id, user_id, body, created_at) VALUES
    (v_conv_dm, v_editor_id, 'Olá! Podes ajudar-me com a edição do vídeo da Ana?', NOW() - INTERVAL '1 day'),
    (v_conv_dm, v_admin_id, 'Claro! Qual é a dúvida?', NOW() - INTERVAL '1 day' + INTERVAL '10 minutes'),
    (v_conv_dm, v_editor_id, 'Preciso de sugestões para a música de fundo. O cliente quer algo energético mas profissional.', NOW() - INTERVAL '1 day' + INTERVAL '15 minutes');
  
  -- 4. REACTIONS
  -- Buscar IDs das mensagens para adicionar reactions
  SELECT id INTO v_msg_id FROM messages WHERE body LIKE '%Já exportei o teaser%' LIMIT 1;
  IF v_msg_id IS NOT NULL THEN
    INSERT INTO message_reactions (message_id, user_id, emoji) VALUES
      (v_msg_id, v_admin_id, '🎉'),
      (v_msg_id, v_admin_id, '👍');
  END IF;
  
  SELECT id INTO v_msg_id FROM messages WHERE body LIKE '%Já corrigi%' LIMIT 1;
  IF v_msg_id IS NOT NULL THEN
    INSERT INTO message_reactions (message_id, user_id, emoji) VALUES
      (v_msg_id, v_admin_id, '✅');
  END IF;
  
  -- 5. FOLLOWUPS
  INSERT INTO followups (message_id, workspace_id, created_by, assigned_to, status, due_at, note) VALUES
    (v_msg_filmar, v_workspace_id, v_admin_id, v_editor_id, 'open', NOW() + INTERVAL '2 days', 'Confirmar equipamento para filmagem'),
    (v_msg_cor, v_workspace_id, v_admin_id, v_admin_id, 'done', NOW() - INTERVAL '1 day', 'Verificar correção de cor');
  
  -- Update done_at for completed followup
  UPDATE followups SET done_at = NOW() - INTERVAL '20 hours' WHERE note = 'Verificar correção de cor';
  
END $$;