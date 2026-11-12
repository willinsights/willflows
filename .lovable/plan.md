# WillFlow 2.0 — Auditoria completa (só leitura) e relatório

## Objetivo
Executar a auditoria descrita no documento WILLFLOW 2.0 sem alterar código, dados nem configurações. No fim entrego um relatório em PDF (e cópia em Markdown) com os 10 relatórios pedidos e o roadmap. Nenhuma correção é aplicada antes da sua aprovação, etapa a etapa.

## Como vou trabalhar
Auditoria dividida em 6 frentes, investigadas em paralelo:

1. **Arquitetura e código** (Fases 1, 4, 15): mapa real da app (React + Vite + Lovable Cloud — não Next.js/Prisma; confirmo no projeto), ficheiros grandes, duplicações, código morto, dependências.
2. **Cibersegurança** (Fase 2): resultados do scanner de segurança, regras de acesso por tabela, funções privilegiadas, isolamento entre workspaces, funções do servidor, OAuth, emails. Retomo os achados da auditoria de 25/10 e confirmo o que ainda está aberto.
3. **Base de dados e financeiro** (Fases 5, 7): 104 tabelas, índices, gatilhos, coerência das regras já decididas (entrega = competência, custo vs pagamento, lucro único, meses fechados). Consultas só de leitura para detetar dados inconsistentes.
4. **Funcionalidades e erros** (Fases 3, 6): cada módulo (Kanban, projetos, revisão de vídeo, chat, calendário, clientes, orçamentos, fechos, colaboradores, automações, planos/Stripe, admin): o que faz, o que falha, o que é redundante. Logs recentes e testes existentes.
5. **Desempenho, UX e site público** (Fases 8, 9, 10): consultas lentas, carregamentos repetidos, ecrãs pesados, testes no navegador em computador e telemóvel, site público e conversão (mantendo a versão visual que prefere).
6. **Tecnologia, IA e mercado** (Fases 11, 12, 16): automações e IA úteis ao estúdio, tecnologias atuais adequadas, comparação com plataformas semelhantes.

Tudo o que eu não conseguir verificar fica marcado "Não verificada". Nenhum segredo aparece no relatório.

## Entrega
- Relatório 1–10 conforme Fase 19, cada problema com gravidade (crítica/alta/média/baixa), evidência, impacto para o estúdio e correção proposta.
- Proposta de arquitetura WillFlow 2.0 (evolução, não reescrita).
- Roadmap em 7 etapas (Fase 18), cada uma com testes e reversão.
- Ficheiro: `/mnt/documents/willflow_2_0_auditoria.pdf`.

## Limites
- Só leitura: zero alterações à app, base de dados, utilizadores ou publicação.
- A análise profunda de segurança automática pode ser iniciada se autorizar (demora 5–15 min).
- É um trabalho grande: estimo que consuma bastantes créditos e algum tempo.

## Detalhes técnicos
- Ferramentas: rg/leitura de src e supabase/functions, migrações, read_query, linter, scanner de segurança, slow_queries, logs em /tmp/observability e de funções, vitest existente, Playwright.
- Relatório gerado com ReportLab, verificado página a página antes de entregar.

## Condições adicionais aprovadas por si
- Scanner automático de segurança autorizado, só diagnóstico.
- Todas as 104 tabelas: regras de acesso, permissões, ligações entre tabelas, isolamento entre workspaces.
- Financeiro completo: receitas, faturação, recebimentos, custos, pagamentos, lucro, competência e fechos.
- Redundâncias apenas identificadas, nada eliminado.
- Integrações: Stripe, emails, login, armazenamento, vídeo (Cloudflare) e outros serviços.
- Desempenho real e custo atual da infraestrutura, com impacto das tecnologias propostas.
- Permissões de todos os perfis: Super Admin, administradores, colaboradores, freelancers.
- Cada achado de 25/10 confirmado individualmente: resolvido / ainda presente / não verificado.
- Classificação: erro comprovado, vulnerabilidade confirmada, risco potencial, não verificado.
- Cada melhoria com: problema e evidência, localização, solução, ficheiros, impacto e prioridade, dependências, complexidade, riscos, testes, reversão.
- Entrega em PDF e Markdown: `/mnt/documents/willflow_2_0_auditoria.pdf` e `.md`.
