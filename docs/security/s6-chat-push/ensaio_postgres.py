"""Ensaio S6 numa PostgreSQL descartável. Dados fictícios."""
import sys
from pathlib import Path
here = Path(__file__).resolve().parent
sys.path.insert(0, str(here.parent / '_ensaio'))
from pg import disposable, report

A = '11111111-1111-4111-8111-111111111111'; B = '22222222-2222-4222-8222-222222222222'
C1 = 'c1c1c1c1-0000-4000-8000-000000000001'; C2 = 'c2c2c2c2-0000-4000-8000-000000000002'
M1 = 'aaaaaaaa-0000-4000-8000-000000000001'
OK_SUB = '{"endpoint":"https://fcm.googleapis.com/fcm/send/demo-token_123","keys":{"p256dh":"' + 'B'*87 + '","auth":"' + 'a'*22 + '"}}'
with disposable(55471) as db:
    db.sql(f'''
    CREATE TABLE conversations(id uuid PRIMARY KEY);
    CREATE TABLE conversation_members(conversation_id uuid, user_id uuid);
    CREATE FUNCTION is_conversation_member(p_conversation_id uuid, p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
      $$SELECT EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id=p_conversation_id AND user_id=p_user_id)$$;
    CREATE TABLE messages(id uuid PRIMARY KEY, conversation_id uuid NOT NULL, user_id uuid NOT NULL, body text, is_edited boolean, is_deleted boolean,
      parent_message_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz);
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Members can view" ON messages FOR SELECT USING (is_conversation_member(conversation_id, auth.uid()));
    CREATE POLICY "Authors can update messages" ON messages FOR UPDATE USING (user_id = auth.uid());
    GRANT SELECT, UPDATE ON messages TO authenticated;
    CREATE TABLE user_push_preferences(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, push_enabled boolean, push_subscription jsonb);
    ALTER TABLE user_push_preferences ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view their own preferences" ON user_push_preferences FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own preferences" ON user_push_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own preferences" ON user_push_preferences FOR UPDATE USING (auth.uid() = user_id);
    GRANT SELECT, INSERT, UPDATE ON user_push_preferences TO authenticated;
    INSERT INTO conversations VALUES ('{C1}'),('{C2}');
    INSERT INTO conversation_members VALUES ('{C1}','{A}'),('{C2}','{B}');
    INSERT INTO messages(id,conversation_id,user_id,body) VALUES ('{M1}','{C1}','{A}','olá demo');''')
    checks = []
    # Antes do candidato: o defeito existe (A move a mensagem para C2, onde não é membro).
    # Antes do candidato: mover para outra conversa já é recusado pela política de leitura,
    # mas o autor consegue falsificar a data de criação e o fio da mensagem.
    checks.append(('antes: mover de conversa já recusado pela RLS', db.rejects(lambda: db.as_user(A, f"UPDATE messages SET conversation_id='{C2}' WHERE id='{M1}'"), 'row-level security')))
    db.as_user(A, f"UPDATE messages SET created_at='2020-01-01' WHERE id='{M1}'")
    checks.append(('antes: data de criação falsificável (defeito)', db.sql(f"SELECT created_at::date FROM messages WHERE id='{M1}'") == '2020-01-01'))
    db.sql(f"UPDATE messages SET created_at=now() WHERE id='{M1}'")
    db.file(here / 'candidate.sql')
    checks.append(('autor edita o texto', db.as_user(A, f"UPDATE messages SET body='editado', is_edited=true WHERE id='{M1}' RETURNING body") .splitlines()[-2:][0] == 'editado' or db.sql(f"SELECT body FROM messages WHERE id='{M1}'") == 'editado'))
    checks.append(('mover para outra conversa recusado', db.rejects(lambda: db.as_user(A, f"UPDATE messages SET conversation_id='{C2}' WHERE id='{M1}'"), 'MESSAGE_IDENTITY_IMMUTABLE')))
    checks.append(('falsificar a data recusado', db.rejects(lambda: db.as_user(A, f"UPDATE messages SET created_at='2020-01-01' WHERE id='{M1}'"), 'MESSAGE_IDENTITY_IMMUTABLE')))
    checks.append(('mudar o autor recusado', db.rejects(lambda: db.as_user(A, f"UPDATE messages SET user_id='{B}' WHERE id='{M1}'"), 'MESSAGE_IDENTITY_IMMUTABLE') ))
    checks.append(('outro utilizador não edita (0 linhas)', db.as_user(B, f"UPDATE messages SET body='x' WHERE id='{M1}'") .endswith('UPDATE 0') or db.sql(f"SELECT body FROM messages WHERE id='{M1}'") == 'editado'))
    db.sql(f"DELETE FROM conversation_members WHERE user_id='{A}'")
    db.as_user(A, f"UPDATE messages SET body='saí' WHERE id='{M1}'")
    checks.append(('ex-membro já não edita', db.sql(f"SELECT body FROM messages WHERE id='{M1}'") == 'editado'))
    checks.append(('serviço pode corrigir identidade', db.sql(f"BEGIN; SET LOCAL request.jwt.claims='{{\"role\":\"service_role\"}}'; UPDATE messages SET parent_message_id='{M1}' WHERE id='{M1}'; COMMIT;") is not None))
    # Push
    db.as_user(A, f"INSERT INTO user_push_preferences(user_id,push_enabled,push_subscription) VALUES ('{A}',true,'{OK_SUB}')")
    checks.append(('subscrição FCM válida aceite', db.sql(f"SELECT count(*) FROM user_push_preferences WHERE user_id='{A}'") == '1'))
    bad = {
        'host desconhecido': OK_SUB.replace('fcm.googleapis.com', 'evil.example.test'),
        'http': OK_SUB.replace('https://', 'http://'),
        'fragmento': OK_SUB.replace('demo-token_123', 'demo#x'),
        'sem chaves': '{"endpoint":"https://fcm.googleapis.com/fcm/send/x"}',
        'sufixo enganador': OK_SUB.replace('fcm.googleapis.com', 'fcm.googleapis.com.evil.test'),
    }
    for name, sub in bad.items():
        checks.append((f'push recusada: {name}', db.rejects(lambda s=sub: db.as_user(A, f"UPDATE user_push_preferences SET push_subscription='{s}' WHERE user_id='{A}'"), 'PUSH_SUBSCRIPTION_INVALID')))
    checks.append(('push nula (desligar) aceite', db.as_user(A, f"UPDATE user_push_preferences SET push_subscription=NULL WHERE user_id='{A}'") is not None))
    checks.append(('não transfere preferências para outro utilizador', db.rejects(lambda: db.as_user(A, f"UPDATE user_push_preferences SET user_id='{B}' WHERE user_id='{A}'"), 'row-level security')))
    db.file(here / 'rollback.sql')
    checks.append(('rollback aplica', db.sql("SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_guard_%'") == '0'))
    sys.exit(report(checks))
