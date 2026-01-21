-- Adicionar coluna para controlar visibilidade ativa do chat
ALTER TABLE conversation_members 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Para membros existentes de chats de projeto, definir como ativo
-- (mantém comportamento atual para conversas existentes)
UPDATE conversation_members cm
SET is_active = true
WHERE EXISTS (
  SELECT 1 FROM conversations c 
  WHERE c.id = cm.conversation_id 
  AND c.type = 'project'
);

-- Para canais e DMs, sempre ativo
UPDATE conversation_members cm
SET is_active = true
WHERE EXISTS (
  SELECT 1 FROM conversations c 
  WHERE c.id = cm.conversation_id 
  AND c.type IN ('channel', 'dm')
);

-- Trigger: Ativar chat ao ser mencionado
CREATE OR REPLACE FUNCTION public.activate_chat_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Obter conversation_id da mensagem
  SELECT conversation_id INTO v_conversation_id
  FROM messages WHERE id = NEW.message_id;
  
  -- Ativar o chat para o utilizador mencionado
  UPDATE conversation_members
  SET is_active = true
  WHERE conversation_id = v_conversation_id
  AND user_id = NEW.mentioned_user_id;
  
  -- Se não for membro, adicionar como membro ativo
  IF NOT FOUND THEN
    INSERT INTO conversation_members (conversation_id, user_id, role, is_active)
    VALUES (v_conversation_id, NEW.mentioned_user_id, 'member', true)
    ON CONFLICT (conversation_id, user_id) 
    DO UPDATE SET is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_activate_chat_on_mention ON public.message_mentions;
CREATE TRIGGER trigger_activate_chat_on_mention
AFTER INSERT ON public.message_mentions
FOR EACH ROW
EXECUTE FUNCTION activate_chat_on_mention();

-- Trigger: Desativar chats de projeto ao entregar
CREATE OR REPLACE FUNCTION public.deactivate_project_chat_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando projeto é marcado como entregue
  IF NEW.is_delivered = true AND (OLD.is_delivered = false OR OLD.is_delivered IS NULL) THEN
    -- Desativar o chat para todos os membros
    UPDATE conversation_members cm
    SET is_active = false
    WHERE EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = cm.conversation_id
      AND c.project_id = NEW.id
      AND c.type = 'project'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_deactivate_project_chat_on_delivery ON public.projects;
CREATE TRIGGER trigger_deactivate_project_chat_on_delivery
AFTER UPDATE ON public.projects
FOR EACH ROW
WHEN (NEW.is_delivered = true AND (OLD.is_delivered = false OR OLD.is_delivered IS NULL))
EXECUTE FUNCTION deactivate_project_chat_on_delivery();

-- Trigger: Reativar chats de projeto ao reabrir
CREATE OR REPLACE FUNCTION public.reactivate_project_chat_on_reopen()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando projeto é reaberto (is_delivered passa de true para false)
  IF NEW.is_delivered = false AND OLD.is_delivered = true THEN
    -- Reativar o chat para todos os membros
    UPDATE conversation_members cm
    SET is_active = true
    WHERE EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = cm.conversation_id
      AND c.project_id = NEW.id
      AND c.type = 'project'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_reactivate_project_chat_on_reopen ON public.projects;
CREATE TRIGGER trigger_reactivate_project_chat_on_reopen
AFTER UPDATE ON public.projects
FOR EACH ROW
WHEN (NEW.is_delivered = false AND OLD.is_delivered = true)
EXECUTE FUNCTION reactivate_project_chat_on_reopen();