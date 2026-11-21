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

## S. Segurança (verificação de 20/11)

Achados da verificação de segurança do Lovable de 20/11. Descrições genéricas de propósito: o detalhe técnico fica fora do repositório público.

| ID | Tarefa | Estado | Agente | Depende de | Critério de aceitação |
| --- | --- | --- | --- | --- | --- |
| S1 | Isolamento entre workspaces em funções de resumo e métricas | concluida (aplicado em produção a 20/11; commit 91556ee e alteração direta na base) | — | — | Pedidos de outro workspace recusados; confirmado pelo proprietário |
| S2 | Papéis no chat: sem auto-promoção | concluida (aplicado em produção a 20/11) | — | — | Entrada em canal só como membro; criador mantém-se admin |
| S3 | Executor de automações aceita apenas chamadas internas | concluida (commit 91556ee) | — | — | Chamadas diretas recusadas; automações por fila inalteradas |
| S4 | Anexos do chat com link de curta duração: pedir link novo no uso | concluida (#23 integrado a 20/11; por verificar num browser) | programador | — | Anexos abrem numa conversa aberta há mais de 10 minutos |
| S5 | Notificações push: mesma verificação do destino nas duas funções de envio | concluida (#24 integrado a 20/11; por testar uma notificação real) | programador | — | Só serviços de push de browsers conhecidos; subscrições legítimas inalteradas |
| S6 | Endurecimento adicional do chat e da gravação de subscrições push | precisa_aprovacao (SQL) | programador | proprietario | Ensaio com dados fictícios; fluxos de chat e push inalterados |
| S7 | Rever os avisos restantes da verificação depois de a repetir | pronta | auditor | proprietario: repetir a verificação | Cada aviso confirmado ou descartado com evidência |
| S8 | Revisão independente dos commits feitos diretamente no `main` a 20/11 (sete revistos; 93ec1b0, atualização de dependências, e 2255b69, canais de tempo real, por rever) | pronta | auditor | — | Relatório por commit: regressões e correções incompletas |
| S9 | Incluir nas migrações as alterações aplicadas diretamente na base a 20/11 | pronta | programador | A2, A6 | Sem diferença entre a base e o repositório para estes objetos |
| S10 | Convite: recarregar depois do login (regressão de 381ff12) | concluida (#26 integrado e publicado a 20/11) | programador | — | Login na página do convite avança sem recarregar o browser |
| S11 | Convite: entrar no workspace que convidou em vez de criar um novo (defeito antigo) | concluida (#27 integrado e publicado a 20/11; por confirmar com um convite novo) | programador | — | Convidado sem workspace entra no workspace que convidou |
| S12 | Carregamento de workspaces: não mostrar a criação de workspace enquanto a lista ainda está a carregar | pronta | programador | — | Sem passagem pelo ecrã de criação com rede lenta; teste do contexto com a guarda de rotas |
| S13 | Menções do chat alinhadas com a regra do servidor e sem falhas silenciosas | em_pr (#28; CI verde; revisor PASS com reservas) | programador | — | Sugestões só de quem pode ser mencionado; uma menção recusada não impede as outras |
| S14 | Exportações de projetos e de clientes com verificação de permissão; listagem de exportações com a mesma verificação do estado | precisa_aprovacao (função do servidor) | programador | proprietario | Só quem tem a permissão certa exporta; ensaio com dados fictícios |
| S15 | Regra do período de teste: incluir o chat durante o teste (decisão do proprietário de 21/11) | precisa_aprovacao (SQL e frontend) | programador | proprietario | Workspace em teste válido envia mensagens; teste expirado não |
| S16 | Estado de subscrição: workspaces com o teste expirado continuam marcados como em teste | pronta | auditor | — | Relatório: o que a app faz com um teste expirado e onde a regra é aplicada |
| S17 | Limpeza dos workspaces vazios criados pelo defeito S11 | precisa_aprovacao (elimina dados) | proprietario | S11 | Lista aprovada pelo proprietário; cópia de segurança das linhas antes de eliminar |

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
