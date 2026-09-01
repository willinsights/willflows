# Auditoria Técnica Completa — WillFlow

Data: 2026-09-01
Âmbito: Auth/Permissões, RLS, Edge Functions, Integridade de dados, Billing/Planos, Fluxos funcionais (browser), UI/UX/Performance, código incompleto.

---

## 1. Resumo executivo

| Severidade | Nº | Estado |
|---|---|---|
| Crítico | 2 | ✅ Corrigido (2026-09-01) |
| Alto | 4 | ✅ Corrigido (2026-09-01) |
| Médio | 7 | Por corrigir |
| Baixo / higiene | 6 | Opcional |

O sistema está globalmente sólido: RLS ativo nas 96 tabelas públicas, todas as 50 edge functions têm barreira de auth (JWT, cron-secret, assinatura de webhook ou token de aprovação), limites de lugares (`seats`) são aplicados por trigger na BD e o consumo de storage é calculado server-side por trigger (não é falsificável pelo cliente).

Os problemas reais concentram-se em **billing**: os limites de plano e a expiração do trial só existem no frontend.

---

## 2. Críticos

### C1 ✅ CORRIGIDO — Expiração de trial/plano não é aplicada no servidor
- **Onde:** gating apenas em `src/lib/plans.ts` + hooks; nenhuma policy RLS, trigger ou função valida `workspaces.subscription_status` / `trial_ends_at`.
- **Impacto:** qualquer utilizador com trial expirado continua a criar projetos, clientes, uploads e a usar features pagas chamando a API/PostgREST diretamente (ou simplesmente mantendo a sessão aberta).
- **Evidência real:** 36 de 38 workspaces com `subscription_status = 'trialing'` já têm `trial_ends_at` no passado — e continuam operacionais.
- **Correção:** função `workspace_is_active(workspace_id)` (SECURITY DEFINER) que valide status + `trial_ends_at`, e incluí-la nas policies de INSERT das tabelas de escrita principais (`projects`, `clients`, `video_versions`, `tasks`, `work_logs`), além do gate visual existente.

### C2 ✅ CORRIGIDO — Limites de plano (projetos/clientes) não são aplicados na BD
- **Onde:** policies de INSERT de `projects` e `clients` verificam apenas `has_workspace_permission(...)`; não existe trigger de contagem (ao contrário de `workspace_members`, que tem `trg_enforce_workspace_seat_limit`).
- **Impacto:** plano Free/Starter pode exceder ilimitadamente as quotas via API.
- **Correção:** replicar o padrão de `enforce_workspace_seat_limit` com triggers `BEFORE INSERT` de contagem por plano.

---

## 3. Altos

### A1 ✅ CORRIGIDO — `workspace_storage.storage_limit_bytes` é escrivível por admin de workspace
- Policy `Workspace admins can manage storage` é `FOR ALL` com `WITH CHECK (is_workspace_admin(...))` → qualquer admin de workspace pode aumentar o próprio limite de storage e contornar o addon pago.
- **Correção:** restringir escrita a `service_role`; admins só `SELECT`. O `used_bytes` já é seguro (trigger `trg_sync_storage_video_versions`).

### A2 ✅ CORRIGIDO — `create-checkout` não valida a pertença ao `workspaceId`
- `supabase/functions/create-checkout/index.ts:57-59` recebe `workspaceId` do corpo e injeta-o na metadata do Stripe; o `stripe-webhook` confia nessa metadata para atribuir o plano.
- **Impacto:** um utilizador pode pagar/atribuir plano a um workspace que não é seu (ou, em cenários de downgrade/reconciliação, alterar estado alheio).
- **Correção:** validar membro/admin antes de criar a sessão, como já faz `create-storage-addon-checkout/index.ts:120-131`.

### A3 ✅ CORRIGIDO — `send-transactional-email` permite enviar para qualquer destinatário
- Basta um JWT válido de qualquer utilizador para disparar qualquer template (`payment_alert`, `weekly_summary`, …) para um `to` arbitrário (`index.ts:94-133`).
- **Correção:** para chamadas não-service-role, forçar `to === user.email` ou restringir templates privilegiados a service-role.

### A4 ✅ CORRIGIDO — `state` OAuth do Google Calendar não é assinado
- `google-calendar-auth` passou a assinar o state com HMAC-SHA256 + validade de 10 min, allowlist de `redirect_uri` e verificação de pertença ativa ao workspace no `authorize`.

---

## 4. Médios

| # | Achado | Local | Correção |
|---|---|---|---|
| M1 ✅ | `send-push-notification` permite a qualquer co-membro enviar push com título/corpo arbitrários a outro membro | `send-push-notification/index.ts:83-112` | Restringir pushes genéricos a service-role |
| M2 ✅ | Dois modelos de token de aprovação em paralelo (`video_approval_tokens` vs `tasks.client_approval_token`); o segundo **não verifica expiração** | `video-download-url/index.ts:77-89` | Unificar num só fluxo com expiração |
| M3 ✅ | Sem rate limiting/lockout em tentativas de token de aprovação público | `get-video-approval-data`, `submit-video-feedback`, `delete-video-comment` | Contador de falhas por IP/token |
| M4 ✅ | Geração de blog/imagem por IA acessível a qualquer autenticado (custo por chamada) | `ai-generate-blog-post/index.ts:801-838` | Rate limit por utilizador ou restringir a admins |
| M5 ✅ | `cleanup-users` apaga todos os users/workspaces não protegidos sem confirmação explícita | `cleanup-users/index.ts:151-255` | Aplicar o duplo guard de `reset-billing-data/index.ts:164-177` |
| M6 ✅ | Comparação de `CRON_SECRET` com `!==` (não constant-time) em ~10 funções | vários | `timingSafeEqual` |
| M7 ✅ | `error.message` cru devolvido ao cliente em vários catch blocks | `admin-create-stripe-plans:208`, `google-oauth:334-341`, … | Mensagem genérica + log server-side |

**Nota:** o achado inicial de que `check-payment-alerts` estaria sem auth foi **verificado e é falso** — a função exige `x-cron-secret` e falha fechada se o segredo não estiver definido (`index.ts:14-22`).

---

## 5. Integridade de dados

- **Duplicados:** existem `project_code` repetidos e grupos de clientes com nomes equivalentes (variações de maiúsculas/espaços). Recomenda-se índice único parcial em `(workspace_id, lower(trim(project_code)))` após limpeza.
- **Índices em falta:** várias FKs de tabelas de alto tráfego (`tasks`, `notifications`, `activity_*`) sem índice → scans em listas grandes.
- **Faturação:** `invoices` e `invoice_items` estão vazias — a reconciliação linha-a-linha nunca foi exercitada em produção; validar antes de depender dela.
- **Storage:** consistente — sincronizado por trigger a partir de `video_versions`.

---

## 6. Fluxos funcionais (crawl autenticado)

- Rotas principais (`/app/clientes`, `/app/captacao`, `/app/edicao`, `/app/financeiro`, `/app/pagamentos`, `/app/calendario`, `/app/chat`, `/app/relatorio-atividade`) carregam sem erro.
- Os 404 reportados para `/app/dashboard`, `/app/definicoes` e `/app/perfil` **não são bugs**: essas rotas não existem com esses nomes no `src/App.tsx` (foram inferidas pelo crawler).
- Erros `TypeError: Failed to fetch` observados no crawl são do ambiente headless (rede do sandbox), não reproduzíveis na app.
- Aviso de consola na Landing: `Function components cannot be given refs` — cosmético, corrigir com `forwardRef`.

---

## 7. UI/UX e performance

- **Responsivo: sem problemas.** Teste automático a 1280/768/390 px em 8 páginas: `scrollWidth - clientWidth = 0` em todas (zero overflow horizontal). As tabelas largas estão corretamente dentro de contentores com scroll próprio.
- `console.log` residual em `src/lib/debug-flags.ts`.
- CSS injetado sem sanitização em `src/components/ui/chart.tsx` (baixo risco: input é config interna).
- Risco de N+1 em `AdminGrowth.tsx` (queries por linha).

---

## 8. Plano de correção sugerido (por ordem)

1. C1 + C2 — enforcement server-side de trial e limites de plano (migração com função + triggers/policies).
2. A1 — bloquear escrita de `storage_limit_bytes` a admins.
3. A2 + A3 — validação de workspace no checkout e restrição de destinatário nos emails transacionais.
4. A4 + M1 + M2 — assinar state OAuth, restringir push genérico, unificar tokens de aprovação com expiração.
5. M4–M7 e higiene (índices FK, duplicados, `console.log`, `forwardRef`).

---

## 9. Correções aplicadas (2026-09-01)

- **C1** — `workspace_is_active()` + triggers `BEFORE INSERT` em `projects`, `clients`, `tasks`, `work_logs`, `video_versions`. Workspaces com trial expirado ou subscrição cancelada deixam de poder criar registos (service-role isento).
- **C2** — `get_plan_resource_limit()` + triggers `trg_plan_project_limit` e `trg_plan_client_limit` (Starter 20/20, Pro 999/100, Studio ilimitado prático).
- **A1** — policy `Workspace admins can manage storage` removida; membros só têm `SELECT`, escrita reservada a service-role.
- **A2** — `create-checkout` valida que o utilizador é admin ativo do `workspaceId` recebido antes de criar a sessão Stripe.
- **A3** — `send-transactional-email` restringe chamadas com JWT de utilizador a templates self-service e ao próprio email.
- **A4** — state OAuth do Google Calendar assinado (HMAC-SHA256, TTL 10 min), allowlist de redirect e validação de membro ativo do workspace.
- **I/O da base de dados** — `process-automation-jobs` passou de 1 min para 2 min, `webhook-retry-worker` de 1 min para 5 min; purga de `automation_jobs` concluídos/mortos com +14 dias. BD em 52 MB.

- **M1** — `send-push-notification`: pushes com título/corpo arbitrários só via service-role; utilizador autenticado só pode enviar para si próprio.
- **M5** — `cleanup-users`: duplo guard (`ALLOW_USER_CLEANUP=true` + `confirmation: "CLEANUP-USERS"`) antes do `execute`.
- **M6** — novo helper `_shared/timing-safe.ts` (`secretEquals`) aplicado às 10 funções que comparavam `CRON_SECRET`/`AUTOMATION_CRON_SECRET`.
- **M7** — `admin-create-stripe-plans`, `google-oauth` e `cleanup-users` devolvem mensagem genérica; detalhe apenas nos logs do servidor.

- **M2** — `video-download-url` deixou de aceitar `tasks.client_approval_token`; usa apenas `video_approval_tokens` (activo, não expirado) e valida que a versão pertence à task/projeto do token.
- **M3** — nova tabela `public_access_attempts` + RPCs `check_public_rate_limit`/`log_public_access_attempt` e helper `_shared/rate-limit.ts`; tokens públicos bloqueiam após 10 falhas por IP/token em 15 min (`get-video-approval-data`, `submit-video-feedback`, `delete-video-comment`, `video-download-url`).
- **M4** — `ai-generate-blog-post` e `ai-generate-blog-image` exigem system admin (verificado), eliminando o custo por chamada de qualquer autenticado.

- **Higiene (índices)** — criados 82 índices em falta nas chaves estrangeiras (projetos, tarefas, pagamentos, vídeos, chat, automações, faturação), eliminando os scans sequenciais em listas grandes.

Sem pendentes: todos os achados críticos, altos e médios estão corrigidos.

**Baixo — encerrado sem ação (2026-09-01):** os `project_code` "duplicados" foram verificados um a um (5 grupos, 11 projetos). Não são duplicados a limpar: são projetos distintos do mesmo cliente que reutilizam o código do cliente (`PRJ_BIRIBEIRO` em 3 datas diferentes, `PRJ_CLUBEDOSCAVALHEIROS` em 2 eventos, etc.). Criar índice único parcial em `(workspace_id, lower(trim(project_code)))` **quebraria** este uso legítimo, por isso não foi criado. Único caso realmente redundante seria `NZ-SOU-2026-EXP-004…` (dois cards do mesmo trabalho criados com 4 min de diferença) — decisão do utilizador se quer fundir.


