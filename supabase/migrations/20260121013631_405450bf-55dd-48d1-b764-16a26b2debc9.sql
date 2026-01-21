-- Adicionar campos para mensagens e som às preferências de push
ALTER TABLE user_push_preferences 
ADD COLUMN IF NOT EXISTS messages_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;