# Backlog — WillFlow 2.0

Fonte única das tarefas do orquestrador. Estados: `pronta`, `precisa_aprovacao`, `bloqueada`, `em_pr` (PR aberto, por integrar), `concluida`.
Agentes: `auditor` (só leitura), `programador` (só em branch), `proprietario` (decisão ou ação humana).

Origem: auditoria de 20/11/2026. Os detalhes sensíveis de segurança são mantidos genéricos porque o repositório é público. Os relatórios das auditorias estão em `docs/agents/relatorios/`.

## A. Correções críticas

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| A1d | Diagnosticar qual job agendado devolve HTTP 401 | bloqueada (falta acesso aos logs das funções) | auditor | proprietario: dar acesso aos logs | Job identificado com evidência dos logs; relatório sem segredos |
| A1 | Autenticação dos jobs agendados com credencial gerida no Vault e nomes dos jobs coerentes com a cadência | precisa_aprovacao | programador | A1d | 24 h sem 401; cada job com HTTP 200; sem efeitos laterais (sem apagar vídeos nem emails duplicados) |
| A2 | Migrações reproduzíveis a partir do estado real aplicado (só leitura da base; nada é aplicado) | pronta | programador | A6 | Base descartável criada só a partir do repositório; diff de catálogo contra produção vazio |
| A3 | Política da limpeza legada de vídeos: pausar, gate que falha fechado, ou isolar os legados | precisa_aprovacao | proprietario | A2, A4 | Ensaio com fornecedor fictício; nenhuma eliminação externa sem passo anterior registado na base |
| A4 | Restauro de backup verificado e documentado (data e ponto de recuperação) | precisa_aprovacao | proprietario | — | Restauro isolado com contagens iguais às de produção (versões, comentários, aprovações) |
| A5 | Explicar por versão a diferença entre 54 versões ativas (inventário de 20/11) e 50 (consulta de 20/11) | pronta (explicada em agregado, falta por versão; ver relatório) | auditor | — | Explicação documentada por versão, sem alterar nem apagar nada |
| A6 | Existem dois diretórios de migrações (`supabase/migrations` e `drizzle/migrations`) com definições diferentes do mesmo trigger: apurar qual vale em produção | pronta | auditor | — | Relatório com a origem de cada objeto aplicado e a recomendação de fonte única |

## B. Estabilidade

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| B1 | Qualidade reproduzível: scripts `test` e `typecheck`, instalação limpa, leitura dos resultados do CI | pronta | programador | — | Build, tipos e testes a passar de forma repetível numa máquina limpa e no CI |
| B2 | Dados e paginação: auditoria de `useProjects` e do limite silencioso de 1.000 linhas | concluida (relatório de 20/11) | auditor | — | Relatório com os pontos de risco |
| B2a | Chave de cache da lista de projetos: as invalidações `['projects']` passam a ter efeito | em_pr (#18; CI verde; revisor PASS) | programador | B2 | As 6 invalidações atingem a query; Kanban notificado; sem ciclo de eventos |
| B2b | Paginar as 9 leituras financeiras sem paginação e desempate por `id` | em_pr (#19; CI verde; revisor PASS) | programador | B2 | Leituras devolvem todas as linhas; nenhum cálculo, filtro ou coluna alterado; teste do helper |
| B2c | Teste com workspace sintético com mais de 1.000 projetos e as restantes leituras de gravidade média do relatório B2 | pronta | programador | B2b | Totais iguais ao cálculo de referência acima de 1.000 projetos |
| B3 | Dividir por funcionalidade os ficheiros acima de 1.000 linhas e reduzir `any` | pronta | programador | B1 | PRs pequenos, sem alteração visual, suite a passar |

## C. Infraestrutura de vídeo

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| C1 | Piloto de vídeo com um cliente real | precisa_aprovacao | proprietario | A1, A3 | Upload, comentário e aprovação reais; quota certa; zero eliminações; plano de retirada testado |
| C2 | Paridade dos vídeos novos: substituição no mesmo ID e miniatura; confirmar o alcance do PR #16 | bloqueada (decisão comercial sobre o número da versão) | auditor | proprietario | Regressão de comentários, aprovações e quota por versão |
| C3 | Migração dos vídeos históricos | bloqueada | proprietario | A3, A4 | Ensaio numa cópia; perda zero de vídeos, links, comentários e aprovações |

## D. Financeiro

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| D1d | Análise de lacunas do Financeiro no código | concluida (relatório de 20/11) | auditor | — | Matriz existe/falta por funcionalidade, com ficheiro e linha |
| D2a | Fonte única de lucro no cliente: separador financeiro do projeto, Clientes, detalhe do cliente, Fechos e resultado por mês passam a usar o cálculo partilhado | pronta | programador | B2b | Mesmo lucro por projeto em todos os ecrãs do cliente; testes de reconciliação a passar |
| D2b | Alinhar a vista de lucro e a RPC do Dashboard com o motor (linhas canceladas e trabalhos) | precisa_aprovacao (SQL) | programador | D2a, A2 | Mesmo total no Dashboard, nos Relatórios e no Fecho para o mesmo mês |
| D3 | Endurecer o pagamento em lote (atómico, comprovativo só nos pagos, valor efetivamente pago) e alargar o bloqueio de mês fechado | precisa_aprovacao (mexe em pagamentos) | programador | proprietario | Falha parcial não marca pagos nem liga comprovativo; ensaio com dados fictícios |
| D4 | Correções rápidas: «a receber» do Dashboard só com projetos entregues; agrupar colaboradores por utilizador e não por nome | pronta | programador | — | Testes a cobrir os dois casos; sem outras alterações de cálculo |
| D1 | Financeiro 2.0: caixa real na Visão, previsão de caixa, projeção a 6 meses, ciclo de pagamento, exportação | bloqueada (decisões do proprietário: ciclo de pagamento e visibilidade do preço ao cliente) | programador | D2b, proprietario | Mesmo total no Dashboard, nos Relatórios e no Fecho para o mesmo mês |

## E. UX e Design System

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| E1a | Auditoria visual com capturas | bloqueada (precisa de sessão autenticada) | auditor | proprietario | Capturas desktop e mobile dos ecrãs principais e lista de inconsistências |
| E1 | Tokens do Design System e 3 ecrãs piloto (Dashboard, Kanban, Review Studio) | bloqueada | programador | E1a | Capturas antes e depois sem regressões funcionais |

## F e G. Novas funcionalidades e IA

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| F1d | Análise de lacunas do Kanban e da pesquisa | concluida (relatório de 20/11) | auditor | — | Matriz existe/falta por funcionalidade |
| F1a | Finalizados: estado de carregamento e de erro em vez de falso vazio | em_pr (#20; CI verde; revisor PASS) | programador | F1d | Sem falso vazio durante o carregamento; sem outras alterações de comportamento |
| F1b | Kanban: skeleton de colunas e estado de erro com «tentar novamente» | pronta | programador | F1d | Sem quadro vazio em caso de falha; sem alteração de dados |
| F1c | Anular depois de mover um card (só no movimento normal, não em entrega nem transferência) | pronta | programador | F1d | Toast com anular repõe a coluna de origem; teste de componente |
| F1e | Guardar filtros do Kanban e pesquisar projetos por código na pesquisa global | pronta | programador | F1d | Filtros mantêm-se ao voltar à página; pesquisa encontra por código |
| F1 | Ações em lote, tempo por coluna no card e unificação de Finalizados com o Kanban | bloqueada (decisão de produto; tempo por coluna toca em SQL) | programador | F1b, proprietario | Testes de componente e navegação ponta a ponta |
| G1 | Primeiro caso de IA: resumo de comentários de clientes e alertas de atraso, só em leitura | bloqueada | programador | A1 | Sem saída de dados sem consentimento; ações sensíveis com confirmação |
