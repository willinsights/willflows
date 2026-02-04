
# Plano: Corrigir OAuth Google no Domínio Personalizado (willflow.app)

## Problema Identificado

O login com Google está a retornar **404** quando acedido a partir do domínio personalizado `willflow.app`. 

O URL problemático:
```
willflow.app/~oauth/initiate?provider=google&redirect_uri=https%3A%2F%2Fwillflow.app%2Fauth
```

### Causa

1. A biblioteca `@lovable.dev/cloud-auth-js` usa a rota `/~oauth/initiate` como broker OAuth
2. Esta rota é gerida pelo proxy Lovable Cloud **apenas em domínios `*.lovable.app`**
3. No domínio personalizado `willflow.app`, a rota não existe - retorna 404

---

## Solução

Para domínios personalizados com **credenciais Google OAuth próprias** (como o WillFlow já tem configurado segundo a memória do projeto), devemos contornar o broker Lovable e redirecionar diretamente para o Google OAuth.

### Opção A: Configurar o Broker URL nas Configurações do Lovable Cloud

A forma mais simples é garantir que o domínio `willflow.app` está corretamente configurado no Lovable Cloud para que o broker OAuth funcione. Isto requer:

1. Aceder às definições do Lovable Cloud
2. Verificar se `willflow.app` está adicionado como domínio autorizado
3. Verificar se a rota `~oauth` está ativa para o domínio personalizado

### Opção B: Implementar OAuth Direto com Google (Recomendado)

Como já tens credenciais Google Cloud personalizadas configuradas, podemos implementar OAuth direto sem depender do broker Lovable:

```text
Fluxo atual (falha em domínio personalizado):
┌──────────┐     ┌─────────────────┐     ┌────────────┐
│ willflow │ ──► │ /~oauth/initiate│ ──► │   404      │
│   .app   │     │   (não existe)  │     │            │
└──────────┘     └─────────────────┘     └────────────┘

Fluxo corrigido (OAuth direto):
┌──────────┐     ┌─────────────────┐     ┌────────────┐
│ willflow │ ──► │ Edge Function   │ ──► │ Google     │
│   .app   │     │ google-oauth    │     │ OAuth      │
└──────────┘     └─────────────────┘     └────────────┘
```

---

## Implementação (Opção B)

### 1. Criar Edge Function: `google-oauth`

Nova edge function para iniciar o fluxo OAuth diretamente:

```typescript
// supabase/functions/google-oauth/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  
  if (action === 'initiate') {
    const redirectUri = url.searchParams.get('redirect_uri') || 'https://willflow.app/auth';
    
    const scopes = [
      'openid',
      'email',
      'profile',
    ].join(' ');
    
    const state = btoa(JSON.stringify({ redirectUri, timestamp: Date.now() }));
    
    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    oauthUrl.searchParams.set('redirect_uri', `${SUPABASE_URL}/functions/v1/google-oauth?action=callback`);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', scopes);
    oauthUrl.searchParams.set('access_type', 'offline');
    oauthUrl.searchParams.set('prompt', 'select_account');
    oauthUrl.searchParams.set('state', state);
    
    return new Response(null, {
      status: 302,
      headers: { 'Location': oauthUrl.toString() },
    });
  }
  
  // ... callback handling para trocar code por tokens e criar sessão
});
```

### 2. Atualizar AuthContext para Usar OAuth Direto

Modificar `signInWithGoogle` para usar a nova edge function quando em domínio personalizado:

```typescript
// src/contexts/AuthContext.tsx

const signInWithGoogle = useCallback(async () => {
  const isCustomDomain = !window.location.hostname.includes('lovable.app');
  
  if (isCustomDomain) {
    // Usar OAuth direto via edge function
    const redirectUri = `${window.location.origin}/auth`;
    const oauthUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth?action=initiate&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = oauthUrl;
    return { error: null };
  }
  
  // Usar Lovable OAuth broker em domínios *.lovable.app
  const { error } = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: `${window.location.origin}/auth`,
  });
  return { error: error as Error | null };
}, []);
```

### 3. Atualizar Edge Function: Callback e Criação de Sessão

A edge function precisa:
1. Receber o callback do Google com o `code`
2. Trocar o `code` por tokens (usando `GOOGLE_CLIENT_SECRET`)
3. Criar/atualizar utilizador no Supabase Auth
4. Redirecionar para `/auth` com sessão válida

---

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|----------|------|
| `supabase/functions/google-oauth/index.ts` | Criar |
| `src/contexts/AuthContext.tsx` | Modificar |
| `src/pages/Auth.tsx` | Modificar (tratar callback) |

---

## Verificações Necessárias

Antes de implementar, é necessário confirmar:

1. **Secrets configurados**: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão nas secrets do projeto?
2. **Redirect URI no Google Cloud Console**: O URL `https://{SUPABASE_URL}/functions/v1/google-oauth?action=callback` está adicionado?
3. **Domínio autorizado**: `willflow.app` está na lista de "Authorized JavaScript origins"?

---

## Alternativa Mais Simples

Se o OAuth gerido pelo Lovable Cloud deveria funcionar em domínios personalizados, pode haver uma configuração em falta. Recomendo verificar primeiro no Lovable Cloud:

```xml
<lov-actions>
  <lov-open-backend>Ver Configurações Cloud</lov-open-backend>
</lov-actions>
```

Em **Authentication Settings**, verificar se:
- O domínio `willflow.app` está autorizado
- As credenciais Google personalizadas estão configuradas corretamente
- O redirect URI `https://willflow.app/auth` está permitido

---

## Secção Técnica

### Porque o broker Lovable não funciona em domínios personalizados

A rota `/~oauth/initiate` é interceptada pelo **edge worker** do Lovable Cloud que faz proxy do tráfego. Este proxy está configurado apenas para domínios `*.lovable.app`. 

Quando um domínio personalizado (como `willflow.app`) é usado, o request vai diretamente para a aplicação React (servida via CDN), que não tem uma rota React definida para `/~oauth/initiate`, resultando em 404.

### Solução a longo prazo

A solução ideal seria o Lovable Cloud suportar automaticamente o broker OAuth em domínios personalizados. Enquanto isso não acontece, a implementação de uma edge function própria garante que o OAuth funciona em qualquer domínio.
