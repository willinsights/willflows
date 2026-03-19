

# Time Tracking por Projeto -- Plano de Implementação

## Resumo Executivo

Sistema completo de registo de tempo integrado ao Kanban existente, com dois eixos: **tempo ativo de produção** (sessões manuais de trabalho) e **tempo por coluna** (automático via movimentos no Kanban). Reutiliza a tabela `project_phase_history` já existente (mas não utilizada) e expande com novas tabelas para sessões de trabalho.

---

## Fase 1 -- Fundação de Dados e Timer Básico

### 1.1 Migração de Base de Dados

**Novas tabelas:**

```text
time_sessions
├── id (uuid, PK)
├── project_id (FK projects)
├── user_id (FK auth.users)
├── workspace_id (FK workspaces)
├── started_at (timestamptz)
├── ended_at (timestamptz, nullable)
├── duration_seconds (int, computed on end)
├── column_id (FK kanban_columns, nullable) -- coluna quando iniciou
├── is_manual (boolean, default false)
├── notes (text, nullable)
├── created_at / updated_at

time_session_adjustments (log de auditoria)
├── id (uuid, PK)
├── session_id (FK time_sessions)
├── adjusted_by (FK auth.users)
├── old_started_at / new_started_at
├── old_ended_at / new_ended_at
├── reason (text, NOT NULL)
├── created_at

kanban_column_transitions (expandir project_phase_history)
├── id (uuid, PK)
├── project_id (FK projects)
├── workspace_id (FK workspaces)
├── from_column_id (FK kanban_columns, nullable)
├── to_column_id (FK kanban_columns)
├── moved_by (FK auth.users)
├── moved_at (timestamptz)
├── movement_type (text: 'manual' | 'automatic')

workspace_time_settings
├── id (uuid, PK)
├── workspace_id (FK workspaces, UNIQUE)
├── auto_start_columns (uuid[]) -- colunas que iniciam timer
├── auto_pause_columns (uuid[]) -- colunas que pausam timer
├── allow_multiple_timers (boolean, default false)
├── require_adjustment_reason (boolean, default true)
├── production_columns (uuid[]) -- contam como produção
├── waiting_columns (uuid[]) -- contam como espera
├── sla_alert_hours (int, nullable)
├── inactivity_alert_hours (int, nullable)
```

**RLS Policies:** Todas as tabelas com workspace isolation via `is_workspace_member()`. Sessões de tempo: utilizador vê as próprias; admin/gestão vê todas do workspace.

**Novas permissões** a adicionar ao `initialize_workspace_permissions`:
- `timetracking.view_own` -- ver os próprios tempos
- `timetracking.view_all` -- ver tempos de toda a equipa
- `timetracking.manage` -- ajustar sessões de outros
- `timetracking.settings` -- configurar regras do workspace

### 1.2 Hook `useTimeTracking`

- `startTimer(projectId)` -- cria sessão, valida conflitos
- `pauseTimer(sessionId)` -- define `ended_at`, calcula duration
- `resumeTimer(projectId)` -- cria nova sessão
- `getActiveTimer()` -- sessão sem `ended_at` do user atual
- `getProjectSessions(projectId)` -- todas as sessões
- `adjustSession(sessionId, changes, reason)` -- com log de auditoria
- Subscrição realtime para sincronizar estado do timer entre tabs

### 1.3 Componentes UI do Timer

**No KanbanCard:** Indicador discreto (ícone pulsante) quando timer ativo.

**No ProjectDetailsSheet:** Nova tab "Tempo" com:
- Botão Play/Pause/Retomar (estados claros)
- Contador ao vivo (atualizado a cada segundo localmente)
- Total acumulado do projeto
- Lista de sessões recentes
- Resumo por coluna (via `kanban_column_transitions`)

**Proteção de navegação:** `beforeunload` event quando timer ativo.

**Conflito de timers:** Ao iniciar timer com outro ativo, dialog de confirmação para pausar o anterior.

---

## Fase 2 -- Registo Automático de Movimentos

### 2.1 Integrar no `moveProject` do `useKanban.ts`

Ao mover projeto entre colunas:
1. Inserir registo em `kanban_column_transitions`
2. Verificar `workspace_time_settings`:
   - Se destino está em `auto_start_columns` → iniciar timer (ou sugerir)
   - Se destino está em `auto_pause_columns` → pausar timer ativo
3. Calcular `rework_count` (movimentos de revisão/aprovação → edição/alterações)

### 2.2 Trigger SQL para `project_phase_history`

Reutilizar a tabela existente. Trigger `AFTER UPDATE` em `projects` quando `captacao_column_id` ou `edicao_column_id` muda:
- Fechar registo anterior (`exited_at = now()`, calcular `duration_hours`)
- Abrir novo registo (`entered_at = now()`)

---

## Fase 3 -- Painel de Tempo no Projeto

### 3.1 Tab "Tempo" no ProjectDetailsSheet

```text
┌─────────────────────────────────────┐
│ ▶ Iniciar Produção    00:00:00      │
│                                     │
│ ┌─ Resumo ────────────────────────┐ │
│ │ Tempo Ativo: 12h 30m            │ │
│ │ Tempo de Ciclo: 5d 4h           │ │
│ │ Revisões: 2 │ Retornos: 1       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Tempo por Coluna ─────────────┐ │
│ │ Edição       │ 8h 20m │ 2x     │ │
│ │ Revisão      │ 3h 10m │ 3x     │ │
│ │ Aprovação    │ 1d 2h  │ 1x     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Sessões ──────────────────────┐ │
│ │ 19 Mar 09:10-11:30 (2h 20m) JD │ │
│ │ 19 Mar 14:00-16:20 (2h 20m) JD │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Timeline ─────────────────────┐ │
│ │ • Entrou em Edição       09:10  │ │
│ │ • Timer iniciado         09:10  │ │
│ │ • Timer pausado          11:30  │ │
│ │ • Movido p/ Revisão      11:35  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 3.2 RPC `get_project_time_summary`

Função SQL que retorna:
- `total_active_seconds`, `total_cycle_seconds`, `total_waiting_seconds`
- Tempo por coluna (array)
- `rework_count`, `revision_return_count`
- `first_started_at`, `delivered_at`

---

## Fase 4 -- Relatórios de Tempo

### 4.1 Nova secção em `Relatorios.tsx`

Secção "Análise de Tempo" com:
- **Filtros:** período, editor, cliente, tipo de projeto, coluna
- **Métricas:** total horas ativas, média por projeto, média por editor
- **Gráficos:**
  - Barras: tempo médio por coluna (identificar gargalos)
  - Ranking: editores por horas trabalhadas
  - Ranking: projetos mais demorados
  - Comparação: tempo ativo vs tempo total de ciclo

### 4.2 Componentes de Relatório

- `TimeTrackingReport.tsx` -- secção completa
- `ColumnTimeChart.tsx` -- barras por coluna
- `EditorRankingTable.tsx` -- ranking de editores
- `ProjectTimeTable.tsx` -- tabela de projetos com tempos
- Hook `useTimeReportData.ts` -- dados agregados via RPC

---

## Fase 5 -- Configurações e Alertas

### 5.1 Página de Configurações

Nova secção em `Configuracoes.tsx` → "Gestão de Tempo":
- Selecionar colunas de produção vs espera
- Auto-start / auto-pause por coluna
- Permitir múltiplos timers
- SLA por coluna (alerta após X horas)
- Alerta de inatividade

### 5.2 Sistema de Alertas

Notificações (reutilizando tabela `notifications`):
- Projeto sem atividade há X dias
- Projeto na mesma coluna há muito tempo
- Timer ativo há mais de 8h sem pausa
- Retrabalho excessivo (>3 retornos)

---

## Componentes a Criar

| Componente | Localização |
|---|---|
| `useTimeTracking.ts` | `src/hooks/` |
| `useTimeReportData.ts` | `src/hooks/` |
| `ProjectTimeTab.tsx` | `src/components/projects/` |
| `TimerButton.tsx` | `src/components/time-tracking/` |
| `TimerIndicator.tsx` | `src/components/time-tracking/` |
| `SessionsList.tsx` | `src/components/time-tracking/` |
| `ColumnTimeBreakdown.tsx` | `src/components/time-tracking/` |
| `ProjectTimeline.tsx` | `src/components/time-tracking/` |
| `AdjustSessionDialog.tsx` | `src/components/time-tracking/` |
| `TimeTrackingReport.tsx` | `src/components/reports/` |
| `TimeTrackingSettings.tsx` | `src/components/settings/` |

---

## Edge Cases Identificados

1. **Timer esquecido** -- limitar a 12h automáticas; alertar após 8h
2. **Múltiplas tabs** -- sincronizar via realtime; estado consistente
3. **Offline** -- armazenar localmente e sincronizar ao reconectar
4. **Projeto entregue com timer ativo** -- forçar pausa automática
5. **Coluna eliminada** -- manter referência histórica; mostrar "Coluna removida"
6. **Fuso horário** -- usar sempre UTC no backend; converter no frontend
7. **Reabrir projeto** -- manter histórico; novo ciclo não apaga dados anteriores

---

## Riscos de UX e Mitigações

| Risco | Mitigação |
|---|---|
| Timer esquecido gera dados irreais | Alerta visual persistente + auto-pause após X horas |
| Confusão entre "tempo ativo" e "tempo na coluna" | Labels claros: "Tempo Trabalhado" vs "Tempo na Etapa" |
| Sobrecarga visual no Kanban card | Indicador minimal (apenas ícone pulsante, sem contador no card) |
| Resistência da equipa ao tracking | Timer opcional; configurável por workspace; sem micro-gestão |

---

## Melhorias Estratégicas

1. **Custo/Hora por Projeto** -- cruzar tempo ativo com `v_project_profit` para calcular rentabilidade por hora
2. **Estimativas** -- após acumular dados, sugerir tempo estimado para novos projetos baseado no tipo/cliente
3. **Benchmarks** -- comparação do tempo médio por tipo de projeto ao longo dos meses
4. **Dashboard Widget** -- "Meu timer" no dashboard com projeto ativo e horas do dia
5. **Integração calendário** -- correlacionar sessões com eventos do Google Calendar

---

## Plano de Fases

| Fase | Escopo | Prioridade |
|---|---|---|
| 1 | DB + Timer básico + UI no projeto | Alta -- core |
| 2 | Registo automático de movimentos | Alta -- essencial |
| 3 | Tab de tempo detalhada + timeline | Média |
| 4 | Relatórios e gráficos | Média |
| 5 | Configurações + Alertas + SLA | Baixa -- refinamento |

Sugiro implementar **Fases 1 e 2 juntas** (são interdependentes) e depois iterar.

