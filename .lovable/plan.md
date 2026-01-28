

# Plano: Notificações Push em Tempo Real (PWA Instalada)

## Situação Atual

Analisei o sistema de notificações existente e identifiquei o que **já funciona** e o que **precisa ser melhorado**:

### ✅ O que já existe:
1. **Notificações de Chat** (`useChatNotifications.ts`) - Recebe alertas em tempo real quando novas mensagens chegam
2. **Sistema de Push Preferences** (`usePushNotifications.ts`) - Permite ativar/desativar notificações e configurar preferências
3. **Edge Function `check-deadlines`** - Cron job que verifica prazos e eventos próximos (mas só cria na tabela `notifications`)
4. **Real-time na tabela `notifications`** (`useNotifications.ts`) - Recebe novas notificações do backend e mostra toasts
5. **PWA configurada** - O app pode ser instalado no telemóvel/computador

### ⚠️ O que falta:
O sistema de notificações de **deadlines e eventos** apenas cria registos na tabela `notifications` (via cron hourly). **Não envia notificações push nativas** para o dispositivo quando o app está fechado/em background.

Para receber notificações push verdadeiras quando o app está instalado, é necessário:
1. **Service Worker com Push API** - Para receber notificações mesmo com o app fechado
2. **Push Subscription** - Registar o dispositivo para receber push
3. **Backend que envia push** - Edge function que usa Web Push API para enviar notificações

---

## Solução Proposta

### Fase 1: Expandir Notificações de Projetos/Tarefas em Tempo Real

Criar um hook similar ao `useChatNotifications` para projetos e tarefas que:
- Escuta mudanças em tempo real via Supabase Realtime
- Envia notificações push nativas quando há atualizações relevantes
- Funciona enquanto o app está aberto (foreground)

### Fase 2: Push Notifications com Service Worker (Background)

Para notificações quando o app está **fechado**:

1. **Atualizar Service Worker** para suportar push events
2. **Registar Push Subscription** no dispositivo
3. **Guardar subscription** na tabela `user_push_preferences.push_subscription`
4. **Edge Function** que envia Web Push (usando VAPID keys)

---

## Implementação Técnica

### 1. Novo Hook: `useRealtimeNotifications.ts`

Escuta mudanças em projetos, tarefas e eventos para notificar em tempo real:

```text
src/hooks/useRealtimeNotifications.ts
├── Subscreve tabela 'projects' (mudanças de fase, entrega)
├── Subscreve tabela 'tasks' (novas tarefas atribuídas)
├── Subscreve tabela 'calendar_events' (novos eventos)
└── Dispara sendLocalNotification() para cada evento relevante
```

### 2. Integrar no Layout

Adicionar o hook ao `AppLayout.tsx` e `MobileAppLayout.tsx`:

```text
// AppLayout.tsx
useChatNotifications();     // ← já existe
useRealtimeNotifications(); // ← novo
```

### 3. Melhorar Push para Background (Opcional - Fase 2)

Para push quando app fechado:

| Componente | Descrição |
|------------|-----------|
| `public/sw-push.js` | Service Worker com evento `push` |
| Edge Function `send-push` | Usa Web Push API com VAPID keys |
| `user_push_preferences.push_subscription` | Guarda subscription do dispositivo |

**Nota:** A Fase 2 requer configurar VAPID keys (chaves públicas/privadas para Web Push).

---

## Ficheiros a Criar/Alterar

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/hooks/useRealtimeNotifications.ts` | **Criar** | Novo hook para notificações real-time de projetos/tarefas |
| `src/components/layout/AppLayout.tsx` | **Alterar** | Importar e usar o novo hook |
| `src/components/layout/MobileAppLayout.tsx` | **Alterar** | Importar e usar o novo hook |

---

## Fluxo de Notificações (Após Implementação)

```text
┌──────────────────────────────────────────────────────────────┐
│                    App Instalado (PWA)                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │  Supabase   │───▶│ Realtime Hook   │───▶│ Push Native  │ │
│  │  Realtime   │    │ (foreground)    │    │ Notification │ │
│  └─────────────┘    └─────────────────┘    └──────────────┘ │
│         │                                                    │
│         │  ┌─────────────────┐    ┌──────────────────────┐  │
│         └─▶│ Tabela          │───▶│ Toast + Badge        │  │
│            │ notifications   │    │ (NotificationCenter) │  │
│            └─────────────────┘    └──────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Tipos de Notificações Real-Time

| Evento | Descrição | Tipo |
|--------|-----------|------|
| Nova tarefa atribuída | Quando alguém te atribui uma tarefa | `info` |
| Projeto avançou de fase | Projeto passou de captação para edição | `info` |
| Projeto entregue | Projeto marcado como entregue | `success` |
| Prazo próximo | Entrega em menos de 24h (via cron existente) | `warning` |
| Nova mensagem | Chat de projeto/tarefa (já existe) | `info` |

---

## Resultado Esperado

Após implementação:

- ✅ **App aberto**: Notificações push nativas + toast + som quando há novidades
- ✅ **PWA instalada (foreground)**: Mesmo comportamento do app aberto
- ✅ **Configurável**: Utilizador controla quais notificações receber nas Definições
- ⚠️ **PWA em background**: Requer Fase 2 com Service Worker Push (implementação futura)

---

## Notas Importantes

1. **Compatibilidade**: Notificações push nativas funcionam no Chrome, Edge, Firefox e Safari (iOS 16.4+)
2. **Permissão**: O utilizador precisa permitir notificações (já existe UI para isso em Definições)
3. **PWA**: Para melhor experiência, o utilizador deve instalar o app (Add to Home Screen)
4. **Background**: Notificações com app completamente fechado requerem implementação adicional com Web Push API

