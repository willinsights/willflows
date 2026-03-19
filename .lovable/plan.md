

# Sistema de Automações e Notificações baseado no Workflow

## Resumo

Sistema de automações configurável por workspace com lógica **Trigger → Condition → Action**, integrado ao Kanban existente, reutilizando a infraestrutura de email (pgmq queue, `send-transactional-email`) e notificações in-app (`notifications` table).

---

## Arquitetura

```text
┌─ Evento (Kanban move, projeto criado, etc.) ─┐
│                                                │
▼                                                │
useKanban.ts / triggers SQL                      │
│                                                │
▼                                                │
Edge Function: execute-automations               │
├── Busca automações ativas para o evento        │
├── Avalia condições                             │
├── Resolve destinatários                        │
├── Renderiza templates com variáveis            │
├── Enfileira emails (enqueue_email)             │
├── Cria notificações in-app                     │
└── Loga em automation_execution_log             │
```

---

## Modelo de Dados

### Novas tabelas

**`workflow_automations`** -- definição das automações
- `id`, `workspace_id`, `name`, `description`
- `is_active` (boolean)
- `trigger_type` (enum: `card_enters_column`, `card_leaves_column`, `card_moved`, `project_created`, `project_delivered`, `project_archived`, `comment_added`)
- `trigger_config` (jsonb) -- ex: `{ "column_id": "uuid" }` ou `{ "from_column_id": "...", "to_column_id": "..." }`
- `conditions` (jsonb, nullable) -- filtros adicionais futuros
- `action_type` (enum: `send_email`, `notify_in_app`, `webhook`)
- `action_config` (jsonb) -- template, subject, body com variáveis
- `recipient_config` (jsonb) -- `{ "type": "project_team" | "project_owner" | "project_client" | "role" | "fixed_emails" | "group", "value": "..." }`
- `created_by`, `created_at`, `updated_at`

**`automation_recipient_groups`** -- grupos personalizados
- `id`, `workspace_id`, `name`
- `members` (jsonb) -- array de `{ user_id }` ou `{ email }`
- `created_at`, `updated_at`

**`automation_execution_log`** -- histórico
- `id`, `automation_id`, `project_id`, `workspace_id`
- `trigger_type`, `action_type`
- `recipients` (jsonb)
- `status` (text: `sent`, `failed`, `skipped`)
- `error_message` (text, nullable)
- `executed_at`

**Reutilização:** `notifications` (in-app), `email_send_log` (emails), `kanban_column_transitions` (trigger source), `workspace_role_permissions` (permissões).

---

## Edge Function: `execute-automations`

Recebe payload com:
- `event_type` (trigger type)
- `project_id`, `workspace_id`
- `column_id` / `from_column_id` / `to_column_id`
- `triggered_by` (user_id)

Fluxo:
1. Query `workflow_automations` matching event + workspace + active
2. Para cada automação: resolver destinatários (query project_team, clients, roles, groups)
3. Substituir variáveis no template: `{project_name}`, `{client_name}`, `{column_name}`, `{user_name}`, `{workspace_name}`, `{link_project}`
4. Emails → `enqueue_email` (reutiliza queue existente)
5. Notificações → insert em `notifications`
6. Log em `automation_execution_log`

---

## Integração com Kanban

No `useKanban.ts`, após o `moveProject` (linha ~734), adicionar chamada assíncrona:

```text
supabase.functions.invoke('execute-automations', {
  body: {
    event_type: 'card_enters_column',
    project_id, workspace_id,
    to_column_id: targetColumnId,
    from_column_id: sourceColumn?.id,
    triggered_by: userId
  }
})
```

Similarmente para `project_created`, `project_delivered` (no `deliver_project` RPC ou após confirmação).

---

## UI / Componentes

### 1. Builder de Automações (modal/sheet)
- `AutomationBuilder.tsx` -- formulário step-by-step
  - Step 1: Escolher trigger (dropdown com ícones)
  - Step 2: Configurar trigger (selecionar coluna, etc.)
  - Step 3: Escolher ação (email / notificação)
  - Step 4: Selecionar destinatários (multi-select com categorias)
  - Step 5: Editar template (textarea com variáveis clicáveis + preview)

### 2. Lista de Automações por Workspace
- `AutomationsList.tsx` -- tab em Configurações
- Cards com formato: "Quando card entra em **Aprovação** → Enviar email a **Equipa Marketing**"
- Toggle ativo/inativo, editar, eliminar

### 3. Configuração rápida por Coluna
- `ColumnAutomationsPopover.tsx` -- no header da coluna Kanban
- Ícone de raio (⚡) com badge de count
- Lista automações associadas à coluna + botão adicionar

### 4. Histórico no Projeto
- `ProjectAutomationLog.tsx` -- nova secção no ProjectDetailsSheet
- Lista cronológica: "Email enviado a marketing@... → Aprovação Marketing"

### 5. Grupos de Destinatários
- `RecipientGroupsManager.tsx` -- em Configurações
- CRUD de grupos com membros

### 6. Template de Email para Automações
- `automation-notification.tsx` -- novo template em `_shared/email-templates/`
- Design consistente com templates existentes (marca WillFlow, cor violeta)

---

## Permissões

Reutilizar sistema existente de `workspace_role_permissions`:
- `automations.view` -- ver automações
- `automations.manage` -- criar/editar/eliminar automações
- Admin: tudo; Gestão: view + manage; Edição: view; Visualização: sem acesso

Feature gating: automações disponíveis apenas no plano **Studio** (já configurado em `plans.ts`).

---

## Fases de Implementação

| Fase | Escopo |
|------|--------|
| **1** | DB (tabelas + RLS) + Edge Function `execute-automations` + integração `useKanban` para trigger `card_enters_column` |
| **2** | UI: AutomationBuilder + AutomationsList em Configurações + template de email |
| **3** | Configuração por coluna (popover no Kanban) + grupos de destinatários |
| **4** | Histórico no projeto + triggers adicionais (project_created, delivered, comment) |
| **5** | Webhooks + alertas de tempo (SLA) + métricas de automações |

Sugiro começar com **Fase 1 + 2** juntas.

---

## Edge Cases

1. **Loop infinito** -- automação que move card e dispara outra automação → flag `triggered_by_automation` para bloquear cascata
2. **Destinatário sem email** -- skip silencioso + log
3. **Coluna eliminada** -- automação fica inativa automaticamente (check na execução)
4. **Rate limiting** -- reutiliza o sistema de queue existente com retry
5. **Muitas automações** -- execução assíncrona via Edge Function, não bloqueia UI

---

## Melhorias Estratégicas

1. **Templates pré-definidos** -- "Notificar cliente quando entregue", "Alertar equipa quando em revisão" (one-click setup)
2. **Integração financeira** -- trigger quando pagamento é recebido/vencido → já existe `check-payment-alerts`, unificar
3. **Métricas de automações** -- dashboard com emails enviados, taxa de abertura, execuções por período
4. **Marketplace de automações** -- templates partilháveis entre workspaces
5. **Condições compostas** -- "Se projeto é do cliente X E tipo é Vídeo" (fase futura)
6. **CRM integration** -- trigger quando lead muda de estado no pipeline

