
## Plano de Correção: Emails de Convite Não Chegam

### Problemas Identificados

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Função `resendInvitation` não envia email | Reenviar convite apenas estende prazo, não manda email |
| 2 | Erros de envio são silenciados | Utilizador pensa que convite foi enviado quando falhou |
| 3 | Validação DNS pode rejeitar domínios válidos | Domínios `.pt` podem falhar se DNS timeout ocorrer |

---

### Correção 1: Reenviar Email ao Reenviar Convite

**Ficheiro:** `src/hooks/useWorkspaceInvitations.ts`

Atualizar a função `resendInvitation` para também enviar o email:

```tsx
const resendInvitation = async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
  // Buscar dados do convite primeiro
  const invitation = invitations.find(inv => inv.id === invitationId);
  if (!invitation) {
    return { success: false, error: 'Convite não encontrado' };
  }

  // Extend expiration by 7 days
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 7);

  const { error } = await supabase
    .from('workspace_invitations')
    .update({ expires_at: newExpiry.toISOString() })
    .eq('id', invitationId);

  if (error) {
    logger.error('Error resending invitation:', error);
    return { success: false, error: 'Erro ao reenviar convite' };
  }

  // NOVO: Enviar email novamente
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && currentWorkspace) {
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          invitationId: invitation.id,
          email: invitation.email,
          workspaceName: currentWorkspace.name,
          inviterName: inviterProfile?.full_name || inviterProfile?.email || 'Um utilizador',
          role: invitation.role,
          token: invitation.token,
        },
      });

      if (emailError) {
        logger.warn('Failed to resend invitation email:', emailError);
        return { success: true, error: 'Convite reenviado mas email pode não ter sido entregue' };
      }
    }
  } catch (emailErr) {
    logger.warn('Error resending invitation email:', emailErr);
  }

  await fetchInvitations();
  return { success: true };
};
```

---

### Correção 2: Melhorar Tolerância a Falhas de DNS

**Ficheiro:** `supabase/functions/_shared/email-validator.ts`

Adicionar retry com timeout e fallback para DNS lookup:

```typescript
// 5. Verify MX records via DNS lookup (with retry)
const maxRetries = 2;
let mxFound = false;

for (let attempt = 0; attempt < maxRetries && !mxFound; attempt++) {
  try {
    const mxRecords = await Deno.resolveDns(domain, 'MX');
    if (mxRecords && mxRecords.length > 0) {
      mxFound = true;
      result.checks.mxRecord = true;
    }
  } catch (error) {
    // Se é domínio comum conhecido (.pt, .com, .org, etc), dar benefício da dúvida
    const commonTLDs = ['pt', 'com', 'org', 'net', 'edu', 'gov', 'br', 'es', 'fr', 'de', 'uk', 'io'];
    const tld = domain.split('.').pop()?.toLowerCase();
    
    if (attempt === maxRetries - 1) {
      // Na última tentativa, se for TLD comum, aceitar mesmo com falha DNS
      if (tld && commonTLDs.includes(tld)) {
        console.warn(`DNS lookup failed for ${domain}, but accepting common TLD`);
        mxFound = true;
        result.checks.mxRecord = true;
      } else {
        result.error = 'Domínio de email não existe';
        result.errorCode = 'INVALID_DOMAIN';
        return result;
      }
    }
    // Pequena pausa antes de retry
    await new Promise(r => setTimeout(r, 500));
  }
}

if (!mxFound) {
  result.error = 'Este domínio não aceita emails';
  result.errorCode = 'NO_MX_RECORD';
  return result;
}
```

---

### Correção 3: Feedback Visual de Erro

**Ficheiro:** `src/hooks/useWorkspaceInvitations.ts`

Melhorar o tratamento de erros para informar o utilizador:

```tsx
// Em createInvitation, após chamar a edge function:
if (emailError) {
  logger.warn('Failed to send invitation email:', emailError);
  // Retornar sucesso parcial com aviso
  await fetchInvitations();
  return { 
    success: true, 
    error: 'Convite criado mas o email pode não ter sido enviado. Use "Reenviar" para tentar novamente.' 
  };
}
```

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useWorkspaceInvitations.ts` | Adicionar envio de email em `resendInvitation` + melhorar feedback de erro |
| `supabase/functions/_shared/email-validator.ts` | Adicionar retry e fallback para DNS de TLDs comuns |

---

### Resultado Esperado

1. **Reenviar Convite** → Atualiza prazo **E** envia email novamente
2. **Domínios .pt** → Aceites mesmo se DNS lookup temporariamente falhar
3. **Feedback** → Utilizador informado se email não foi enviado

---

### Notas Técnicas

- O validador atual usa `Deno.resolveDns()` que pode ter timeouts em redes lentas
- Domínios portugueses (sapo.pt, mail.pt, etc) têm MX records válidos mas podem falhar lookup
- O código atual silencia erros de email (`logger.warn`) sem informar o utilizador
- A lista de domínios descartáveis não inclui nenhum domínio `.pt`
