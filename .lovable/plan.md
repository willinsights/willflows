
# Plano: Limpar e Reinstalar Login com Google

## Situação Actual

O projecto tem configurações de Google OAuth em dois locais diferentes:

| Componente | Propósito | Secrets |
|------------|-----------|---------|
| **Login (Autenticação)** | Permitir utilizadores entrarem com Google | Gerido automaticamente pelo Lovable Cloud |
| **Google Calendar (Integração)** | Sincronizar eventos | `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (secrets manuais) |

O erro "deleted_client" indica que o Client ID usado foi eliminado da Google Cloud Console.

---

## O Que Vamos Fazer

### 1. Limpar Configurações (SEM apagar utilizadores)

Os utilizadores que criaram conta com Google **não serão afectados**. Os dados das suas contas estão guardados na base de dados e não dependem das nossas configurações de OAuth.

| O que será limpo | O que será mantido |
|------------------|-------------------|
| Módulo `src/integrations/lovable/` | Utilizadores existentes |
| Import do lovable no AuthContext | Dados de perfil |
| Função signInWithGoogle actual | Sessões activas |

### 2. Reinstalar Correctamente

Após limpar, vou usar a ferramenta oficial do Lovable Cloud para reconfigurar o login com Google de forma correcta.

---

## Ficheiros a Modificar

### `src/contexts/AuthContext.tsx`

**Remover:**
- Linha 4: `import { lovable } from '@/integrations/lovable';`
- Linhas 147-152: Função `signInWithGoogle` que usa o módulo lovable

**Substituir por:**
```typescript
const signInWithGoogle = useCallback(async () => {
  // Placeholder - será reconfigurado
  return { error: new Error('Google login a ser reconfigurado') };
}, []);
```

### `src/integrations/lovable/index.ts`

**Eliminar** este ficheiro completamente (será regenerado pela ferramenta).

---

## Passos da Implementação

```text
1. Eliminar src/integrations/lovable/index.ts
         ↓
2. Remover import do lovable no AuthContext
         ↓
3. Criar signInWithGoogle placeholder
         ↓
4. Usar ferramenta configure-social-auth
         ↓
5. Lovable Cloud regenera módulo correcto
         ↓
6. Testar login com Google
```

---

## Nota sobre Google Calendar

Os secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` são usados **apenas** para a integração do Google Calendar (edge function `google-calendar-auth`), e **não** para o login.

Estes secrets **devem ser mantidos** se a integração do calendário estiver a funcionar. Se também quiser reconfigurar a integração do calendário, avise-me.

---

## Resultado Esperado

Após a implementação:
- Login com Google funcionará com as credenciais geridas pelo Lovable Cloud
- Utilizadores existentes continuarão a poder aceder às suas contas
- Código limpo e sem conflitos

---

## Secção Técnica

### AuthContext.tsx - Código Final

```typescript
// Linha 4 - REMOVER:
// import { lovable } from '@/integrations/lovable';

// Linhas 147-152 - Será substituído automaticamente após usar
// a ferramenta configure-social-auth que regenera o módulo lovable
const signInWithGoogle = useCallback(async () => {
  // Temporário - será reconfigurado
  return { error: new Error('Google login a ser reconfigurado') };
}, []);
```

Após usar a ferramenta de configuração, o código será:

```typescript
import { lovable } from '@/integrations/lovable';

const signInWithGoogle = useCallback(async () => {
  const { error } = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
  });
  return { error: error as Error | null };
}, []);
```

A diferença é que o módulo `lovable` será regenerado pela ferramenta oficial com as configurações correctas.
