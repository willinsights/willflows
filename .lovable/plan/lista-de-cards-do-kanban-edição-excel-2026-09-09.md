# Lista de cards do Kanban Edição — Excel

## Objetivo
Gerar um ficheiro Excel descarregável com os nomes dos cards do quadro **Edição**, ignorando a coluna "Em espera" e excluindo arquivados/entregues (cards ativos no quadro).

## Passos
1. Consultar a base de dados (via `get_kanban_board` ou query direta a `projects` + `kanban_columns`) filtrando:
   - Colunas da fase `edicao` do workspace
   - Excluir coluna "Em espera 😒"
   - Excluir projetos arquivados e entregues (conforme a lógica atual do quadro)
2. Gerar `lista-cards-edicao.xlsx` em `/mnt/documents/` com uma única coluna "Nome" (uma linha por card), fonte Arial, cabeçalho em negrito.
3. Recalcular/validar o ficheiro (sem fórmulas — apenas dados; verificação simples).
4. Apresentar o ficheiro como anexo para download e dizer quantos cards contém.

## Detalhes técnicos
- Query SQL read-only sobre `projects` e `kanban_columns` (filtro: `kanban_columns.phase = 'edicao'`, título da coluna diferente de "Em espera", `archived_at IS NULL`, `is_delivered = false`).
- Excel criado com `openpyxl`; apenas dados estáticos, sem fórmulas — sem risco de erros de fórmula.
- Ordenação: pela ordem das colunas no quadro, depois pela posição do card na coluna.
