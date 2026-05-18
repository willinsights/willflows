
# Auditoria — Financeiro, Projetos/Kanban, Chat/Vídeo

Auditoria baseada em leitura direta dos ficheiros, queries e configuração. Métricas globais: **490 ficheiros TS/TSX, 97 hooks, 280 componentes, 51 edge functions, 179 migrações. 366 ocorrências de `any`/`as any`, 177 `console.log/error/warn`, apenas 4 `React.memo` em 280 componentes, 35 `setTimeout` sem limpeza garantida, 15 hooks diferentes que consultam a tabela `projects`, 2 pacotes de animação instalados (`motion` + `framer-motion`).**

---

## ÁREA 1 — FINANCEIRO

### Achados críticos

**F1. Mesma tabela `projects` consultada 4-6 vezes na página `/financeiro` em cada render**  
Em `FinanceiroLayout.tsx` e `VisaoGeral.tsx` montam simultaneamente: `usePayments()` + `useTeamPayments()` + `usePaymentsData()` + `useFinancialEngine()` + `useProjects()`. Cada um dispara um `SELECT projects` independente. `usePaymentsData` dispara DOIS selects iguais (custos e receita) onde a única diferença são colunas. Resultado: ~5-6 roundtrips em vez de 1.

**F2. `usePaymentsData` e `useFinancialEngine` ignoram a cache do React Query**  
São `useState` + `useEffect` puros. Não há `staleTime`, nem invalidação cruzada, nem partilha entre páginas. Mudar de aba refaz tudo. As outras hooks (`usePayments`) usam React Query — inconsistência arquitetural.

**F3. Após mudar estado de pagamento, refaz query inteira**  
`handleCostStatusChange` e `handleProjectRevenueStatusChange` fazem `UPDATE` seguido de `SELECT *` à tabela `projects`. Devia ser update otimista local + `queryClient.invalidateQueries`.

**F4. Métricas recalculadas em cada render**  
`useFinancialEngine` chama `getMonthlyMetrics`, `getMonthlySummary`, `getTimeSeries` em cada render sem `useMemo`. Em `VisaoGeral` há mais `useMemo` por cima que dependem destes valores → recálculos em cascata.

**F5. Dois conceitos paralelos de "receita"**  
`payments` (tabela legacy, "Outros Movimentos") e `project_revenue` (derivado de `projects.is_delivered`). Coexistem nos mesmos relatórios e podem ser somados em duplicado se o utilizador criar um pagamento manual para um projeto entregue.

**F6. Sem tratamento de erro em `usePaymentsData`**  
Erros de `supabase.from(...)` ficam no `data: null` sem qualquer toast/log. Falha silenciosa → utilizador vê "0 €" e pensa que não há dados.

**F7. `exceljs` (~600 KB) importado eagerly**  
Importado no topo dos hooks de export; deveria ser `await import('exceljs')` dinâmico dentro da função.

### Refactor proposto (Financeiro)

```text
src/hooks/finance/
  useFinanceData.ts        ← 1 hook, 1 fetch ao projects (com RQ), partilhado por todas as páginas
  useFinanceMetrics.ts     ← deriva metrics/summary/timeSeries com useMemo
  useFinanceMutations.ts   ← updates otimistas + invalidação
src/lib/finance/
  selectors.ts             ← funções puras: agregação por mês, status, equipa
  formulas.ts              ← lucro, margem, forecast
```

Consolidar `usePayments` + `useTeamPayments` + `usePaymentsData` + `useFinancialEngine` num único `<FinanceProvider>` montado em `FinanceiroLayout`, exposto via context. Páginas filhas leem do context — zero refetch ao navegar entre sub-tabs.

Decisão sobre `payments` legacy: ou (a) mantê-la apenas para "Outros Movimentos" não-projeto e renomear no UI para evitar confusão, ou (b) absorver tudo em `project_revenue` + `manual_movements`.

---

## ÁREA 2 — PROJETOS & KANBAN

### Achados críticos

**P1. `useKanban.ts` (1033 linhas) faz 6+ queries sequenciais por fetch**  
`fetchColumnsData` corre: `kanban_columns` → `project_team` (se freelancer) → `projects` → `tasks` → `task_checklists` → `project_team` (com profiles) → `profiles` → `video_approvals`. Tudo encadeado, **sem JOIN**. Para 50 projetos com 10 tasks cada, são ~8 roundtrips e ~3000 linhas transferidas.  
**Correção:** uma RPC `get_kanban_board(workspace_id, phase, user_id)` retorna o board completo num único request. Reduz tempo de carregamento de ~1.5s para ~250ms.

**P2. Realtime do Kanban subscreve `task_checklists` e `project_team` SEM filtro de workspace**  
```
.on('postgres_changes', { event: '*', schema: 'public', table: 'task_checklists' }, ...)
.on('postgres_changes', { event: '*', schema: 'public', table: 'project_team' }, ...)
```
Qualquer alteração de checklist/team de outro workspace dispara `silentRefresh()`. Custo: refetches inúteis. Adicionar `filter: 'workspace_id=eq.<id>'` (e, onde a coluna não existir, fazer join).

**P3. Anti-eco baseado em timestamps de 2s e visibilidade de 3s causa perda de updates**  
Se um colaborador move um cartão enquanto outro acabou de voltar à tab (< 3s), o segundo nunca vê a mudança. A solução robusta é "ignorar payloads cujo `new.updated_by === currentUserId`" — exige adicionar essa coluna ou usar `auth.uid()` no RLS.

**P4. `reorderColumns` faz UPDATE sequencial num `for` loop**  
N colunas = N roundtrips. Substituir por RPC `reorder_kanban_columns(jsonb)` ou `upsert` em batch.

**P5. `ProjectDetailsModal` (1490) e `ProjectDetailsSheet` (1343) são ~90% duplicados**  
Diferem só no chrome (Dialog vs Sheet). Toda a lógica está copiada. Qualquer correção tem de ser feita em dois sítios.

**P6. `CreateProjectModal` (930 linhas) acumula 7 responsabilidades**  
Form + validação + cliente quick-create + equipa + custos + ficheiros + automações. Sem `react-hook-form` schema — validação manual espalhada.

**P7. `moveProject` faz fire-and-forget para `kanban_column_transitions` e `execute-automations`**  
Sem `await`, sem retry. Se a edge function falhar, a automação simplesmente não corre — o utilizador nunca sabe. Deve haver queue persistida (`automation_jobs`) com retry e backoff.

**P8. Optimistic update sem rollback granular**  
Em falha de move, faz `fetchColumns()` (full refresh) em vez de reverter localmente. Pisca e perde scroll position.

**P9. Vários `as any` críticos em `useKanban`**  
`(project as any).item_type` aparece 3 vezes; o tipo `Project` JÁ tem o campo. Esconde erros de tipo reais.

**P10. `useFilteredProjects` + `useProjects` + `useKanban` fazem fetches paralelos**  
Mesmo workspace, mesma tabela, três caches diferentes.

### Refactor proposto (Kanban/Projetos)

```text
src/features/kanban/
  api/getKanbanBoard.rpc.ts       ← chama 1 RPC, retorna board
  api/moveProject.ts
  hooks/useKanbanBoard.ts         ← apenas data + realtime
  hooks/useKanbanActions.ts       ← move/reorder/validate
  components/KanbanBoard.tsx
  components/KanbanCard.tsx
src/features/projects/
  components/ProjectDetails/
    ProjectDetails.tsx            ← lógica e tabs partilhados (~500 linhas)
    ProjectDetailsDialog.tsx      ← envolve em Dialog
    ProjectDetailsSheet.tsx       ← envolve em Sheet (mobile)
  components/CreateProject/
    CreateProjectForm.tsx         ← react-hook-form + zod
    CreateProjectModal.tsx        ← apenas o wrapper
    sections/                     ← BasicInfo / Client / Team / Costs / Files
```

RPCs SQL a criar:
- `get_kanban_board(workspace_id, phase, user_id) → jsonb`
- `reorder_kanban_columns(workspace_id, jsonb_positions)`
- `move_project_with_transition(project_id, target_column_id, moved_by) → jsonb`
- `get_project_full(project_id) → jsonb` (substitui 4-5 selects do modal)

Adicionar tabela `automation_jobs(id, event, payload, status, retries, last_error)` + cron worker.

---

## ÁREA 3 — CHAT & VÍDEO

### Achados críticos

**C1. `useMessages` (476) faz N+1 controlado mas resolúvel num RPC**  
Por página: `messages` → `profiles` → `message_attachments` → `message_reactions` → `message_reads`. 5 queries por fetch. Criar `get_conversation_page(conv_id, cursor, page_size)` que retorna tudo embutido num só JSON.

**C2. Handler de INSERT em realtime faz fetch adicional ao `profiles` por cada mensagem**  
Em conversa ativa de chat (>10 msg/min), pode causar bursts. Cache global de profiles (`useProfilesCache`) resolve.

**C3. Subscrição realtime de `message_reactions` SEM filtro**  
Linha 409: subscreve TODAS as reactions de TODOS os workspaces. Toda a app inteira faz invalidate desnecessário em cada reação alheia. Adicionar filter por `conversation_id` ou lista de message_ids.

**C4. Upload de anexos em loop sequencial**  
`for (const file of attachments) { await upload(...) }` — devia ser `Promise.all`. Para 5 anexos, passa de 5×t para max(t).

**C5. `usePushNotifications` (469) tem race entre dois Service Workers**  
Tenta usar `/sw-push.js` OU o `sw.js` do Vite PWA. Os console logs mostram **dois** "Service Worker registered" em sequência. Pode levar a dupla notificação. Manter UM SW oficial e remover o outro.

**C6. VAPID key hardcoded no source**  
Linha 7. É chave pública (não é vulnerabilidade direta), mas devia vir de `import.meta.env.VITE_VAPID_PUBLIC_KEY` para suportar rotação e ambientes.

**C7. `VideoPlayer.tsx` (710) é state-machine HLS + UI + comments + thumbnail**  
Separar em:
```text
useHlsPlayer(source) → { videoRef, state, retry }
<VideoControls />
<CommentOverlay />
<ThumbnailCapture />
```

**C8. `VideoApproval.tsx` (1109) duplica a lógica HLS do `VideoPlayer`**  
Mesma importação de `Hls`, mesma máquina de estado. Esta página pública devia consumir o mesmo `useHlsPlayer`.

**C9. `ChatContextPanel.tsx` (957) mistura 5 features**  
Sidebar de contexto, edição de projetos, ações de follow-up, gestão de membros, busca. Split por secção.

**C10. Auditar nomes únicos dos 27 `supabase.channel(...)` da app**  
Garantir formato `(workspace, feature, instance)` para evitar colisões entre kanban/chat/notifications.

---

## TRANSVERSAL

**T1. Remover `motion` (pacote duplicado)** — `framer-motion` já está. ~80KB.  
**T2. Logger consistente** — substituir 177 `console.*` por `logger.*` (já existe). Em prod faz no-op.  
**T3. `any` → tipos reais** — 366 ocorrências. Começar pelos hooks (~80) e modais (~120).  
**T4. `React.memo` + `useCallback`** — `KanbanCard`, `KanbanColumn`, `ChatMessage`, `MessageReactions`. Cada coluna do Kanban com 20 cartões re-renderiza tudo a cada move.  
**T5. Cleanup de timers** — auditar 35 `setTimeout` em componentes; muitos sem `clearTimeout` no unmount.  
**T6. `dompurify`** — instalado mas baixa adoção; auditar onde se renderiza HTML/markdown bruto.  
**T7. Code-splitting** — `Auth.tsx` (1026), `BetaAdmin.tsx` (849), `Configuracoes.tsx` (1228), `Calendario.tsx` (1040) deviam ser `React.lazy()`. Reduz bundle inicial em ~150KB gzip.

---

## PLANO DE AÇÃO PRIORIZADO

### 🔴 CRÍTICO — fazer já

| # | Categoria | Esforço | Benefício | Ficheiros | Ação |
|---|---|---|---|---|---|
| C-1 | Performance/DB | Médio | Performance | `useKanban.ts` + migração | RPC `get_kanban_board`; substitui 6 queries por 1. |
| C-2 | Segurança/Perf | Pequeno | Custo realtime | `useKanban.ts` (l.507-524), `useMessages.ts` (l.409) | Filter `workspace_id=eq.<id>` em `task_checklists`, `project_team`, `message_reactions`. |
| C-3 | Correção | Pequeno | Fiabilidade | `useKanban.ts` (anti-eco) | Substituir guard de 2-3s por `updated_by === currentUserId`. |
| C-4 | Fiabilidade | Médio | Automações funcionam | `useKanban.moveProject`, edge `execute-automations`, nova tabela `automation_jobs` | Persistir job + retry em vez de fire-and-forget. |
| C-5 | Performance | Pequeno | UX percetível | `usePaymentsData.ts`, `useFinancialEngine.ts` | Migrar para React Query com `staleTime: 30s`. |

### 🟠 ALTO — antes da próxima release

| # | Categoria | Esforço | Benefício | Ficheiros | Ação |
|---|---|---|---|---|---|
| A-1 | Arquitetura | Grande | Manutenção | `ProjectDetailsModal/Sheet.tsx` | Extrair `ProjectDetails` partilhado; wrappers <100 linhas. |
| A-2 | Arquitetura | Médio | Manutenção | `useKanban.ts` | Quebrar em `useKanbanBoard` + `useKanbanRealtime` + `useKanbanActions`. |
| A-3 | Performance | Pequeno | -80KB | `package.json` | Remover `motion`, manter `framer-motion`. |
| A-4 | Performance | Médio | -~150KB inicial | `App.tsx` | `React.lazy` em todas as páginas >500 linhas. |
| A-5 | Performance | Pequeno | -600KB inicial | hooks de export | `await import('exceljs')` dinâmico. |
| A-6 | UX/Correção | Pequeno | Menos push duplicado | `usePushNotifications.ts`, `public/sw-push.js` | Unificar SW (manter Vite PWA, eliminar sw-push.js). |
| A-7 | Performance | Médio | Render Chat | `useMessages.ts` + RPC | `get_conversation_page` agregando profiles/attachments/reactions/reads. |

### 🟡 MÉDIO — próximo sprint

| # | Categoria | Esforço | Benefício | Ficheiros | Ação |
|---|---|---|---|---|---|
| M-1 | Arquitetura | Grande | Manutenção | `VideoPlayer.tsx`, `VideoApproval.tsx` | Extrair `useHlsPlayer` reutilizado. |
| M-2 | Arquitetura | Médio | Performance Chat | `ChatContextPanel.tsx` | Dividir em 5 sub-componentes lazy. |
| M-3 | Arquitetura | Médio | Consistência | hooks Finance | Consolidar 5 hooks em `<FinanceProvider>`. |
| M-4 | Performance | Médio | Re-renders | Kanban + Chat | `React.memo` + `useCallback` em cards/mensagens. |
| M-5 | Performance | Médio | -1 roundtrip/move | `useKanban.reorderColumns` | RPC `reorder_kanban_columns(jsonb)`. |
| M-6 | DX | Pequeno | Debug | toda a `src/` | Substituir 177 `console.*` por `logger.*`. |
| M-7 | Limpeza | Pequeno | Estabilidade | componentes vários | Cleanup dos 35 `setTimeout`. |

### 🟢 BAIXO — refatoração gradual

| # | Categoria | Esforço | Benefício | Ficheiros | Ação |
|---|---|---|---|---|---|
| B-1 | Tipos | Grande | Type-safety | toda a `src/` | Eliminar 366 `as any`. |
| B-2 | Arquitetura | Grande | Organização | `src/` → `src/features/` | Reorganizar por feature (kanban, finance, chat, video). |
| B-3 | Limpeza | Pequeno | Manutenção | hooks Admin | Consolidar `useAdminUsers/Workspaces/Metrics/Billing`. |
| B-4 | UX | Médio | Coerência | `CreateProjectModal.tsx` | Migrar para `react-hook-form` + `zod`. |
| B-5 | DB | Médio | Clareza | `payments` vs `project_revenue` | Deprecar ou separar claramente no UI. |

---

## 3 MELHORIAS ESTRUTURAIS DE ALTO IMPACTO

1. **Mover de "hooks-centric" para "feature-centric" (`src/features/<feature>/{api,hooks,components}`)** — Os 97 hooks numa pasta e 280 componentes noutra escondem o domínio. Reorganização por feature deixa cada área autocontida.
2. **Camada de dados via RPCs Postgres para cada vista agregada** — Kanban board, conversation page, project full, finance summary. Reduz roundtrips em ~70%, centraliza regras no DB.
3. **Queue persistida de automações** (`automation_jobs` + cron + retry). Acaba com fire-and-forget; todos os efeitos secundários ficam observáveis e re-executáveis.

---

**Próximo passo sugerido:** se aprovares este plano, começo pela "vaga crítica" — C-1 (RPC `get_kanban_board`) + C-2 (filtros realtime) + C-5 (Finance em React Query). Estes três sozinhos cortam ~60% das queries supérfluas e estabilizam o realtime.
