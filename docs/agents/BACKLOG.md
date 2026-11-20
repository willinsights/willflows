# Backlog — WillFlow 2.0

Fonte única das tarefas do orquestrador. Estados: `pronta`, `precisa_aprovacao`, `bloqueada`, `concluida`.
Agentes: `auditor` (só leitura), `programador` (só em branch), `proprietario` (decisão ou ação humana).

Origem: auditoria de 20/11/2026. Os detalhes sensíveis de segurança são mantidos genéricos porque o repositório é público.

## A. Correções críticas

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| A1d | Diagnosticar qual job agendado devolve HTTP 401 | bloqueada (falta acesso aos logs das funções) | auditor | proprietario: dar acesso aos logs | Job identificado com evidência dos logs; relatório sem segredos |
| A1 | Autenticação dos jobs agendados com credencial gerida no Vault e nomes dos jobs coerentes com a cadência | precisa_aprovacao | programador | A1d | 24 h sem 401; cada job com HTTP 200; sem efeitos laterais (sem apagar vídeos nem emails duplicados) |
| A2 | Migrações reproduzíveis a partir do estado real aplicado (só leitura da base; nada é aplicado) | pronta | programador | — | Base descartável criada só a partir do repositório; diff de catálogo contra produção vazio |
| A3 | Política da limpeza legada de vídeos: pausar, gate que falha fechado, ou isolar os legados | precisa_aprovacao | proprietario | A2, A4 | Ensaio com fornecedor fictício; nenhuma eliminação externa sem passo anterior registado na base |
| A4 | Restauro de backup verificado e documentado (data e ponto de recuperação) | precisa_aprovacao | proprietario | — | Restauro isolado com contagens iguais às de produção (versões, comentários, aprovações) |
| A5 | Explicar por versão a diferença entre 54 versões ativas (inventário de 20/11) e 50 (consulta de 20/11) | pronta | auditor | — | Explicação documentada por versão, sem alterar nem apagar nada |

## B. Estabilidade

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| B1 | Qualidade reproduzível: scripts `test` e `typecheck`, instalação limpa, leitura dos resultados do CI | pronta | programador | — | Build, tipos e testes a passar de forma repetível numa máquina limpa e no CI |
| B2 | Dados e paginação: verificar `useProjects` e o limite silencioso de 1.000 linhas | pronta | auditor | — | Relatório com os pontos de risco; teste com workspace sintético com mais de 1.000 projetos |
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
| D1d | Análise de lacunas do Financeiro no código: o que já existe de previsão de caixa, projeção a 6 meses, exportação e faturado/recebido/lucro | pronta | auditor | — | Matriz existe/falta por funcionalidade, com ficheiro e linha |
| D1 | Financeiro 2.0 sobre as regras existentes | bloqueada (decisões do proprietário: ciclo de pagamento e visibilidade do preço ao cliente) | programador | D1d, proprietario | Mesmo total no Dashboard, nos Relatórios e no Fecho para o mesmo mês |

## E. UX e Design System

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| E1a | Auditoria visual com capturas | bloqueada (precisa de sessão autenticada) | auditor | proprietario | Capturas desktop e mobile dos ecrãs principais e lista de inconsistências |
| E1 | Tokens do Design System e 3 ecrãs piloto (Dashboard, Kanban, Review Studio) | bloqueada | programador | E1a | Capturas antes e depois sem regressões funcionais |

## F e G. Novas funcionalidades e IA

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| F1d | Análise de lacunas do Kanban e da pesquisa | pronta | auditor | — | Matriz existe/falta por funcionalidade |
| F1 | Kanban e pesquisa global | bloqueada | programador | F1d | Testes de componente e navegação ponta a ponta |
| G1 | Primeiro caso de IA: resumo de comentários de clientes e alertas de atraso, só em leitura | bloqueada | programador | A1 | Sem saída de dados sem consentimento; ações sensíveis com confirmação |
