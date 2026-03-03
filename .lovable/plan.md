

## Corrigir Relatórios e Pagamentos para Todos os Utilizadores

### Problemas Identificados

1. **Tab "Pagamentos Colaboradores"** — não mostra coluna de data de entrega, não distingue projetos entregues dos em curso, e não inclui `is_delivered` nos dados
2. **`useTeamPayments`** — carrega equipa de TODOS os projetos (entregues e não entregues) sem distinção
3. **Relatórios (`topClients`)** — conta receita de TODOS os projetos incluindo não entregues, inflacionando valores
4. **Falta de sincronização** — o `projectsList` passado ao componente de pagamentos não inclui `is_delivered`

### Plano

#### 1. Adicionar `is_delivered` e `delivered_at` ao `projectsList` (Pagamentos.tsx)

Linha 431 — incluir `is_delivered` no mapeamento para que o componente possa filtrar/mostrar estado.

#### 2. Adicionar coluna "Data Entrega" + badge de estado (FreelancerPaymentsControl.tsx)

- Adicionar `is_delivered` ao interface `Project` (linha 50-57)
- Adicionar coluna **"Data Entrega"** na tabela com formatação `dd/MM/yyyy`
- Adicionar badge visual (Entregue / Em curso) para distinguir projetos
- Ordenar por projetos entregues primeiro, depois por data

#### 3. Corrigir `topClients` no Relatórios (Relatorios.tsx)

Linha 327-345 — filtrar apenas projetos entregues (`is_delivered === true`) para receita real, não previsões.

#### 4. Incluir `delivered_at` na exportação de dados do FreelancerPaymentsControl

Adicionar coluna "Data Entrega" ao `exportData` para que Excel/PDF incluam esta informação.

---

### Ficheiros a modificar: 3
1. `src/pages/app/Pagamentos.tsx` — incluir `is_delivered` no `projectsList`
2. `src/components/payments/FreelancerPaymentsControl.tsx` — coluna de data + badge + ordenação
3. `src/pages/app/Relatorios.tsx` — filtrar apenas entregues no `topClients`

### Impacto
- Todos os utilizadores verão projetos entregues correctamente identificados com data
- Relatórios mostrarão receita real (só projectos entregues)
- Pagamentos de colaboradores sincronizados com estado de entrega do projecto

