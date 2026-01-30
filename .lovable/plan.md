

## Plano de Correção: Erro `function digest(text, unknown) does not exist`

### Problema Identificado

A função `convert_invitation_to_member()` dispara quando um convite é aceite e tenta converter o email hash de volta para encontrar o utilizador. Está a usar:

```sql
WHERE encode(digest(email, 'sha256'), 'hex') = NEW.email_hash
```

Mas deveria usar:

```sql
WHERE encode(extensions.digest(email, 'sha256'), 'hex') = NEW.email_hash
```

A função `digest()` faz parte da extensão `pgcrypto` que no Supabase está no schema `extensions`.

---

### Correção

**Tipo:** Migração SQL

Corrigir a função `convert_invitation_to_member()` para usar o prefixo correto:

```sql
-- Fix: Use extensions.digest() instead of digest()
CREATE OR REPLACE FUNCTION convert_invitation_to_member()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_conversation_id UUID;
  v_project_record RECORD;
BEGIN
  -- Only run when invitation is accepted
  IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
    -- Find the user by email hash (FIXED: use extensions.digest)
    SELECT id INTO v_user_id 
    FROM profiles 
    WHERE encode(extensions.digest(email, 'sha256'), 'hex') = NEW.email_hash;
    
    IF v_user_id IS NOT NULL THEN
      -- Update project_team records: convert invitation_id to user_id
      FOR v_project_record IN 
        SELECT pt.project_id 
        FROM project_team pt 
        WHERE pt.invitation_id = NEW.id
      LOOP
        -- Update the team record
        UPDATE project_team 
        SET user_id = v_user_id, invitation_id = NULL
        WHERE invitation_id = NEW.id AND project_id = v_project_record.project_id;
        
        -- Add user to project chat if exists
        SELECT id INTO v_conversation_id 
        FROM conversations 
        WHERE project_id = v_project_record.project_id AND type = 'project';
        
        IF v_conversation_id IS NOT NULL THEN
          INSERT INTO conversation_members (conversation_id, user_id, role)
          VALUES (v_conversation_id, v_user_id, 'member')
          ON CONFLICT (conversation_id, user_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### Resultado Esperado

1. O trigger `on_invitation_accepted` vai funcionar corretamente
2. Quando um convite for aceite, o sistema vai encontrar o utilizador pelo email
3. Os registos de `project_team` serão convertidos de `invitation_id` para `user_id`
4. O utilizador será adicionado aos chats de projeto automaticamente

---

### Notas

- O erro ocorre especificamente quando se tenta aceitar convites, não ao reenviar
- O convidado já tem conta no app, por isso o trigger está a ser executado
- A correção é simples: adicionar o prefixo `extensions.` à função `digest()`

