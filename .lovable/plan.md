
# Plano: Corrigir Headers CORS na Edge Function send-beta-invite

## Problema Identificado

A Edge Function `send-beta-invite` tem headers CORS incompletos, o que faz com que o browser bloqueie as requests quando o botão "Reenviar" é clicado.

**Headers actuais (linha 8-9):**
```javascript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

O cliente Supabase envia automaticamente headers adicionais (`x-supabase-client-platform`, etc.) que não estão na lista permitida, causando um erro de CORS silencioso.

---

## Solução

Actualizar os headers CORS para incluir todos os headers necessários, seguindo o padrão das outras Edge Functions do projecto.

---

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/send-beta-invite/index.ts` | Corrigir `corsHeaders` (linhas 6-10) |

---

## Secção Técnica

### Alteração em `send-beta-invite/index.ts`

**Antes (linhas 6-10):**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

**Depois:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

---

## Resumo

| Item | Detalhe |
|------|---------|
| **Causa** | Headers CORS incompletos bloqueiam requests do cliente Supabase |
| **Solução** | Adicionar headers `x-supabase-client-*` à lista permitida |
| **Impacto** | Reenvio de convites funcionará correctamente |
