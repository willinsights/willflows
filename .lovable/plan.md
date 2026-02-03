
# Plano: Corrigir Redirecionamento Após Login com Google

## Problema Identificado
Após o login com Google, o utilizador é redirecionado para a **landing page** (`/`) em vez de ir para `/app`. 

Isto acontece porque:
1. O `redirect_uri` no login OAuth está configurado como `window.location.origin` (ex: `https://willflow.app`)
2. Após autenticação, o Google redireciona para `/` (raíz)
3. A landing page não tem lógica para detetar utilizadores autenticados e redireccionar para `/app`

## Solução
Alterar o `redirect_uri` para incluir `/auth` no final, garantindo que após o OAuth, o utilizador volta à página `/auth`, onde já existe um `useEffect` que detecta se o utilizador está autenticado e navega automaticamente para `/app`.

## Alteração Técnica

**Ficheiro:** `src/contexts/AuthContext.tsx`

```typescript
// ANTES (linha 148-149)
const signInWithGoogle = useCallback(async () => {
  const { error } = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
  });
  return { error: error as Error | null };
}, []);

// DEPOIS
const signInWithGoogle = useCallback(async () => {
  const { error } = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: `${window.location.origin}/auth`,
  });
  return { error: error as Error | null };
}, []);
```

## Como Funciona Após a Correção
1. Utilizador clica "Entrar com Google"
2. OAuth abre popup/redireciona para Google
3. Google redireciona de volta para `https://willflow.app/auth`
4. A página `/auth` detecta que o utilizador está autenticado (`user` existe)
5. O `useEffect` existente navega automaticamente para `/app`

## Importante
Não é necessário adicionar `/auth` aos redirect URIs no Google Cloud Console pois o redirect é feito pelo módulo Lovable que usa os callbacks já configurados. O `redirect_uri` passado é apenas para onde a aplicação deve navegar após receber os tokens.
