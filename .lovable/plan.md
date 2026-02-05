

# Plano: Enviar Emails do Formulário de Contacto

## Problema

O formulário de contacto em `/contato` simula o envio com um `setTimeout` mas **nunca envia nenhum email**. O código actual:

```typescript
// Apenas simula - não envia nada
await new Promise((resolve) => setTimeout(resolve, 1500));
```

## Solução

Criar uma backend function `send-contact-email` que recebe os dados do formulário e envia um email real para `geral@willflow.app` usando Resend (já configurado com `RESEND_API_KEY`).

---

## Alterações

### 1. Criar `supabase/functions/send-contact-email/index.ts`

Nova backend function que:
- Recebe `name`, `email`, `subject`, `message` do formulário
- Valida o email do remetente com o validador existente (`email-validator.ts`)
- Envia email para `geral@willflow.app` via Resend com:
  - **From**: `WillFlow <noreply@willflow.app>`
  - **Reply-To**: email do visitante (para poder responder directamente)
  - **Subject**: `[Contacto WillFlow] {assunto}`
  - **Body**: HTML formatado com nome, email, assunto e mensagem
- Retorna sucesso/erro com CORS headers
- Inclui rate limiting básico (não envia se campos vazios)

### 2. Actualizar `src/pages/Contact.tsx`

Substituir a simulação por uma chamada real:
- Importar o cliente Supabase
- No `handleSubmit`, chamar `supabase.functions.invoke('send-contact-email', { body: { name, email, subject, message } })`
- Tratar erros e mostrar mensagem apropriada
- Manter o estado de loading e sucesso existente

---

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/send-contact-email/index.ts` | Novo — backend function para enviar email via Resend |
| `src/pages/Contact.tsx` | Substituir simulação por chamada real à backend function |

## Segurança

- A function não requer autenticação (formulário público)
- Validação de email do remetente para evitar spam
- Campos obrigatórios validados no backend
- `RESEND_API_KEY` já está configurado como secret

