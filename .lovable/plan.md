
# Finance — UX/UI Audit & Redesign Plan

Auditei o módulo Finance real (FinanceiroLayout, FinanceiroHub, VisaoGeral, FechoMensal, Receitas/Custos/CustosExtras/Lucro, Faturacao, e os hooks `useUnbilledPool`, `useMonthlyClosing`, `useClosings`, `useFinancialEngine`, `usePaymentsData`). Este documento é o entregável: audit + redesign proposto + plano de implementação faseado. **Nenhuma lógica de negócio muda** — só arquitetura de informação, hierarquia visual, interação e performance percebida.

---

## 1. Estado atual — o que existe hoje

Rotas ativas em `/app/financeiro`:

```
/app/financeiro                  → FinanceiroHub          (pool "Por faturar" + fechos + lucro global + link para "legacy")
/app/financeiro/legacy/visao-geral   → VisaoGeral         (KPIs mensais + navegador mês + listas receita/pagamentos)
/app/financeiro/legacy/receitas      → Receitas
/app/financeiro/legacy/custos        → Custos (equipa)
/app/financeiro/legacy/custos-extras → CustosExtras
/app/financeiro/legacy/lucro         → Lucro
/app/financeiro/legacy/fecho         → FechoMensal (kpis + settlements + por editor)
/app/faturacao                   → Faturacao (Stripe / subscrição)
/app/relatorios                  → Relatorios
```

Menu (`nav-config.ts`) mostra apenas **Finanças / Faturação / Relatórios**. O sub‑nav do `FinanceiroLayout` expõe 6 tabs `legacy/*` mais o hub principal. Convivem duas gerações de UI em paralelo — o hub novo (por "fechos") e as 6 páginas antigas com KPIs por mês.

---

## 2. Auditoria — problemas encontrados (por severidade)

### CRÍTICOS (bloqueiam clareza / decisão)

**C1. Dupla mental model coexistindo — "fechos" vs "mês"** *(impact: alto)*  
`FinanceiroHub` organiza tudo à volta de **fechos** (batches criados manualmente pelo user). `VisaoGeral` e `FechoMensal` legacy organizam à volta de **mês de calendário**. O user não sabe qual é a verdade. Já existe um `Collapsible` chamado *"Ver detalhe (vistas antigas)"* que expõe isto — sinal claro de dívida técnica não resolvida.  
→ **Solução:** eleger o mês/período como eixo primário (é o que os utilizadores pensam: "quanto ganhei este mês?"), e o fecho como uma **ação** dentro desse mês. Eliminar `legacy/*` do menu (manter rotas por retro‑compat, mas removidas da UI).

**C2. Barra de 6 KPIs cards não hierarquiza nada** *(impact: alto)*  
`FinanceiroLayout` mostra 6 cards de igual peso (A Receber, Recebido, A Pagar, Pago, Atrasados, Valor Atraso), tudo com o mesmo tamanho, tudo com scroll horizontal em mobile. O olho não sabe onde pousar. Falta o número que interessa: **profit / cash net** e **atrasos** (o único que exige ação).  
→ **Solução:** 1 hero KPI (Lucro do mês) + 3 secundários (Receita, Custos, Saldo pendente) + destaque de **alertas** (só aparece se count > 0).

**C3. Zero visualização de dados** *(impact: alto)*  
Módulo financeiro sem **um único gráfico**. Só tabelas e listas. Impossível ver tendência, sazonalidade, cashflow projetado.  
→ **Solução:** timeline de cashflow (12 meses), receita vs custo, funil de faturação (entregue → fecho → recebido).

**C4. `FinanceiroHub` tem 822 linhas num único ficheiro** *(impact: médio, mas técnico)*  
Mistura pool + lista de fechos + detalhe de fecho + lucro global + collapsible. Detail view é renderizada substituindo o hub em vez de ser um `Sheet`/`Drawer`, o que quebra o mental model de "estou no hub" e re‑fetch dados. Muitos re‑renders por causa de estado local não memoizado.  
→ **Solução:** dividir em componentes; `ClosingDetail` como `Sheet` lateral (não substituição de página).

**C5. Faturação (Stripe) e Finanças convivem em módulos separados sem cross‑link** *(impact: médio)*  
Um user procura "faturas" e encontra o **plano WillFlow** (subscrição SaaS), não os pro‑forma de clientes. Ambiguidade lexical grave.  
→ **Solução:** renomear `/app/faturacao` para **"Subscrição"** ou **"Plano & Faturação"** no menu; e uma secção "Documentos de cliente" (pro‑formas gerados) fica dentro de Finanças.

### WARNING (degrada experiência)

**W1. Tabela do pool "Por faturar" — não escala** — HTML `<table>` puro, sem virtualização, sem ordenação por coluna, sem pinned columns. 100+ projetos entregues = lag.  
**W2. Filtros primitivos** — 3 `<Select>` desconexos (cliente, editor, texto). Sem chips, sem "presets guardados", sem "recentes".  
**W3. Ações principais escondidas** — botão "Criar fecho" só aparece após seleção; user não descobre que **pode** criar fecho até selecionar linhas. Precisa de estado vazio educativo com CTA fantasma.  
**W4. Empty states genéricos** — todos usam mesmo componente com texto seco. Um bom empty state de Finance devia mostrar: "0 projetos por faturar. **Últimos 30 dias:** X€ faturados em N fechos."  
**W5. Loading = 6 skeletons iguais** — não antecipa a estrutura real da página.  
**W6. Toggle `hideValues`** — botão eye no header sem tooltip nem atalho. Devia ser `⌘⇧H`.  
**W7. `ClosingDetail` full‑page navigation** — sem breadcrumb, sem "voltar para lista" persistente, sem estado do URL (`?closing=id`). Refresh = perde contexto.  
**W8. Datas inconsistentes** — algumas em `dd MMM`, outras `dd/MM/yyyy`, outras `dd MMM yyyy`. Falta um `<DateCell>` unificado.  
**W9. Currency formatting duplicado** — `formatCurrency` chamado ~200 vezes por render; sem `useMemo` nos resumos por linha.  
**W10. Zero keyboard shortcuts** — `/` para pesquisar, `E` para export, `⌘K` para command palette já existe no projeto mas não com contexto Finance.

### INFO (best practice)

**I1.** Sem `aria-live` nos totais (accessibility) — user vê o total mudar quando seleciona linhas mas screen reader não anuncia.  
**I2.** `⌘K` command palette existe mas não indexa **transações/fechos**.  
**I3.** `PaymentExportButtons` está duplicado em `VisaoGeral` e `FechoMensal`.  
**I4.** Contraste de badges "outline" fracas em dark mode em algumas variantes.  
**I5.** Sem "smart defaults" no dialog de criar fecho — nome inicial devia ser `Fecho {mês} · {cliente}`.  
**I6.** Sem link direto do KPI "Atrasados" para uma vista filtrada.

---

## 3. Redesign proposto — a experiência final

### Nova arquitectura de informação

```text
┌─ FINANÇAS ──────────────────────────────────────────────────┐
│                                                              │
│  /app/financeiro                          (single page app)  │
│  ├─ tab: Visão            ← default, dashboard executivo     │
│  ├─ tab: Movimentos       ← unified feed (receita+custo)     │
│  ├─ tab: Fechos           ← batches (o que hoje é o hub)     │
│  ├─ tab: Colaboradores    ← view "por editor" agregada       │
│  └─ tab: Relatórios       ← inline, absorve /relatorios      │
│                                                              │
│  Cmd+K global → índice todos os fechos, projetos, clients    │
│                                                              │
│  /app/faturacao → renomeado no menu: "Plano & faturação"     │
└──────────────────────────────────────────────────────────────┘
```

### Tab 1 — **Visão** (dashboard executivo)

Layout em bento‑grid, **desktop first**. Responde às 3 perguntas críticas em <5 segundos:

```text
 ┌────────────────────────────────────────┬──────────────────────┐
 │  LUCRO DO MÊS                          │  ALERTAS             │
 │  +12.480 €      ▲ 24% vs mês anterior  │  ● 3 atrasados       │
 │  Margem 34%     26 projetos            │  ● 2 fechos abertos  │
 │                                        │  ● 1 recibo p/ emit. │
 ├─────────────────┬──────────────────────┴──────────────────────┤
 │ RECEITA         │  CASHFLOW TIMELINE (12 meses)               │
 │ 36.900 €        │  ▇▅▆▅▇▆▇▇█▇▆▇  receita                     │
 │ ▬▬▬▬▬▬▬▬        │  ▂▃▂▃▄▂▃▃▄▃▃▄  custo                       │
 ├─────────────────┼─────────────────────────────────────────────┤
 │ CUSTOS          │  FUNIL DE FATURAÇÃO                         │
 │ 24.420 €        │  ● entregues 26  ● fechados 22  ● pagos 18  │
 │ ▬▬▬▬▬           │  ─────────────────────────────────────      │
 ├─────────────────┴─────────────────────────────────────────────┤
 │ TOP 5 CLIENTES        │  UPCOMING (próx. 30 dias)             │
 │ Bliss     14.200 €   │  ▸ Bliss · fecho outubro · 4.200 €    │
 │ Anzarya    9.800 €   │  ▸ Morais · 2 vídeos por faturar      │
 └───────────────────────┴───────────────────────────────────────┘
```

- 1 hero (Lucro) + widget de **Alertas com deep‑links**
- Charts: `recharts` (já no projeto), tema neutro, sem gradientes gritantes
- Sparklines nos cards de Receita/Custos (mostram últimos 6 meses)
- Filtro global de período no topo (Este mês / 3M / 6M / YTD / custom)

### Tab 2 — **Movimentos** (unified feed)

Substitui as 4 páginas legacy (Receitas / Custos / Custos Extras / Lucro) por **um feed único de transações**, tipo Mercury/Ramp:

```text
[🔍 Search      ] [+ Receita entregue] [+ Custo] [Chips: Este mês ▪ Todos ✕]

┌────────────────────────────────────────────────────────────────┐
│ ↗ Nova Zelândia — Anzarya          Bliss Travel     +4.200 €  │  Recebido
│   Entregue 08 Out · Fecho outubro                              │
├────────────────────────────────────────────────────────────────┤
│ ↙ Editor: Morais                   Kaikoura Sights    -40 €   │  Pendente
│   Fase edição · Fecho Morais                                   │
├────────────────────────────────────────────────────────────────┤
│ ↙ Custo extra: Music license       Sunset shoot      -120 €   │  Pago
└────────────────────────────────────────────────────────────────┘
                                                    ↧ (virtual scroll)
```

- **Uma linha = uma transação** (receita OU custo OU extra), com ícone direcional (↗/↙)
- **Row‑click → floating panel lateral** (Sheet) com detalhe completo, sem sair da página
- **Bulk actions** na sticky bottom bar (marcar como pago, adicionar a fecho, exportar seleção)
- **Filtros como chips** (`Este mês`, `Pendentes`, `Só cliente Anzarya`) — clicáveis, removíveis, guardáveis como "Vista salva"
- Virtual scroll (`@tanstack/react-virtual`) → 10k linhas sem lag
- Colunas: sort click, pinned "Projeto" à esquerda, "Valor" à direita
- Inline editing do status via popover

### Tab 3 — **Fechos** (redesign do actual hub)

Mantém o mental model atual (é o valor único do WillFlow) mas mais leve:

- **Pool "Por faturar"** vira uma secção colapsável no topo com header em stack: `Por faturar · 12 projetos · 8.400 €`
- Seleção → sticky bottom sheet com preview do fecho (nome, cliente, totais, botão "Criar")
- Lista de fechos: **cards em grid** (como está) mas com progress bar visual de "pago vs pendente" por fecho
- Detail de fecho: **Sheet lateral** (não navegação full‑page). URL sincroniza (`?closing=xxx`). Refresh preserva.
- Botão "Marcar recebido" com micro‑animation de check verde a expandir

### Tab 4 — **Colaboradores**

Absorve o que hoje é `ClosingByEditor` mas cross‑fecho: quanto cada editor **vai receber**, ordenado por total pendente. Um só click → paga tudo dele.

### Tab 5 — **Relatórios**

Move `/app/relatorios` para cá como sub‑tab. Reduz item de menu global. Exports (PDF/Excel landscape já existentes) ficam num único botão "Exportar" com dropdown de âmbito (Este mês / Fecho X / Personalizado).

---

## 4. Design system — deltas necessários

- **Currency cell** — novo componente `<Money value={} tone="income|expense|neutral" hideable />` com `tabular-nums`, formatação centralizada
- **Date cell** — `<DateCell date={} format="short|medium|relative" />`
- **StatCard** — variante `hero` (grande, com sparkline) + `compact`
- **TransactionRow** — linha unificada com slot para ícone, primary, secondary, right‑chip, amount
- **FilterChip** — chip removível com contador
- **SavedView** — dropdown de vistas guardadas no `localStorage` (v1) → `user_preferences` (v2)
- Border radius já está em `0.75rem` (Fase D anterior). Nada muda.
- **Motion budget:** entradas com `y: 8, duration: 0.25`. Nada mais. Zero paralax, zero blur transitions.

---

## 5. Performance improvements

- Consolidar 4 queries do Finance em 1 hook `useFinanceOverview()` com `select` server‑side apenas dos campos necessários
- Virtual scroll (`@tanstack/react-virtual`) na lista de Movimentos e no pool
- `React.memo` nos `TransactionRow`
- Cache de `formatCurrency` result (small memo por linha)
- Lazy split: cada tab é `lazy()` (Visão / Movimentos / Fechos / Colaboradores / Relatórios)
- `useMemo` dos totais no `FinanceiroLayout` está bem — mas mover para hook partilhado para não recalcular por tab

---

## 6. Acessibilidade

- `aria-live="polite"` na sticky bar de seleção
- Todos icon‑only buttons já têm ou vão ter `aria-label` (já cobrimos em SEO/A11y anteriores)
- Focus ring visível em rows (`focus-visible:ring-2 ring-primary`)
- Todas as cores de status têm dupla codificação (cor + ícone + texto) — ok para daltonismo
- Contraste em dark mode: rever `bg-warning/15 text-warning` — validar AA

---

## 7. AI opportunities (fase 2, não incluído no build inicial)

- **Auto‑nome de fecho:** já podemos gerar `Fecho {mês} · {cliente}` sem AI. Version AI: sugerir agrupamento inteligente (todos os Anzarya entregues nas últimas 4 semanas)
- **Deteção de duplicados:** se 2 custos extras com mesma descrição + valor próximo aparecem no mesmo mês → warning
- **Forecast de cashflow:** com base em `delivery_date` + `custo_captacao/edicao` prever 60 dias
- **Natural language search:** "quanto ganhei em outubro com o Bliss?" via Lovable AI (usa `google/gemini-2.5-flash`, é gratuito no gateway)

Deixar para depois — precisam de spec própria.

---

## 8. Plano de implementação — 5 fases

Cada fase é um PR isolado, entregável de forma incremental. **Nenhuma altera a lógica financeira em `financialEngine.ts` ou nos hooks de dados.**

### Fase 1 — Fundações (baixo risco, alto retorno visual)

- Novo `<Money>` + `<DateCell>` + `<TransactionRow>` + `<FilterChip>` em `src/components/finance/`
- Refactor do `FinanceiroLayout` header (1 hero KPI + 3 secundários + Alertas)
- Remover `legacy/*` do menu do sub‑nav (rotas continuam vivas)
- Novo skeleton fiel à estrutura

### Fase 2 — Tab Visão (dashboard executivo)

- Bento‑grid com hero, cashflow timeline (recharts), funil, top clientes, upcoming
- Filtro global de período
- Deep‑links dos alertas para as vistas correctas

### Fase 3 — Tab Movimentos (unified feed)

- Feed unificado receita+custo com virtual scroll
- `Sheet` lateral de detalhe da transação
- Bulk actions + chips + vistas guardadas (localStorage v1)

### Fase 4 — Tab Fechos (redesign do hub actual)

- Pool colapsável no topo
- `ClosingDetail` migra para `Sheet` com URL param
- Progress bar de "pago vs pendente" nos cards de fecho

### Fase 5 — Consolidação

- Absorver `/relatorios` como sub‑tab
- Renomear `/app/faturacao` para "Plano & Faturação" no menu
- Command palette Finance: indexar transações, fechos, projetos por valor
- A11y pass final (aria‑live, focus rings, contraste badges)

---

## Detalhes técnicos

- **Stack novo:** `@tanstack/react-virtual` (adicionar), `recharts` (já instalado), `cmdk` (já instalado), `date-fns` (já)
- **Rotas:** `/app/financeiro` continua o entry point; tabs internas via `useSearchParams` (`?tab=visao|movimentos|fechos|colaboradores|relatorios`) para preservar deep‑links e refresh
- **Retro‑compat:** rotas `legacy/*` mantidas 60 dias, redirect suave para nova tab equivalente
- **Feature flag:** `VITE_FINANCE_V2` opcional para permitir rollback rápido — recomendo não usar, o novo cobre 100% do antigo
- **Zero migrações SQL** necessárias — todos os hooks e views existentes são reutilizados

---

## Próximo passo

Este plano precisa da tua decisão sobre **escopo**. Sugiro começar pela **Fase 1 + Fase 2** (fundações + dashboard executivo) num único ciclo — é onde o utilizador vê o maior salto de qualidade percebida ("agora parece Stripe"). As fases seguintes ficam agendadas depois de validares o novo dashboard em uso real.

Se preferires, posso arrancar já pela **Fase 3 (Movimentos)** que é o que mais reduz cliques no dia‑a‑dia, ou pela **Fase 4 (Fechos)** que é o teu workflow principal.
