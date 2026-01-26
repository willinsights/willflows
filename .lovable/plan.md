
## Plano Completo: Correção de Erros no Chat de Tarefas e Projetos

### Diagnóstico Confirmado

O erro `"new row violates row-level security policy for table conversation_members"` acontece em **ChatFeed.tsx** na função `markConversationAsRead` ao tentar fazer **upsert** de membership.

**Causa Raiz**: A política RLS `"Users can add conversation members"` é do tipo **ALL** mas só tem `WITH CHECK` definido, sem `USING`. Quando o upsert detecta conflito (utilizador já é membro) e tenta UPDATE, falha porque:
- UPDATE precisa de `USING` para filtrar linhas a atualizar
- A política não tem `USING` (é NULL)
- Resultado: UPDATE é bloqueado pelo RLS

### Correções Necessárias

---

#### 1. Reestruturar Políticas RLS de `conversation_members`

Separar a política ALL em políticas específicas:

**A. Remover política problemática**
```sql
DROP POLICY IF EXISTS "Users can add conversation members" ON conversation_members;
```

**B. Criar política específica para INSERT**
```sql
CREATE POLICY "Users can insert conversation members"
ON conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  can_manage_conversation_members(conversation_id, auth.uid())
  OR
  (user_id = auth.uid() AND is_public_channel_in_user_workspace(conversation_id, auth.uid()))
  OR
  (user_id = auth.uid() AND is_project_chat_in_user_workspace(conversation_id, auth.uid()))
);
```

**C. Expandir política de UPDATE existente**

A política atual `"Users can update own membership"` só permite atualizar própria membership (`user_id = auth.uid()`), mas é restritiva demais. Precisa também permitir:
- Admins/Editors a atualizar qualquer membro do seu workspace

```sql
DROP POLICY IF EXISTS "Users can update own membership" ON conversation_members;

CREATE POLICY "Users can update conversation membership"
ON conversation_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  can_manage_conversation_members(conversation_id, auth.uid())
)
WITH CHECK (
  user_id = auth.uid() 
  OR 
  can_manage_conversation_members(conversation_id, auth.uid())
);
```

---

#### 2. Corrigir ChatFeed.tsx - Separar UPDATE de INSERT

O upsert pode ser problemático com RLS. Melhor estratégia: verificar se já é membro e usar UPDATE direto, só usando INSERT se não for membro.

**Ficheiro: `src/components/chat/ChatFeed.tsx` (linhas 142-167)**

```typescript
// Antes: upsert que causa problemas
const { error: upsertError } = await supabase
  .from('conversation_members')
  .upsert(...)

// Depois: verificar existência e usar operação apropriada
const { data: existingMember } = await supabase
  .from('conversation_members')
  .select('id')
  .eq('conversation_id', conversationId)
  .eq('user_id', user.id)
  .maybeSingle();

if (existingMember) {
  // Já é membro - apenas atualizar last_read_at
  const { error: updateError } = await supabase
    .from('conversation_members')
    .update({ last_read_at: readTimestamp })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
    
  if (updateError) {
    logger.error('Failed to update last_read_at:', updateError.code, updateError.message);
    return;
  }
} else {
  // Não é membro - inserir como novo membro
  const { error: insertError } = await supabase
    .from('conversation_members')
    .insert({ 
      conversation_id: conversationId, 
      user_id: user.id, 
      role: 'member',
      is_active: true,
      last_read_at: readTimestamp 
    });
    
  if (insertError) {
    logger.error('Failed to insert membership:', insertError.code, insertError.message);
    return;
  }
}
```

---

#### 3. Corrigir Navegação do TaskChatIndicator

O link atual usa `/app/chat?conversationId=UUID` mas o router espera `/app/chat/:conversationId`.

**Ficheiro: `src/components/tasks/TaskChatIndicator.tsx` (linha 34)**

```typescript
// Antes:
navigate(`/app/chat?conversationId=${conversationId}`);

// Depois:
navigate(`/app/chat/${conversationId}`);
```

---

#### 4. Corrigir ChatLayout para Aceitar Query String (Compatibilidade)

Para manter compatibilidade com links antigos:

**Ficheiro: `src/components/chat/ChatLayout.tsx` (adicionar lógica)**

```typescript
import { useSearchParams } from 'react-router-dom';

// No início do componente:
const [searchParams] = useSearchParams();
const queryConversationId = searchParams.get('conversationId') || searchParams.get('c');

const [activeConversationId, setActiveConversationId] = useState<string | null>(
  selectedConversationId || queryConversationId || null
);
```

---

#### 5. Corrigir Chat.tsx para Passar Query Param

**Ficheiro: `src/pages/app/Chat.tsx`**

```typescript
import { useParams, useSearchParams } from 'react-router-dom';
import { ChatLayout } from '@/components/chat/ChatLayout';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const queryConversationId = searchParams.get('conversationId') || searchParams.get('c');
  
  // Prioridade: path param > query param
  const selectedId = conversationId || queryConversationId || undefined;

  return <ChatLayout selectedConversationId={selectedId} />;
}
```

---

### Detalhes Técnicos

**Migração SQL Completa:**

```sql
-- 1. Remover política problemática (ALL sem USING)
DROP POLICY IF EXISTS "Users can add conversation members" ON conversation_members;

-- 2. Criar política específica para INSERT
CREATE POLICY "Users can insert conversation members"
ON conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  can_manage_conversation_members(conversation_id, auth.uid())
  OR
  (user_id = auth.uid() AND is_public_channel_in_user_workspace(conversation_id, auth.uid()))
  OR
  (user_id = auth.uid() AND is_project_chat_in_user_workspace(conversation_id, auth.uid()))
);

-- 3. Substituir política de UPDATE para ser mais flexível
DROP POLICY IF EXISTS "Users can update own membership" ON conversation_members;

CREATE POLICY "Users can update conversation membership"
ON conversation_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  can_manage_conversation_members(conversation_id, auth.uid())
)
WITH CHECK (
  user_id = auth.uid() 
  OR 
  can_manage_conversation_members(conversation_id, auth.uid())
);
```

---

### Resumo de Ficheiros a Alterar

| Tipo | Ficheiro/Área | Descrição |
|------|---------------|-----------|
| **SQL** | Migration | Reestruturar políticas RLS (separar INSERT de UPDATE) |
| **Frontend** | `ChatFeed.tsx` | Substituir upsert por check + update/insert |
| **Frontend** | `TaskChatIndicator.tsx` | Corrigir URL de navegação |
| **Frontend** | `Chat.tsx` | Suportar query params |
| **Frontend** | `ChatLayout.tsx` | Aceitar conversationId de query string |

### Impacto

- **Risco médio**: Alteração de políticas RLS requer teste cuidadoso
- **Ficheiros afetados**: 4 ficheiros frontend + 1 migração SQL
- **Resultado esperado**: 
  - Chat de tarefa abre sem erros de permissão
  - Mensagens são marcadas como lidas corretamente
  - Navegação funciona tanto por path como query string
  - Admins/Editors podem gerir membros de conversas

### Verificação Pós-Implementação

1. Abrir chat de tarefa como admin → deve funcionar sem erros
2. Abrir chat de tarefa como editor → deve funcionar sem erros
3. Enviar mensagem no chat → deve aparecer em tempo real
4. Verificar unread count → deve atualizar corretamente
5. Testar com utilizador que nunca esteve no chat → deve ser adicionado automaticamente
