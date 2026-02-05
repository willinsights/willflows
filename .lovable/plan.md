
# Plano: Sistema de Notificações de Chat Robusto e Fiável

## Problemas Identificados

### 1. Edge Function `send-push-notification` Não Está a Ser Chamada
O sistema actual usa **apenas notificações locais** via `sendLocalNotification` no hook `useChatNotifications.ts`. Isto só funciona quando:
- A app está **aberta e activa** no browser
- O browser está em **primeiro plano**

A edge function `send-push-notification` **existe mas nunca é invocada** quando chegam novas mensagens.

### 2. Notificações Push Não Funcionam com App em Standby
O protocolo Web Push **requer encriptação VAPID/ECDH** para enviar notificações reais para endpoints de push (FCM/APNs). O código actual faz um simples POST sem encriptação:

```typescript
// Código problemático - linha 202-209
const response = await fetch(subscription.endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'TTL': '86400' },
  body: notificationPayload,  // Não encriptado!
});
```

Isto **falha** porque os push endpoints (Google/Apple) rejeitam pedidos sem encriptação VAPID.

### 3. Subscriptions Não Estão Activas
A verificação da base de dados mostra que **todos os utilizadores têm `push_subscription = NULL`**:
- `push_enabled: true` mas `has_subscription: false`
- Isto indica que o processo de subscrição não está a guardar correctamente ou está a falhar silenciosamente

### 4. Realtime Notifications Dependem da App Estar Aberta
O hook `useChatNotifications.ts` usa Supabase Realtime, que só funciona quando:
- O browser tem uma ligação WebSocket activa
- A tab está aberta (mesmo em background)
- Não funciona quando a app está fechada ou o telefone em standby

---

## Arquitectura Proposta

```text
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Browser    │     │   Supabase DB       │     │  Edge Function   │
│   (React)    │     │   Trigger           │     │  send-push       │
└──────┬───────┘     └──────────┬──────────┘     └────────┬─────────┘
       │                        │                         │
       │  1. Nova mensagem      │                         │
       │  INSERT messages       │                         │
       │───────────────────────>│                         │
       │                        │  2. Trigger dispara     │
       │                        │  para cada membro       │
       │                        │─────────────────────────>
       │                        │                         │  3. Encripta e envia
       │                        │                         │  via Web Push Protocol
       │                        │                         │────────> FCM/APNs
       │                        │                         │
       │  4. Realtime (se       │                         │
       │     app aberta)        │                         │
       │<───────────────────────│                         │
       │                        │                         │
       │  5. Push (se app       │                         │
       │     fechada/standby)   │<────────────────────────│
       │<─────────────────────────────────────────────────│
```

---

## Solução Completa

### Parte 1: Criar Trigger de Base de Dados para Notificações

Quando uma nova mensagem é inserida, um trigger chama automaticamente a edge function para **todos** os membros da conversa (excepto o remetente).

```sql
-- Trigger function para enviar push notifications
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  member RECORD;
  sender_name TEXT;
BEGIN
  -- Ignore system messages
  IF NEW.type = 'system' THEN
    RETURN NEW;
  END IF;
  
  -- Get sender name
  SELECT COALESCE(full_name, split_part(email, '@', 1))
  INTO sender_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notify each conversation member (except sender)
  FOR member IN
    SELECT cm.user_id
    FROM conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id != NEW.user_id
      AND cm.is_active = true
  LOOP
    -- Call edge function via pg_net (or insert into notification queue)
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'userId', member.user_id,
        'title', 'Nova mensagem de ' || COALESCE(sender_name, 'Alguém'),
        'body', LEFT(NEW.body, 100),
        'tag', 'chat-' || NEW.conversation_id,
        'data', jsonb_build_object(
          'type', 'message',
          'conversationId', NEW.conversation_id,
          'messageId', NEW.id
        )
      )::text
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_message();
```

### Parte 2: Corrigir Edge Function com Web Push Protocol Correcto

Usar a biblioteca `web-push` para Deno que faz a encriptação VAPID correctamente:

```typescript
// supabase/functions/send-push-notification/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push encryption helpers
async function encryptPayload(subscription: any, payload: string, vapidKeys: any) {
  // ... implement proper ECDH encryption
  // This is complex - use established pattern
}

async function sendWebPush(subscription: any, payload: any, vapidKeys: any) {
  // Generate proper VAPID JWT
  const jwt = await generateVapidJwt(subscription.endpoint, vapidKeys);
  
  // Encrypt the payload with ECDH
  const encrypted = await encryptPayload(subscription, JSON.stringify(payload), vapidKeys);
  
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': jwt.authorization,
      'Crypto-Key': jwt.cryptoKey,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: encrypted,
  });
  
  return response;
}
```

### Parte 3: Usar Biblioteca `web-push` Existente

Como a encriptação Web Push é complexa, a solução mais fiável é usar uma Edge Function que integra com um serviço de push (Firebase Cloud Messaging para Android/Web, APNs para iOS):

```typescript
// Alternativa: Usar OneSignal ou similar
// Ou implementar com a lib @panha/web-push para Deno
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  'mailto:geral@willflow.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

// Enviar push
await webpush.sendNotification(subscription, JSON.stringify(payload));
```

### Parte 4: Garantir Subscrições São Guardadas Correctamente

Actualizar o hook `usePushNotifications.ts` para:
1. Verificar se a subscrição foi guardada
2. Retry em caso de falha
3. Logging mais detalhado

```typescript
// Após subscription.toJSON()
console.log('[Push] Subscription created:', subscriptionJSON.endpoint);

// Verificar que foi guardado
const { data: saved } = await supabase
  .from('user_push_preferences')
  .select('push_subscription')
  .eq('user_id', user.id)
  .single();

if (!saved?.push_subscription) {
  console.error('[Push] Subscription NOT saved!');
  throw new Error('Failed to save subscription');
}
```

### Parte 5: Service Worker para Push Real

O `sw-push.js` actual está correcto, mas precisa de estar no scope principal para funcionar quando a app está fechada. Alterar:

```typescript
// usePushNotifications.ts - Mudar scope
const registration = await navigator.serviceWorker.register('/sw-push.js', {
  scope: '/',  // Scope principal para funcionar em background
});
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/send-push-notification/index.ts` | Implementar Web Push protocol com encriptação ECDH |
| `src/hooks/usePushNotifications.ts` | Corrigir scope do SW + verificação de subscrição |
| `src/hooks/useChatNotifications.ts` | Adicionar fallback para chamar edge function quando necessário |
| **Novo** Migration SQL | Criar trigger `on_new_message_notify` |

---

## Alternativa Simplificada

Se a implementação do Web Push protocol for muito complexa, podemos:

1. **Usar OneSignal/Firebase Cloud Messaging**: Serviços geridos que tratam da encriptação
2. **Usar Supabase Edge Function + Database Webhook**: Trigger que notifica via webhook

A opção mais simples é usar `web-push` npm package via Deno, que já trata de toda a encriptação.

---

## Impacto Esperado

- Notificações push **reais** quando a app está fechada
- Som e toast instantâneos quando a app está aberta
- Funciona em iOS Safari, Android Chrome, e browsers desktop
- Notificações mesmo com telefone em standby (desde que push permissions concedidas)

---

## Próximos Passos

1. Actualizar edge function com `web-push` npm package
2. Criar trigger de base de dados para novas mensagens
3. Corrigir registo do service worker
4. Testar em dispositivo móvel real com app em standby
