

# Export Agrupado por Projeto (Sem Duplicações)

## Problema

Atualmente, o export gera **uma linha por colaborador**, o que duplica o projeto quando há mais de um membro. O utilizador quer **uma linha por projeto** com uma coluna que liste todos os colaboradores e respetivos valores.

## Solução

### 1. `FreelancerPaymentsControl.tsx` — Novo `exportData` agrupado

Agrupar `sortedPayments` por `project_id`, gerando uma linha por projeto com:

- **ID**: código do projeto
- **Projeto**: nome
- **Cliente**: nome do cliente
- **Data Entrega**: data de entrega
- **Colaboradores**: string agregada, ex: `"Rafaela (€400), Christian (€300)"`
- **Status**: status combinado (se todos pagos → "Pago", se algum pendente → "Pendente")
- **Valor Total**: soma de todos os `payment_amount` do projeto

### 2. `PaymentExportButtons.tsx` — Nova coluna no mapa

Adicionar ao `columnLabelsMap.freelancers`:
- `colaboradores: 'Colaboradores'` (substitui `contraparte`)
- Remover `fase`, `iban`, `banco` das colunas (ou manter se tiverem dados)

### 3. `ExportData` interface

Adicionar campo opcional `colaboradores?: string` à interface.

## Exemplo de output

| ID | Projeto | Cliente | Data Entrega | Colaboradores | Status | Valor Total |
|---|---|---|---|---|---|---|
| WF-042 | Vídeo Hotel X | Hotel X | 05/04/2026 | Rafaela (€400), Christian (€300) | Pendente | €700 |

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/payments/FreelancerPaymentsControl.tsx` | Agrupar `exportData` por projeto |
| `src/components/payments/PaymentExportButtons.tsx` | Adicionar `colaboradores` à interface e ao `columnLabelsMap` |

