-- Criar canais para o workspace In-Sights
INSERT INTO public.conversations (id, workspace_id, type, name, is_private, created_by)
VALUES 
  ('c1a11111-1111-1111-1111-111111111111', '13d03943-06f4-4a65-a756-7a79834a1ca9', 'channel', 'geral', false, 'c13a3906-354b-459d-98a2-293e7a0b68f3'),
  ('c2a22222-2222-2222-2222-222222222222', '13d03943-06f4-4a65-a756-7a79834a1ca9', 'channel', 'edicao', false, 'c13a3906-354b-459d-98a2-293e7a0b68f3'),
  ('c3a33333-3333-3333-3333-333333333333', '13d03943-06f4-4a65-a756-7a79834a1ca9', 'channel', 'anuncios', true, 'c13a3906-354b-459d-98a2-293e7a0b68f3')
ON CONFLICT (id) DO NOTHING;

-- Criar conversas de projeto
INSERT INTO public.conversations (id, workspace_id, type, name, project_id, is_private, created_by)
VALUES 
  ('c4a44444-4444-4444-4444-444444444444', '13d03943-06f4-4a65-a756-7a79834a1ca9', 'project', 'Vídeo Institucional - Ana', 'e1778950-2607-414a-9859-3903d8cbf0c9', false, 'c13a3906-354b-459d-98a2-293e7a0b68f3'),
  ('c5a55555-5555-5555-5555-555555555555', '13d03943-06f4-4a65-a756-7a79834a1ca9', 'project', 'Cobertura de Evento - Pedro', '98e6f115-7a81-4e69-a698-639fcf75092c', false, 'c13a3906-354b-459d-98a2-293e7a0b68f3')
ON CONFLICT (id) DO NOTHING;

-- Criar DM
INSERT INTO public.conversations (id, workspace_id, type, is_private, created_by)
VALUES 
  ('c6a66666-6666-6666-6666-666666666666', '13d03943-06f4-4a65-a756-7a79834a1ca9', 'dm', true, 'c13a3906-354b-459d-98a2-293e7a0b68f3')
ON CONFLICT (id) DO NOTHING;

-- Adicionar membros às conversas
INSERT INTO public.conversation_members (conversation_id, user_id, role)
VALUES 
  ('c1a11111-1111-1111-1111-111111111111', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'member'),
  ('c1a11111-1111-1111-1111-111111111111', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'member'),
  ('c1a11111-1111-1111-1111-111111111111', 'ad08ad78-5b94-490b-8d2a-ee7c2085c601', 'member'),
  ('c2a22222-2222-2222-2222-222222222222', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'member'),
  ('c2a22222-2222-2222-2222-222222222222', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'member'),
  ('c3a33333-3333-3333-3333-333333333333', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'admin'),
  ('c4a44444-4444-4444-4444-444444444444', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'member'),
  ('c4a44444-4444-4444-4444-444444444444', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'member'),
  ('c5a55555-5555-5555-5555-555555555555', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'member'),
  ('c5a55555-5555-5555-5555-555555555555', 'ad08ad78-5b94-490b-8d2a-ee7c2085c601', 'member'),
  ('c6a66666-6666-6666-6666-666666666666', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'member'),
  ('c6a66666-6666-6666-6666-666666666666', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'member')
ON CONFLICT DO NOTHING;

-- Mensagens Canal Geral
INSERT INTO public.messages (conversation_id, user_id, body, type, created_at)
VALUES 
  ('c1a11111-1111-1111-1111-111111111111', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Bom dia equipa! 👋 Como estão os projetos desta semana?', 'text', NOW() - INTERVAL '2 days'),
  ('c1a11111-1111-1111-1111-111111111111', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Olá! Tudo a correr bem. O projeto da Ana está quase terminado.', 'text', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
  ('c1a11111-1111-1111-1111-111111111111', 'ad08ad78-5b94-490b-8d2a-ee7c2085c601', 'Por aqui também! A cobertura do evento ficou fantástica 🎬', 'text', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('c1a11111-1111-1111-1111-111111111111', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Excelente! Vamos ter uma reunião amanhã às 10h para alinhar entregas', 'text', NOW() - INTERVAL '1 day'),
  ('c1a11111-1111-1111-1111-111111111111', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Confirmo presença! ✅', 'text', NOW() - INTERVAL '1 day' + INTERVAL '10 minutes');

-- Mensagens Canal Edição
INSERT INTO public.messages (conversation_id, user_id, body, type, created_at)
VALUES 
  ('c2a22222-2222-2222-2222-222222222222', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Pessoal, qual o codec que estão a usar para proxy?', 'text', NOW() - INTERVAL '3 days'),
  ('c2a22222-2222-2222-2222-222222222222', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'ProRes LT, funciona bem e não pesa muito no disco.', 'text', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),
  ('c2a22222-2222-2222-2222-222222222222', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Alguém tem um preset de color grading para S-Log3?', 'text', NOW() - INTERVAL '1 day'),
  ('c2a22222-2222-2222-2222-222222222222', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Tenho alguns que uso frequentemente, posso partilhar.', 'text', NOW() - INTERVAL '1 day' + INTERVAL '20 minutes'),
  ('c2a22222-2222-2222-2222-222222222222', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Seria óptimo! Obrigado 🙏', 'text', NOW() - INTERVAL '1 day' + INTERVAL '25 minutes');

-- Mensagens Projeto Ana
INSERT INTO public.messages (conversation_id, user_id, body, type, created_at)
VALUES 
  ('c4a44444-4444-4444-4444-444444444444', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'A Ana já confirmou as datas da rodagem?', 'text', NOW() - INTERVAL '5 days'),
  ('c4a44444-4444-4444-4444-444444444444', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Sim! Dia 25 e 26 deste mês. Já reservei o equipamento.', 'text', NOW() - INTERVAL '5 days' + INTERVAL '2 hours'),
  ('c4a44444-4444-4444-4444-444444444444', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Perfeito! Vou preparar o guião e envio para aprovação.', 'text', NOW() - INTERVAL '4 days'),
  ('c4a44444-4444-4444-4444-444444444444', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'O cliente aprovou o primeiro corte! 🎉', 'text', NOW() - INTERVAL '1 day'),
  ('c4a44444-4444-4444-4444-444444444444', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Excelente notícia! Vou avançar para a cor e finalização.', 'text', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
  ('c4a44444-4444-4444-4444-444444444444', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Confirmo música licenciada. Link está na pasta do projeto. 🎵', 'text', NOW() - INTERVAL '12 hours');

-- Mensagens Projeto Pedro
INSERT INTO public.messages (conversation_id, user_id, body, type, created_at)
VALUES 
  ('c5a55555-5555-5555-5555-555555555555', 'ad08ad78-5b94-490b-8d2a-ee7c2085c601', 'A cobertura do evento foi um sucesso! 🎥', 'text', NOW() - INTERVAL '3 days'),
  ('c5a55555-5555-5555-5555-555555555555', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Óptimo! Quantas horas de material tens?', 'text', NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
  ('c5a55555-5555-5555-5555-555555555555', 'ad08ad78-5b94-490b-8d2a-ee7c2085c601', 'Cerca de 4 horas com 3 câmaras. As fotos também ficaram espectaculares! 📸', 'text', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
  ('c5a55555-5555-5555-5555-555555555555', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Vou fazer uma seleção e envio para aprovação do cliente.', 'text', NOW() - INTERVAL '2 days'),
  ('c5a55555-5555-5555-5555-555555555555', 'ad08ad78-5b94-490b-8d2a-ee7c2085c601', 'Beleza! Avisa-me se precisares de algum clip específico.', 'text', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes');

-- Mensagens DM
INSERT INTO public.messages (conversation_id, user_id, body, type, created_at)
VALUES 
  ('c6a66666-6666-6666-6666-666666666666', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Olá! Já vi as sugestões de música para o vídeo.', 'text', NOW() - INTERVAL '2 days'),
  ('c6a66666-6666-6666-6666-666666666666', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'E então, qual preferes?', 'text', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
  ('c6a66666-6666-6666-6666-666666666666', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Gosto muito da segunda opção, tem mais energia!', 'text', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes'),
  ('c6a66666-6666-6666-6666-666666666666', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Concordo! Vou usar essa então. 🎵', 'text', NOW() - INTERVAL '1 day'),
  ('c6a66666-6666-6666-6666-666666666666', '4ae6ffdf-d6c5-4dc1-834a-7a91eb0724fd', 'Quando achas que entregas o primeiro corte?', 'text', NOW() - INTERVAL '6 hours'),
  ('c6a66666-6666-6666-6666-666666666666', 'c13a3906-354b-459d-98a2-293e7a0b68f3', 'Sexta-feira ao fim do dia, no máximo! 💪', 'text', NOW() - INTERVAL '5 hours');