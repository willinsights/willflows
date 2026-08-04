# Tarefas no calendário + Registo de Trabalhos + campos obrigatórios nos cards

## 1. Renomear "Reunião/Compromisso" para "Tarefa"

No calendário e nos atalhos (Dashboard, detalhes de projeto), a criação de eventos passa a chamar-se **Tarefa**:

- Botão "Novo evento"/"Criar reunião" passa a "Nova tarefa" / "Criar tarefa".
- Título do modal: "Nova tarefa" / "Editar tarefa".
- Textos de sucesso e detalhes do evento acompanham o novo nome.

Só muda a linguagem da interface — a estrutura de dados dos eventos mantém-se.

## 2. Novo módulo "Registo de Trabalhos"

Nome proposto para o módulo: **Registo de Trabalhos** (menu: "Trabalhos"). Serve para deixar registado qualquer trabalho pedido fora dos cards normais, por exemplo:

- "Edição urgente de um vídeo"
- "Edição de uma foto"
- "Sessão de fotografia de uma pessoa no estúdio"

Cada registo tem:

- Título / descrição do que foi pedido
- Colaborador responsável (membro do workspace)
- Tipo de trabalho (edição de vídeo, edição de foto, fotografia, captação, outro)
- Cliente e projeto associados (opcionais)
- Data do pedido e data de conclusão
- Estado: pendente / em curso / concluído
- Urgência (normal / urgente)
- Valor opcional (para quando o trabalho tem custo associado)

Página `/app/trabalhos` com lista filtrável por mês, colaborador, tipo e estado, criação/edição rápida e vista em cartões no telemóvel.

## 3. Relatório mensal por colaborador

Nova secção no **Relatório de Atividade**: "Trabalhos por colaborador".

- Total de trabalhos por colaborador no período
- Repartição por tipo de trabalho
- Tabela detalhada (data, colaborador, tipo, descrição, cliente, estado, valor)
- Incluída no export PDF já existente

## 4. Campos obrigatórios nos cards de edição

No modal de criação de card (e na edição):

- Novo campo obrigatório **Edição ou Reedição**, visível e exigido apenas quando o item é "Projeto de edição" ou "Projeto completo".
- **Categoria** passa a obrigatória.
- **Prioridade** passa a obrigatória (deixa de vir pré-preenchida como "Média" — obriga a escolha explícita).

Mensagens de erro em PT-BR por baixo de cada campo em falta.

## Detalhes técnicos

- Migração: tabela `work_logs` (workspace_id, title, description, work_type, assignee_id, client_id, project_id, requested_at, completed_at, status, is_urgent, amount, created_by, timestamps) com GRANTs, RLS por membro do workspace e trigger de `updated_at`.
- Migração: coluna `edit_kind` em `projects` (`edicao` | `reedicao`, nullable para dados existentes).
- Hook `useWorkLogs.ts` (react-query) para CRUD e agregação mensal por colaborador.
- `CreateProjectModal.tsx`: zod passa a exigir `custom_category_id`, `priority` sem default e `edit_kind` condicional via `superRefine`.
- `RelatorioAtividade.tsx`: nova secção alimentada por `useWorkLogs`, respeitando as classes de impressão já existentes.
