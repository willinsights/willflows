

# AUDITORIA COMPLETA DO WILLFLOW — Plano de Ação

---

## 1. RESUMO EXECUTIVO

O WillFlow tem uma base sólida com motor financeiro unificado, Kanban de produção, CRM com leads, e sistema de permissões. No entanto, sofre de **fragmentação da experiência financeira**, **duplicação de dados entre módulos**, **relatórios desconectados do motor financeiro**, e **ausência de fluxo quote-to-cash**. A página de Pagamentos (823 linhas) é o sintoma mais visível: tenta ser previsão, controlo de receita, custos, lucro e faturação numa única página com 6 tabs.

---

## 2. DIAGNÓSTICO — PROBLEMAS CRÍTICOS

### P1. Pagamentos.tsx é um monólito confuso (823 linhas)
- 6 tabs numa única página: Previsão, Receita Clientes, Custos Colaboradores, Custos Extras, Lucro, Emitir Fatura (desativada)
- Lógica de cálculo duplicada no componente (monthlyForecast) quando já existe `financialEngine.ts`
- Tab "Previsão" mistura receita de projetos com "Outros Movimentos" da tabela `payments` — confuso
- Tab "Emitir Fatura" desativada — gera expectativa sem entregar

### P2. Relatórios desconectados do motor financeiro
- `Relatorios.tsx` usa `useReportData.ts` que recalcula receita/custo a partir de projetos raw
- Não utiliza `financialEngine.ts` nem as views SQL (`v_project_profit`, `get_monthly_summary`)
- Resultado: **números potencialmente diferentes** entre Dashboard e Relatórios

### P3. Dashboard tem dois sistemas de métricas em paralelo
- `useDashboardMetrics.ts` (592 linhas, legado) + `useFinancialEngine.ts` (novo)
- Ambos calculam receita, custos e lucro — risco de divergência
- Dashboard consome de ambos simultaneamente

### P4. Faturação (`Faturacao.tsx`) é sobre subscrição Stripe do WillFlow, NÃO sobre faturar clientes
- Nome "Faturação" no menu confunde com faturação de projetos a clientes
- Deveria chamar-se "Subscrição" ou "Plano"

### P5. Ausência de fluxo quote-to-cash
- Não existe entidade "Orçamento/Proposta" formal
- Contratos existem mas desconectados do fluxo financeiro
- Lead → Cliente → Projeto funciona, mas Projeto → Fatura → Recebimento não existe

### P6. Sem conceito de "Fatura a Cliente"
- `client_payment_status` no projeto é um campo simplista (pendente/pago/vencido)
- Não há entidade de fatura com número, data de emissão, vencimento, PDF
- Não há faturação parcial ou por marcos

### P7. `payments` table é legada e confusa
- Usada como "Outros Movimentos" na Previsão
- Conflita conceptualmente com pagamentos de projetos (`client_payment_status`)
- Deveria ser eliminada ou renomeada para `manual_adjustments`

### P8. Custos de projeto (captacao/edicao/extras) são campos fixos, não linhas
- `custo_captacao` e `custo_edicao` são números fixos no projeto
- `project_team.payment_amount` é por membro mas separado dos custos do projeto
- Não há reconciliação entre custo estimado e custo real (soma dos pagamentos a equipa)

---

## 3. PROBLEMAS MÉDIOS

| # | Problema | Impacto |
|---|----------|---------|
| M1 | Finalizados.tsx (743 linhas) — monólito com inline CompetenceMonthSelect | Manutenção difícil |
| M2 | ProfitControl faz query própria ao Supabase em vez de usar dados partilhados | Queries duplicadas |
| M3 | ProjectFinancialTab ainda consulta tabela `payments` para "pagamento do cliente" — legado | Dados inconsistentes |
| M4 | Sem aging de contas a receber (30/60/90 dias) | Visibilidade fraca de cobrança |
| M5 | Sem audit trail em alterações financeiras (só admin_audit_log para super admin) | Risco de rastreabilidade |
| M6 | Sem score de saúde do projeto | Falta visibilidade de risco |
| M7 | Relatório de colaboradores existe mas separado da página principal de Relatórios | Fragmentação |
| M8 | Menu lateral tem "Faturação" (subscrição) misturada com "Pagamentos" (operacional) | Confusão de naming |

---

## 4. OPORTUNIDADES ESTRATÉGICAS

1. **Centro Financeiro por Projeto** — cada projeto com painel financeiro completo (receita, custos detalhados, margem, saldo, risco)
2. **Entidade "Fatura a Cliente"** — número sequencial, PDF, faturação parcial, aging
3. **Reconciliação custo estimado vs real** — comparar `custo_captacao` com `SUM(project_team.payment_amount WHERE phase='captacao')`
4. **Dashboard executivo com KPIs reais** — usar exclusivamente `financialEngine.ts`
5. **Alertas inteligentes** — projetos entregues não faturados, faturas vencidas, margem negativa
6. **Score de saúde do projeto** — baseado em atraso, margem, pagamentos pendentes

---

## 5. BENCHMARK — O QUE APRENDER (filtrado para WillFlow)

| Referência | Padrão a adotar |
|------------|-----------------|
| **Productive.io** | Centro financeiro por projeto com margem em tempo real |
| **Scoro** | Quote-to-cash integrado: proposta → projeto → fatura → recebimento |
| **Bonsai** | Faturação simples a partir de projeto com PDF e tracking |
| **HubSpot** | Pipeline visual com valor ponderado por fase |
| **Frame.io** | Aprovação de entregas ligada a marcos de faturação |
| **Harvest** | Timesheet → custo real vs estimado, billable rate |
| **monday.com** | Dashboard configurável com widgets de KPI |

---

## 6. O QUE MANTER

- Motor financeiro (`financialEngine.ts`) com 3 modos — excelente base
- Views SQL (`v_project_profit`, `v_collaborator_payments`) — boa camada backend
- Kanban de Captação/Edição — claro e funcional
- Sistema de permissões granulares — maduro
- Competence month — lógica de fecho financeiro correcta
- Chat por projeto — diferenciador
- Exports Excel/PDF — funcionalidade necessária

---

## 7. O QUE SIMPLIFICAR

| Item | Ação |
|------|------|
| Pagamentos.tsx (823 linhas) | Dividir em sub-páginas dentro de `/app/financeiro/*` |
| useDashboardMetrics.ts (592 linhas) | Eliminar cálculos financeiros duplicados, usar apenas `useFinancialEngine` |
| ProfitControl.tsx | Usar dados do hook partilhado, não query própria |
| ProjectFinancialTab.tsx | Remover consulta à tabela `payments`, usar apenas `client_payment_status` |
| Finalizados.tsx (743 linhas) | Extrair CompetenceMonthSelect e filtros para componentes |

---

## 8. O QUE UNIR

| Antes | Depois |
|-------|--------|
| Pagamentos + Relatórios + Faturação (subscrição) | **Finanças** (hub unificado) + **Subscrição** (separado) |
| Dashboard financialEngine + useDashboardMetrics | Fonte única: `useFinancialEngine` |
| useReportData (cálculos próprios) | Usar `financialEngine.ts` como fonte |

---

## 9. O QUE REMOVER

- Tab "Emitir Fatura" desativada — gera ruído sem valor
- Tabela `payments` como fonte de receita — isolar ou migrar dados para projetos
- Cálculos financeiros duplicados em `useDashboardMetrics` e `useReportData`

---

## 10. O QUE CRIAR

### 10.1 Nova Arquitectura de Menu (Sidebar)

```text
VISÃO GERAL
  ├── Dashboard
  ├── Chat
  └── Calendário

COMERCIAL
  ├── Leads
  ├── Clientes
  └── Contratos

PRODUÇÃO
  ├── Captação
  ├── Edição
  ├── Finalizados
  └── Media

FINANÇAS  ← hub unificado (novo)
  ├── Visão Geral (dashboard financeiro)
  ├── Receitas (receita clientes + previsão)
  ├── Custos (colaboradores + extras)
  ├── Lucro (rentabilidade)
  └── Relatórios

GESTÃO
  ├── Equipa
  ├── Configurações
  └── Subscrição ← renomear Faturação
```

### 10.2 Nova Entidade: `invoices` (Faturas a Clientes)

```sql
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho', -- rascunho, emitida, paga, vencida, cancelada
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.3 Nova Entidade: `project_cost_lines` (Custos detalhados)

```sql
CREATE TABLE public.project_cost_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'equipa', 'equipamento', 'deslocacao', 'software', 'outro'
  description TEXT,
  estimated_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pendente',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.4 Score de Saúde do Projeto

Função SQL que calcula score 0-100 baseado em:
- Atraso vs data planeada (-20 se atrasado)
- Margem (>30% = +30, 0-30% = +15, <0 = -20)
- Pagamento cliente (pago = +25, pendente = +10, vencido = -15)
- Pagamentos equipa pendentes (-15)

### 10.5 Alertas Inteligentes

- Projetos entregues há >7 dias sem fatura
- Faturas vencidas há >15 dias
- Projetos com margem negativa
- Freelancers com pagamentos pendentes há >30 dias
- Previsão de caixa negativa no próximo mês

---

## 11. NOVA ARQUITECTURA FINANCEIRA

### Fluxo Canónico Quote-to-Cash

```text
Lead → Cliente → Contrato/Proposta → Projeto
  → Planeamento (equipa + custos estimados)
  → Produção (captação → edição → entrega)
  → Faturação (emissão de fatura a cliente)
  → Recebimento (pagamento confirmado)
  → Pagamento equipa (custos reais)
  → Fecho (competence_month + margem final)
```

### Centro Financeiro por Projeto (ProjectFinancialTab melhorado)

```text
┌──────────────────────────────────────────┐
│ RECEITA                                   │
│  Valor Contratado: €5.000                │
│  Faturado: €3.000 (60%)                  │
│  Recebido: €3.000 (100% do faturado)     │
│  Por Faturar: €2.000                     │
├──────────────────────────────────────────┤
│ CUSTOS          Estimado    Real          │
│  Captação:      €800        €750         │
│  Edição:        €600        €600         │
│  Extras:        €200        €350 ⚠️      │
│  TOTAL:         €1.600      €1.700       │
├──────────────────────────────────────────┤
│ RESULTADO                                 │
│  Lucro Previsto: €3.400 (68%)            │
│  Lucro Real:     €3.300 (66%)            │
│  Desvio:         -€100 (-2.9%)           │
│  Saúde: 🟢 85/100                        │
└──────────────────────────────────────────┘
```

---

## 12. NOVA ARQUITECTURA DE RELATÓRIOS

Alimentados exclusivamente por `financialEngine.ts` + views SQL:

1. **Resumo Mensal** — receita, custos, lucro, margem, nº projectos (usa `get_monthly_summary`)
2. **Receita por Cliente** — top clients com tendência
3. **Rentabilidade por Projecto** — usa `v_project_profit`
4. **Custos por Colaborador** — usa `v_collaborator_payments`
5. **Contas a Receber (Aging)** — 0-30, 31-60, 61-90, 90+ dias
6. **Previsão vs Realizado** — comparação PREVISAO vs REALIZADO do motor
7. **Forecast de Caixa** — modo CAIXA projetado 3 meses
8. **Desvio Orçamental** — custo estimado vs custo real por projeto

---

## 13. KPIs ESSENCIAIS DO SISTEMA

| KPI | Fonte |
|-----|-------|
| Receita Mensal Realizada | `financialEngine` REALIZADO |
| Margem Média | `v_project_profit` |
| Taxa de Entrega (entregues/planeados) | `getMonthlySummary` |
| Aging Médio de Recebimento | `invoices.paid_at - invoices.issued_at` |
| Custos Pendentes (equipa) | `v_collaborator_payments` |
| Projetos Entregues Não Faturados | query simples |
| Forecast 30 dias | `financialEngine` PREVISAO |
| Score Médio de Saúde | nova função |

---

## 14. PROPOSTAS DE NOMENCLATURA

| Atual | Proposto | Razão |
|-------|----------|-------|
| Faturação (menu) | Subscrição | É sobre o plano WillFlow, não faturas a clientes |
| Pagamentos (menu) | Finanças | Hub unificado |
| Previsão (tab) | Fluxo Mensal | Mais claro |
| Receita Clientes (tab) | Receitas | Simplificar |
| Custos Colaboradores (tab) | Custos Equipa | Mais natural |
| Custos Extras | Despesas Adicionais | Menos técnico |
| Outros Movimentos | Ajustes Manuais | Transparência |

---

## 15. REFACTORING TÉCNICO

### Componentes a refatorar:
1. **Pagamentos.tsx** → dividir em 5 sub-componentes/páginas
2. **useDashboardMetrics.ts** → remover cálculos financeiros, manter apenas dados operacionais
3. **useReportData.ts** → redirecionar para `financialEngine.ts`
4. **ProfitControl.tsx** → eliminar query própria, receber dados via props/hook
5. **ProjectFinancialTab.tsx** → remover consulta à tabela `payments`
6. **Finalizados.tsx** → extrair `CompetenceMonthSelect` como componente standalone

### Estados a padronizar:
```typescript
type PaymentStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado';
type InvoiceStatus = 'rascunho' | 'emitida' | 'paga' | 'vencida' | 'cancelada';
type ProjectHealth = 'saudavel' | 'atencao' | 'critico';
```

### Riscos de performance:
- `useDashboardMetrics` faz 6+ queries ao Supabase em cascade
- `usePaymentsData` faz 3 queries separadas quando poderia ser 1
- Sem paginação server-side em Finalizados (carrega todos os projetos)

---

## 16. ROADMAP PRIORIZADO

### 30 DIAS — Quick Wins
1. Renomear "Faturação" → "Subscrição" no menu
2. Remover tab "Emitir Fatura" desativada
3. Unificar `useReportData` para usar `financialEngine.ts`
4. Eliminar cálculos financeiros duplicados de `useDashboardMetrics`
5. Extrair `CompetenceMonthSelect` de Finalizados
6. Adicionar indicador "Entregues sem faturar" no Dashboard

### 60 DIAS — Médio Prazo
7. Dividir Pagamentos.tsx em hub `/app/financeiro/*`
8. Criar tabela `invoices` para faturação a clientes
9. Implementar aging de contas a receber
10. Criar score de saúde do projeto
11. Reconciliação custo estimado vs real no ProjectFinancialTab
12. Alertas de margem negativa e pagamentos vencidos

### 90 DIAS — Longo Prazo
13. Faturação completa (emissão, PDF, faturação parcial)
14. Dashboard executivo configurável
15. Forecast de caixa projetado (3 meses)
16. Client portal (cliente vê entregas e faturas)
17. Automações: auto-cobrar, auto-alertar, auto-fechar
18. AI insights: previsão de margem, recomendação de pricing

---

## 17. TOP 10 CORREÇÕES URGENTES

1. Unificar fonte de cálculos financeiros (eliminar duplicações entre hooks)
2. Renomear "Faturação" → "Subscrição"
3. Remover tab "Emitir Fatura" desativada
4. `useReportData` deve consumir de `financialEngine.ts`
5. `ProfitControl` não deve fazer query própria
6. `ProjectFinancialTab` — remover consulta à tabela `payments` legada
7. Garantir que Dashboard e Relatórios mostram os mesmos números
8. Adicionar loading states consistentes em todas as tabs de Pagamentos
9. Pagamentos.tsx: monthlyForecast recalcula sem usar o motor — redirecionar
10. Finalizados: paginação server-side para workspaces com >100 projetos

## 18. TOP 10 MELHORIAS DE MAIOR IMPACTO

1. Hub Financeiro unificado (substituir Pagamentos monolítico)
2. Centro financeiro por projeto com margem em tempo real
3. Aging de contas a receber (30/60/90)
4. Score de saúde do projeto
5. Indicador "Entregues mas não faturados"
6. Reconciliação custo estimado vs real
7. Relatórios alimentados por motor financeiro único
8. Alertas inteligentes (margem, atraso, cobrança)
9. Dashboard executivo com KPIs do motor
10. Forecast de caixa (projeção 3 meses)

## 19. TOP 10 OPORTUNIDADES DE INOVAÇÃO

1. Faturação a clientes com PDF integrado
2. Client portal (aprovações + faturas)
3. AI pricing assistant (sugerir preço com base em histórico)
4. Score de risco financeiro por projeto
5. Automação: projeto entregue → gerar fatura rascunho
6. Desvio orçamental automático (estimado vs real)
7. Previsão de capacidade da equipa (workload vs disponibilidade)
8. Templates de projeto com custos pré-definidos
9. Recomendação de cobrança prioritária (aging + valor)
10. Dashboard por perfil (admin vs freelancer vs gestor)

---

## 20. PLANO DE IMPLEMENTAÇÃO FASEADO

**FASE A (Semana 1-2): Limpeza e Consistência**
- Unificar fontes de cálculo
- Renomear menu items
- Remover elementos desativados
- Garantir consistência numérica entre páginas

**FASE B (Semana 3-4): Reestruturação do Hub Financeiro**
- Dividir Pagamentos em sub-páginas
- Criar nova navegação `/app/financeiro/*`
- Migrar lógica para hooks partilhados

**FASE C (Semana 5-6): Novas Entidades e Dados**
- Tabela `invoices`
- Score de saúde
- Aging de contas a receber
- Reconciliação de custos

**FASE D (Semana 7-8): Relatórios e Dashboard**
- Relatórios unificados com motor financeiro
- Dashboard executivo
- Alertas inteligentes
- Forecast de caixa

**FASE E (Semana 9-12): Inovação**
- Faturação completa com PDF
- Client portal
- AI insights
- Automações avançadas

