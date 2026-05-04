## Relatório Excel — Lucro Abril 2026 (card-a-card)

Vou gerar um arquivo `.xlsx` em `/mnt/documents/` com o detalhamento de lucro dos projetos das listas que enviou (Christian, Morais, Rafaela Abril, Rafaela Pendências), usando os valores **dos próprios cards** (`agreed_value`, `custo_captacao`, `custo_edicao`, `custos_extras`).

### Estrutura do Excel

**Aba 1 — "Resumo"**
- Totais por grupo (Christian / Morais / Rafaela Abril / Rafaela Pendências)
- Total consolidado (sem duplicatas): **1.146,00 €**
- Margem média

**Aba 2 — "Detalhe por Card"**
Colunas:
| ID (UUID curto) | Project Code | Nome do Projeto | Cliente | Grupo | Data Entrega | Receita (€) | Custo Captação (€) | Custo Edição (€) | Custos Extras (€) | Custo Total (€) | Lucro (€) | Margem % | Status |

- Linhas duplicadas (projetos em mais de uma lista) marcadas em **amarelo**
- Cards com receita 0 € marcados em **vermelho claro** (Octant Hotels Douro, HANDS IN THE DOUGH!, Capella Sydney, etc.)
- Cards com inconsistência de status marcados em **laranja** (não entregues / data de Maio)

**Aba 3 — "Inconsistências"**
Lista os 3 problemas detectados na lista da Rafaela:
- "The Unmissable Portuguese Spas" — não marcado como entregue
- "How it works - Websites Eleggia" — não marcado como entregue
- "Reel Baleares" — `delivered_at = 03/05/2026` (Maio, não Abril)

### Formatação
- Fonte: Arial
- Receita azul (input), Lucro preto (fórmula `=Receita-CustoTotal`), Margem como `0,0%`
- Negativos entre parênteses, zeros como "-"
- Larguras ajustadas, cabeçalho em negrito com fundo cinza
- Totais com fórmulas `SUM()` (não hardcoded)

### Passos técnicos
1. Query SQL para buscar todos os UUIDs das listas com `agreed_value`, custos, `delivered_at`, `is_delivered`, cliente
2. Script Python com `openpyxl` para montar as 3 abas
3. Recalcular fórmulas com `recalculate_formulas.py`
4. QA: converter para imagem e validar layout
5. Entregar via `<lov-artifact>` para download

### Saída
`Relatorio_Lucro_Abril_2026.xlsx` em `/mnt/documents/`, pronto para download.

Aprovar para eu gerar?
