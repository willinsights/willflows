
## Plano de Diagnóstico e Correção: Email de Reenvio de Convite

### Estado Atual

A investigação revelou que a infraestrutura está funcional:

| Componente | Estado |
|------------|--------|
| Edge function `send-invitation-email` | Funcional (testado com sucesso) |
| Remetente | `WillFlow <noreply@willflow.app>` |
| RESEND_API_KEY | Configurada |
| Validação de domínios `.pt` | Aceita com fallback de TLD |

### Problema Identificado

O hook `resendInvitation` depende da lista de convites em memória (`invitations`) que é filtrada para excluir convites expirados. Se um convite expirar enquanto o utilizador está na página, o clique em "Reenviar" falha silenciosamente porque:

```tsx
// Linha 205 de useWorkspaceInvitations.ts
const invitation = invitations.find(inv => inv.id === invitationId);
if (!invitation) {
  return { success: false, error: 'Convite não encontrado' };
}
```

### Correções Propostas

---

#### Correção 1: Buscar Convite Diretamente da Base de Dados

**Ficheiro:** `src/hooks/useWorkspaceInvitations.ts`

Em vez de depender da lista em memória, buscar o convite diretamente da base de dados:

```tsx
const resendInvitation = async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
  if (!currentWorkspace?.id) {
    return { success: false, error: 'Workspace não encontrado' };
  }

  // Buscar diretamente da DB em vez de usar lista em memória
  const { data: invitation, error: fetchError } = await supabase
    .from('workspace_invitations')
    .select('id, email, role, token')
    .eq('id', invitationId)
    .eq('workspace_id', currentWorkspace.id)
    .is('accepted_at', null)
    .single();

  if (fetchError || !invitation) {
    return { success: false, error: 'Convite não encontrado ou já aceite' };
  }

  // ... resto do código
};
```

---

#### Correção 2: Melhorar Feedback de Erros na UI

**Ficheiro:** `src/pages/app/Equipa.tsx`

Tratar o campo `error` mesmo quando `success: true`:

```tsx
const handleResendInvite = async (id: string) => {
  const result = await resendInvitation(id);
  
  if (result.success) {
    toast({
      title: 'Convite reenviado',
      description: result.error || 'O convite foi reenviado com sucesso.',
      variant: result.error ? 'default' : 'default',
    });
  } else {
    toast({
      title: 'Erro ao reenviar convite',
      description: result.error || 'Ocorreu um erro. Tente novamente.',
      variant: 'destructive',
    });
  }
  
  refreshInvitations();
};
```

---

#### Correção 3: Adicionar Logging na Edge Function

**Ficheiro:** `supabase/functions/send-invitation-email/index.ts`

Melhorar os logs para diagnóstico:

```typescript
console.log("Request body:", { 
  email: email?.substring(0, 3) + '***', 
  workspaceName, 
  role,
  hasToken: !!inviteToken 
});

// Antes de enviar
console.log("Attempting to send email via Resend...");

// Após resposta
console.log("Resend response status:", emailResponse.status);
```

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useWorkspaceInvitations.ts` | Buscar convite da DB diretamente |
| `src/pages/app/Equipa.tsx` | Tratar `result.error` mesmo com `success: true` |
| `supabase/functions/send-invitation-email/index.ts` | Melhorar logging para diagnóstico |

---

### Resultado Esperado

1. Convites expirados podem ser reenviados (busca direta da DB estende expiração)
2. Utilizador recebe feedback claro sobre o estado do envio
3. Logs detalhados para diagnóstico de problemas futuros
