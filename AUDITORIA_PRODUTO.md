# Auditoria de Produto, UX e Financeiro — WillFlow

Data: 2026-10-03 · Âmbito: só diagnóstico (nenhum código, dado ou automação foi alterado).
Evidência: leitura de código (ficheiro:linha), consultas de leitura à base de dados real e políticas de acesso ativas.

---

## 1. Auditoria completa — mapa do sistema

### Como os módulos comunicam

```text
Clientes/Leads (tabela clients) ──► Projetos (projects) ──► Kanban Captação / Edição ──► Finalizados
                                        │
          ┌─────────────────────────────┼──────────────────────────────┐
          ▼                             ▼                              ▼
  Equipa do projeto            Custos no projeto              Vídeos / Review
  (project_team:               (custo_captacao, custo_edicao,  (video_versions,
   payment_amount, status)      custos_extras, cost_lines)      approvals, comments)
          │                             │
          └──────────────┬──────────────┘
                         ▼
     Financeiro (≥3 motores de cálculo diferentes) ──► Fecho mensal (closings: fotografia manual)
                         ▲
     Trabalhos (work_logs) ─┘  só entra no Fecho mensal
     Calendário (calendar_events) · Cronómetro (time_sessions) · Relatório Atividade (gravacoes) — sem ligação entre si
```

### O mesmo dado guardado em vários sítios

| Dado | Onde vive | Risco |
|---|---|---|
| Custo do colaborador | `projects.custo_captacao/custo_edicao` **e** `project_team.payment_amount` | Dupla contagem e valores divergentes (ver secção 3) |
| Custos extras | `projects.custos_extras` **e** `project_cost_lines` | Somados sem deduplicação (`financialEngine.ts:57-59`). Hoje há 0 casos reais. |
| Trabalho realizado | `work_logs`, `calendar_events`, `time_sessions`, `gravacoes` | Quatro registos de "trabalho" que não se falam |
| Pagamentos | `project_team` (estado/data) e tabela `payments` (88 linhas) | Dois ciclos de vida para "pago" |
| Leads vs Clientes | Mesma tabela `clients` (`useLeads.ts:60…`) | Dois menus para o mesmo objeto |
| Tabelas mortas | `projetos`, `trabalhos_complementares`, `estudio_diarias`, `cambio` | Sem uso no código, só ocupam espaço e confundem |

---

## 2. Problemas encontrados (priorizados)

| # | Prio | Onde | Problema | Consequência | Solução proposta |
|---|---|---|---|---|---|
| P1 | Crítico | `project_team`, `projects` (políticas de acesso) | Qualquer membro do workspace pode **ler** `agreed_value`, custos e o `payment_amount` de todos os colegas. A política "Members can view project team" só verifica se a pessoa pertence ao workspace. | Um colaborador pode ver o preço ao cliente e quanto recebem os outros, fora da interface | Separar os campos financeiros (vista ou RPC) e mostrar a um colaborador apenas as suas próprias linhas |
| P2 | Crítico | `useMonthlyClosing.ts:155-159` | O total de custos soma `project_team` **+** `custo_captacao` **+** `custo_edicao` | O Fecho mensal pode inflacionar custos e encolher o lucro | Uma única fonte de custo de colaborador (ver secção 4) |
| P3 | Alto | Dados reais | Há 395 projetos entregues com custo no projeto e na equipa ao mesmo tempo; em **199** os valores não coincidem | Lucro diferente consoante o ecrã | Reconciliar e fixar uma só fonte de verdade |
| P4 | Alto | `financialEngine.ts`, `useMonthlyClosing.ts`, `ProfitControl.tsx`, RPC `get_dashboard_metrics`, `ClientProfitabilityReport`, `TeamPerformanceReport` | Pelo menos 6 implementações de "lucro/custo", com conjuntos de custos diferentes. Exemplo: `ProfitControl` não inclui as linhas de custo. | O Dashboard, a página Lucro e o Fecho mostram números diferentes para o mesmo mês | Um único motor, de preferência no servidor |
| P5 | Alto | Datas | O pagamento ao colaborador usa a âncora do projeto (`useCollaboratorForecast.ts:70`), a data de entrega (`useMonthlyClosing.ts:67`) ou entrega/prazo (`useTransactionFeed.ts:122`), sem data própria de pagamento previsto | Não há como dizer "trabalho de setembro, pago em outubro" | Acrescentar uma data de pagamento previsto, derivada de um ciclo |
| P6 | Alto | `App.tsx:230-243` | Ainda existem três gerações de páginas financeiras: `FinanceiroHub`, as páginas novas e as seis rotas `legacy/*` que continuam acessíveis, além de `Faturacao` | Confusão: "qual é o ecrã certo?" | Um único Financeiro com 4 separadores (secção 4) |
| P7 | Médio | `work_logs` | Os trabalhos só entram no Fecho mensal (`useMonthlyClosing.ts:131`) | Os custos de trabalhos não aparecem no Dashboard nem na página Lucro | Integrá-los no motor único |
| P8 | Médio | Fecho (`closings`) | O fecho é uma fotografia manual, sem mês de competência próprio | Fechos difíceis de comparar com os relatórios | Fecho por mês de competência |
| P9 | Médio | Leitura de projetos | Não há paginação em lado nenhum (`.range()` não é usado). O workspace principal tem **478 projetos**, e o limite silencioso é de 1000 linhas. | Em cerca de 1 a 2 anos, os totais financeiros ficam abaixo do real **sem qualquer erro** | Somar no servidor ou paginar |
| P10 | Médio | `useProjects.ts:20-97` | Não usa react-query, por isso os `invalidateQueries(['projects'])` noutros sítios não têm efeito | O Kanban não se atualiza depois de algumas edições | Migrar para react-query |
| P11 | Baixo | `Finalizados.tsx` (710 linhas) | Página feita à parte, que não reutiliza o `KanbanBoard` | Comportamento e nomes diferentes de Captação/Edição | Unificar |
| P12 | Baixo | Dashboard | Cada cartão tem uma versão `Mobile*` duplicada (`Dashboard.tsx:47-54`) | O dobro da manutenção, com o risco de as duas versões divergirem | Componentes responsivos |

---

## 3. Análise específica do Financeiro

### Que data define o mês hoje

| Valor | Realizado | Previsão | Caixa |
|---|---|---|---|
| Receita do projeto | `competence_month` → `delivered_at` | entrega → gravação → criação | `client_paid_at` |
| Custos no projeto | igual à receita | igual à receita | custos extras: `custos_extras_paid_at` |
| Equipa (`project_team`) | **não entra** no motor principal | âncora do projeto | `paid_at` |
| Linhas de custo | sem olhar à data da linha | sem olhar à data da linha | `paid_at` + estado pago |
| Trabalhos | — | — | só no Fecho: `completed_at`/`requested_at` |

**Conclusão:** competência, previsão e caixa já existem como modos, mas **não há data de pagamento previsto** para nenhum custo. Também não existe regra de ciclo: não se encontrou nada sobre `payment_cycle`. É por isso que "setembro vs outubro" não tem resposta.

### Onde há confusão
- **Projeto ≠ Receita recebida:** a página Receitas lista todos os projetos entregues, sem filtro de mês (`usePaymentsData.ts:27-35`), por isso não é comparável com a "Receita do mês" do Dashboard.
- **Custo ≠ Pagamento:** o custo do colaborador está em dois sítios, e o pagamento altera o estado de um deles (`project_team`) mas não do outro (`custo_edicao`).
- **Mês do serviço ≠ Mês do pagamento:** não existe campo para o segundo.

### Comparação com o fluxo proposto (Projeto → Colaborador → Valor → Concluído → A pagar → Ciclo → Pago)
O modelo atual já tem metade deste fluxo, porque `project_team` tem valor, estado e `paid_at`. Faltam três coisas: (a) que `project_team` seja a **única** fonte de custo de pessoas, (b) uma data de pagamento previsto calculada pelo ciclo e (c) uma vista agrupada por colaborador com "pagar selecionados". Já existem duas vistas agrupadas (`Colaboradores.tsx` e `useMonthlyClosing.byEditor`), com datas diferentes.
**Recomendação: sim, o fluxo proposto é melhor, e constrói-se evoluindo o que existe, sem criar tabelas novas de pagamento.**

---

## 4. Arquitetura financeira recomendada

**Princípio:** um custo nasce uma vez e o pagamento só muda o seu estado.

1. **Fonte única por tipo de valor**
   - Receita: `projects.agreed_value`
   - Pessoas: `project_team.payment_amount`. `custo_captacao/custo_edicao` passam a ser calculados (soma da equipa por fase) ou deixam de ser editáveis.
   - Outros custos: `project_cost_lines`. `custos_extras` é migrado para linhas.
   - Trabalhos avulsos: `work_logs.amount`
2. **Três datas por cada linha a pagar ou receber:** competência (mês do trabalho, = entrega), vencimento previsto (calculado pelo ciclo) e pagamento real (`paid_at`).
3. **Ciclo de pagamento por workspace**, com uma única definição: mesmo mês / mês seguinte (dia X) / N dias após a entrega. Fica gravado no momento da entrega, e o utilizador pode corrigir à mão.
4. **Um motor único no servidor**, uma função que devolve os blocos A receber / A pagar / Realizado / Resultado por mês. Todos os ecrãs passam a ler daqui.
5. **Financeiro com 4 separadores:** A receber · A pagar (agrupado por colaborador, com "pagar selecionados" e data, método e nota) · Realizado (caixa) · Resultado (receitas, custos, margem, lucro estimado vs realizado).
6. **Fecho mensal = vista do mês de competência**, com "fechar" a bloquear edições desse mês. Não é um ERP.

Respeita as regras atuais: só projetos entregues entram em Realizado, e a âncora entrega → gravação → criação mantém-se para a Previsão. A única mudança de regra sujeita à sua decisão é **deixar de usar `custo_edicao/custo_captacao` como valor independente**.

---

## 5. Melhorias de UX por perfil

- **Freelancer:** precisa de ver dinheiro e agenda num só sítio. Hoje tem Calendário, Trabalhos, Kanban e Financeiro em menus separados, e os quatro tipos de "trabalho" não se falam. → Uma vista "Hoje".
- **Produtora / Agência:** não há um "A pagar" único nem um botão para pagar vários de uma vez. O lucro muda de ecrã para ecrã (P4). → O separador "A pagar" e o motor único resolvem o essencial.
- **Colaborador:** o Dashboard já mostra A receber / Já recebido / Total previsto (`CollaboratorForecastCards.tsx:41-78`), mas **sem detalhe por projeto nem data prevista de pagamento**, e não existe uma lista "As minhas tarefas". → Detalhe por projeto com a data prevista, mais "As minhas tarefas".
- **Nomes:** Leads/Clientes (mesmo objeto), Tarefa/Trabalho/Evento, Entregue/Finalizado e "Relatórios" vs "Relatório de Atividade". → Um glossário único e um só menu de relatórios.
- **Dashboard principal:** responde a "a receber" e "urgentes", mas não tem "a pagar", nem "hoje", nem "projetos parados". → Uma zona de ação com estes quatro cartões, e retirar gráficos que não levam a nenhuma decisão.

---

## 6. Automações possíveis

| Gatilho | Ação automática | Já existe? |
|---|---|---|
| Projeto entregue | Fixar a competência e calcular o vencimento previsto da equipa pelo ciclo | Não (`deliver_project` só marca como entregue) |
| Colaborador adicionado ao projeto | O custo passa a contar na margem prevista | Parcial |
| Vencimento ultrapassado | O estado passa a "Atrasado" | Parcial (só por cálculo no ecrã) |
| Cliente marcado como pago | Atualizar o projeto e a caixa | Sim (triggers `paid_at`) |
| Data de entrega alterada | Recalcular o vencimento previsto, se ainda não estiver pago | Não |
| Fim do mês | Lembrete "Fechar mês X" com o resumo | Não |

---

## 7. Funcionalidades novas (apenas onde não existe equivalente)
1. Ciclo de pagamento por workspace.
2. Pagamento em lote por colaborador, com comprovativo.
3. Vista "Hoje" / "As minhas tarefas" (junta tarefas, trabalhos e eventos do dia).
4. Bloqueio de mês fechado.

Não se propõe: módulo de despesas novo (as linhas de custo chegam), nova tabela de pagamentos, nem novos gráficos.

---

## 8. Problemas técnicos
- Seis cálculos financeiros duplicados e oito consultas separadas a `projects` (P4).
- Sem paginação, com risco de o limite das 1000 linhas cortar resultados em silêncio (P9).
- `useProjects` fora do react-query (P10).
- Três subscrições em tempo real sem filtro: `useMessages.ts:342` (reações), `:356` (leituras), `useConversations.ts:494` (mensagens).
- Componentes muito grandes: `ProjectDetailsSheet` 1408 linhas, `Configuracoes` 1324, `FinanceiroHub` 1095, `ClientDetailsModal` 1057, `CreateProjectModal` 1046, `Calendario` 1053.
- Árvore mobile duplicada para o Dashboard (P12) e lógica de importação copiada em três modais.
- Quatro tabelas sem uso (secção 1).

## 9. Problemas de segurança (o que fica além da auditoria de 01/09)
- **P1 (crítico):** valores financeiros de projetos e da equipa legíveis por qualquer membro do workspace. A app esconde-os nos ecrãs, mas a base de dados entrega-os.
- `project_team` tem `REPLICA IDENTITY FULL`, ou seja, valores antigos e novos de pagamento passam pelo canal de tempo real. Hoje não há nenhum ouvinte, mas convém retirar.
- Há cerca de 220 avisos do linter sobre funções executáveis por utilizadores autenticados. São antigos e ficam para revisão em lote.

---

## 10. Roadmap

| Fase | O quê | Porquê primeiro |
|---|---|---|
| **1 — Segurança e verdade dos números** (1–2 semanas) | P1 (esconder valores a colaboradores) · decidir a fonte única de custo de pessoas · reconciliar os 199 projetos divergentes · corrigir a dupla soma no Fecho (P2) | Sem isto, qualquer ecrã novo mostra números errados |
| **2 — Motor único** | Função no servidor com A receber / A pagar / Realizado / Resultado · todos os ecrãs a ler daí · resolve P4, P7 e P9 | Acaba com os "três lucros diferentes" |
| **3 — Ciclo e A pagar** | Ciclo de pagamento · vencimento previsto na entrega · separador "A pagar" por colaborador com pagamento em lote · detalhe para o colaborador | Responde a "setembro vs outubro" |
| **4 — Simplificação de UX** | Financeiro com 4 separadores · remover as rotas `legacy/*` e o FinanceiroHub · Dashboard com zona de ação · vista "Hoje" · glossário único | Menos ecrãs, menos cliques |
| **5 — Higiene** | Retirar as tabelas mortas · `useProjects` com react-query · filtrar as subscrições em tempo real · partir os componentes gigantes · unificar o mobile | Manutenção e performance |

### Decisões pendentes (suas)
1. Confirmar que `project_team` passa a ser a única fonte do custo de pessoas e que `custo_captacao/custo_edicao` passam a ser calculados.
2. Ciclo de pagamento por defeito (sugestão: mês seguinte, dia 10).
3. Colaboradores devem continuar a ver o preço ao cliente nos cartões? Recomendação: não.
