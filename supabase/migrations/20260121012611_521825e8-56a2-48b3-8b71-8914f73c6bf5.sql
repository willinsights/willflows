-- Tabela para registar leituras de mensagens
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Index para performance
CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);

-- RLS
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can insert own reads"
  ON message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view reads in their conversations"
  ON message_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reads.message_id
      AND cm.user_id = auth.uid()
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;