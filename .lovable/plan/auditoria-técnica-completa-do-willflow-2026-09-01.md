# Auditoria técnica completa do WillFlow

Objetivo: varrer o sistema inteiro (82 rotas, ~100 tabelas, 50 edge functions), identificar falhas e entregar um relatório priorizado. Nesta fase **não há correções** — só diagnóstico. As correções ficam para uma segunda aprovação, na ordem Critical → High → Medium → Low.

## Entregável

Um ficheiro `AUDITORIA.md` na raiz do projeto com:

- Inventário da arquitetura (rotas públicas/autenticadas, layouts, hooks de dados, edge functions, tabelas, roles, planos, automações).
- Lista de problemas no formato pedido: ID (WF-001…), categoria, severidade, local, problema, como reproduzir, resultado atual, resultado esperado, causa provável, correção recomendada.
- Scores por área (Segurança, Backend, Frontend, Database, UX/UI, Performance, Permissions, Billing, Reliability) e WILLFLOW HEALTH SCORE /100.
- Plano de correção em 4 fases.

Segredos nunca são impressos; se algum aparecer exposto, o relatório diz apenas "SECRET DETECTADO — requer rotação".

## Como a auditoria vai ser feita

Cada bloco é executado por um sub-agente em paralelo, com evidência real (leitura de código, queries à base de dados, navegação com browser headless na app em execução) — nada de afirmações sem verificação.

**Bloco 1 — Segurança e permissões (prioridade máxima)**
- Scanner de segurança + linter da base de dados.
- Revisão de RLS por tabela: procurar tabelas sem policies, policies permissivas (`using (true)`), GRANTs em falta ou largos demais para `anon`.
- Isolamento por workspace: para cada tabela com `workspace_id`, confirmar que as policies filtram por membro do workspace (teste IDOR real: sessão de um utilizador a tentar ler IDs de outro workspace).
- Edge functions: verificar autenticação/autorização em cada uma das 50 (JWT, service-role, CRON secret, verificação de role).
- Links públicos (aprovação de vídeo, assinatura de contrato, convites): enumeração de tokens, expiração, revogação.

**Bloco 2 — Integridade de dados**
- Queries de consistência: registos órfãos, FKs em falta, duplicados, valores nulos onde não deviam, colunas que deviam ser únicas.
- Riscos de DELETE (o que fica órfão sem `on delete cascade`).
- Conferência financeira: totais de faturas vs. linhas, projetos entregues vs. valores no dashboard, regra `is_delivered`, arredondamentos e IVA.

**Bloco 3 — Fluxos funcionais (browser headless, sessão real)**
- Auth: login válido/inválido, sessão, refresh, rotas protegidas sem sessão.
- CRUD e persistência após refresh em: Clientes, Projetos, Kanban (drag & drop), Tarefas/Trabalhos, Calendário, Chat, Financeiro, Ficheiros/Media, Vídeos.
- Regressão do fluxo completo: cliente → projeto → tarefa → evento → custo → ficheiro → link → entrega.
- Captura de erros de consola, requests falhados (401/403/404/500) e loading infinito em cada página visitada.

**Bloco 4 — Planos, subscrições e billing**
- Limites por plano (utilizadores, projetos, armazenamento, funcionalidades) e se são aplicados no servidor e não só no frontend.
- Stripe: checkout, webhook, sincronização de estado, cancelamento, falha de pagamento.

**Bloco 5 — UI/UX, responsividade e performance**
- Screenshots em 1440/1280/1024/768/430/375 nas páginas principais; overflow, elementos cortados, modais, dropdowns, tabelas, Kanban.
- Estados vazios, loading e erro.
- Performance: queries duplicadas, listas sem paginação, re-renders, imagens pesadas, tamanho do bundle.

**Bloco 6 — Código incompleto**
- Varredura por TODO/FIXME, dados mock/hardcoded, botões sem handler, links sem destino, funções vazias, `console.log` em produção, ecrãs que parecem prontos mas não estão ligados ao backend.

## Notas técnicas

- Auditoria só de leitura: sem migrações, sem alterar dados, sem deploys. Testes que escrevem dados usam registos criados para o efeito e são removidos no fim, ou são simulados apenas em leitura quando o risco não compensa.
- Os testes de IDOR usam sessões de utilizadores existentes não privilegiados, nunca a conta owner.
- Findings do scanner de segurança que já foram marcados como corrigidos anteriormente são reverificados, não assumidos.

## Depois do relatório

Apresento o relatório e espero decisão. As correções arrancam pela Fase 1 (Critical), uma de cada vez, com verificação de regressão (consola, API, base de dados, permissões) após cada uma.
