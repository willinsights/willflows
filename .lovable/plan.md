

## Plano de Correção: Erros ao Criar/Gerir Chats de Tarefas e Projetos

### Problema Identificado

Através da análise dos logs de Postgres, foram encontrados múltiplos erros:
```
"new row violates row-level security policy for table conversation_members"
```

**Causa raiz**: A política RLS de INSERT na tabela `conversation_members` é demasiado restritiva para chats de projeto. Atualmente apenas permite:
1. Utilizadores com permissão de gestão (admin/editor do workspace OU criador da conversa)
2. OU auto-join em canais públicos (mas chats de projeto **não são** canais públicos)

Isto significa que utilizadores com roles como `captacao`, `freelancer`, ou `visualizador` não conseguem:
- Ativar o seu chat de projeto (upsert `is_active = true`)
- Ser adicionados como membros de conversas de projeto pelo frontend

---

### Correção Necessária

#### 1. Atualizar a Política RLS de INSERT em `conversation_members`

A política deve permitir que **membros da equipa do projeto** possam juntar-se aos chats de projeto correspondentes, mesmo que não sejam admin/editor.

**Política atual:**
```sql
can_manage_conversation_members(conversation_id, auth.uid()) 
OR 
(user_id = auth.uid() AND is_public_channel_in_user_workspace(conversation_id, auth.uid()))
```

**Política proposta:**
```sql
-- Condição 1: Admin/editor do workspace ou criador da conversa
can_manage_conversation_members(conversation_id, auth.uid())
OR
-- Condição 2: Auto-join em canais públicos
(user_id = auth.uid() AND is_public_channel_in_user_workspace(conversation_id, auth.uid()))
OR
-- Condição 3 (NOVA): Membro do workspace pode juntar-se a si próprio em chats de projeto do workspace
(user_id = auth.uid() AND is_project_chat_in_user_workspace(conversation_id, auth.uid()))
```

#### 2. Criar Nova Função Auxiliar

```sql
CREATE OR REPLACE FUNCTION public.is_project_chat_in_user_workspace(
  p_conversation_id uuid, 
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = p_conversation_id
    AND c.type = 'project'
    AND wm.user_id = p_user_id
    AND wm.is_active = true
  );
$$;
```

#### 3. Atualizar a Política RLS

```sql
DROP POLICY IF EXISTS "Users can add conversation members" ON conversation_members;

CREATE POLICY "Users can add conversation members"
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

---

### Correção Adicional: Problema de UPDATE

Também é necessário verificar a política de UPDATE para garantir que o utilizador pode atualizar o seu próprio `is_active`:

**Política atual de UPDATE:**
```sql
qual: (user_id = auth.uid())
with_check: (user_id = auth.uid())
```

Esta está correta - o utilizador pode atualizar a sua própria membership. No entanto, o **upsert pode estar a tentar INSERT** quando o utilizador ainda não é membro.

---

### Correção no Frontend: Adicionar Tratamento de Erros

Para evitar erros silenciosos, melhorar o tratamento nos modais:

**Ficheiro: `src/components/projects/ProjectDetailsSheet.tsx` (linhas 496-501)**

```typescript
// Antes:
await supabase.from('conversation_members').upsert({
  conversation_id: conversationId,
  user_id: user.id,
  is_active: true,
}, { onConflict: 'conversation_id,user_id' });

// Depois (com tratamento de erro e role):
const { error: memberError } = await supabase.from('conversation_members').upsert({
  conversation_id: conversationId,
  user_id: user.id,
  role: 'member',
  is_active: true,
}, { onConflict: 'conversation_id,user_id' });

if (memberError) {
  console.error('[Chat] Error activating membership:', memberError);
  // Continuar mesmo com erro - pode já estar como membro via trigger
}
```

**Ficheiro: `src/components/projects/ProjectDetailsModal.tsx` (linhas 535-541)**

Mesma alteração para garantir consistência.

---

### Correção de Atualização em Tempo Real

Para garantir que as conversas aparecem imediatamente, adicionar invalidação mais agressiva:

**Ficheiro: `src/hooks/useConversations.ts`**

Na mutation `createProjectChat` (linha 468-471), adicionar:

```typescript
onSuccess: () => {
  // Invalidar queries relacionadas imediatamente
  queryClient.invalidateQueries({ queryKey: ['conversations', workspace?.id] });
  queryClient.invalidateQueries({ queryKey: ['project-chat-status'] });
  queryClient.invalidateQueries({ queryKey: ['task-chat-status'] });
},
```

---

### Resumo das Alterações

| Tipo | Ficheiro/Área | Descrição |
|------|---------------|-----------|
| **SQL** | Nova função | `is_project_chat_in_user_workspace` |
| **SQL** | Política RLS | Atualizar INSERT policy em `conversation_members` |
| **Frontend** | `ProjectDetailsSheet.tsx` | Adicionar `role` ao upsert e tratamento de erro |
| **Frontend** | `ProjectDetailsModal.tsx` | Mesma correção |
| **Frontend** | `useConversations.ts` | Invalidar queries adicionais após criar chat |

### Impacto

- **Médio risco**: Alteração de política RLS afeta segurança, mas a nova condição é restritiva (apenas auto-join em projeto do próprio workspace)
- **Ficheiros afetados**: 3 ficheiros frontend + 1 migração SQL
- **Resultado esperado**: 
  - Todos os membros do workspace podem aceder a chats de projeto
  - Conversas aparecem imediatamente após criação
  - Sem erros de RLS ao abrir chat

