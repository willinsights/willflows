
# Reestruturação do Financeiro — Regra Única de Pagamento

## Problema
O financeiro atual mistura projetos em andamento com entregues, tem filtros ambíguos e múltiplos modos (REALIZADO/PREVISAO/CAIXA) que geram confusão.

## Nova Regra Central
**Um projeto só aparece no financeiro quando está na coluna "Entregue" (`is_delivered = true`).**

---

## Fase 1: Simplificar Custos Equipa (Pagamentos Colaboradores)

### 1.1 Filtrar APENAS projetos entregues
- O `FreelancerPaymentsControl` passa a mostrar **apenas** pagamentos de projetos com `is_delivered = true`
- Remover o filtro "Estado Projeto" (em_curso/entregue) — já não faz sentido porque só entregues aparecem
- Remover a coluna "Estado" da tabela (sempre será "Entregue")

### 1.2 Novo filtro de tipo de data
- Adicionar toggle/select: **"Filtrar por: Data de Entrega | Data de Criação"**
- Default = **Data de Entrega** (`delivered_at`)
- Visualmente destacado para o utilizador saber qual está ativo
- Remover o default hardcoded de `2025-03-03`

### 1.3 Simplificar a tabela
- Manter: ID, Projeto, Cliente, Colaborador, Fase, Data Entrega, Status Pgto, Valor
- Remover: coluna "Estado" (redundante — tudo é entregue)

---

## Fase 2: Simplificar Visão Geral

### 2.1 Remover toggle PREVISAO/REALIZADO/CAIXA
- Manter apenas um modo: baseado em projetos entregues (equivalente ao REALIZADO atual)
- Os summary cards passam a refletir apenas dados de projetos entregues

### 2.2 Manter navegação por mês
- Baseado em `delivered_at` (ou `competence_month` se definido)
- Métricas claras: Receita, Custos, Lucro — tudo de projetos entregues naquele mês

---

## Fase 3: Simplificar Layout global

### 3.1 Summary cards do FinanceiroLayout
- "A Receber" e "Recebido" → apenas projetos entregues
- "A Pagar" e "Pago" → apenas team payments de projetos entregues

---

## Fase 4: Validação na entrega

### 4.1 Alerta se projeto sem valores
- Quando um projeto é movido para "Entregue" e não tem `agreed_value` nem team payments com valor → mostrar alerta (não bloquear, apenas avisar)

---

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `FreelancerPaymentsControl.tsx` | Filtrar só `is_delivered=true`, novo toggle tipo de data, remover coluna Estado |
| `PaymentFilters.tsx` | Adicionar prop `dateFilterType` com toggle Data Entrega / Data Criação |
| `Custos.tsx` | Passar flag `onlyDelivered` |
| `VisaoGeral.tsx` | Remover toggle de viewMode, usar apenas REALIZADO |
| `FinanceiroLayout.tsx` | Summary cards filtrar apenas entregues |
| `usePaymentsData.ts` | Filtrar projectRevenue apenas entregues |

## Impacto
- Zero alterações na base de dados
- Lógica simplificada no frontend
- O trigger `sync_delivery_on_final_column` já garante que projetos na coluna final ficam `is_delivered = true`
- Utilizador vê apenas dados definitivos e rastreáveis
