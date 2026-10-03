# Auditoria de produto, UX e financeiro do WillFlow (só diagnóstico)

Nesta etapa não se altera código, base de dados, automações nem interface. O resultado é um relatório escrito. As correções só arrancam depois da sua aprovação, ponto a ponto.

## Entregável

Um relatório novo, `AUDITORIA_PRODUTO.md`, em português e com as 10 secções que pediu:

1. Auditoria completa: mapa dos módulos e da forma como comunicam entre si, incluindo os dados que são guardados em mais de um sítio
2. Problemas encontrados, com página, componente, função, tabela, fluxo afetado, problema, consequência, solução e prioridade (Crítico / Alto / Médio / Baixo)
3. Análise do Financeiro: competência, previsão e caixa
4. Arquitetura financeira recomendada
5. Melhorias de UX, analisadas por perfil (Freelancer, Produtora, Agência, Colaborador)
6. Automações possíveis
7. Funcionalidades novas, só quando não existir já algo semelhante
8. Problemas técnicos (performance e arquitetura)
9. Problemas de segurança, como revisão do que ficou da auditoria anterior e não como repetição
10. Roadmap em fases

## Como vai ser feito

Vários agentes de análise trabalham em paralelo. Cada conclusão tem de ter prova: o ficheiro e a linha, uma consulta aos dados reais ou uma captura de ecrã da app.

**A. Financeiro (prioridade máxima)**
- Rastrear cada número do Financeiro e do Dashboard até à origem: receita, custos, pagamentos a colaboradores, custos extras, linhas de custo, trabalhos, fechos, previsão e caixa.
- Para cada valor, identificar a data que define o mês: entrega, gravação, data de pagamento ou mês de competência.
- Procurar casos em que o mesmo custo é contado duas vezes. Exemplos: o custo de edição no projeto e o pagamento do mesmo colaborador na equipa do projeto; o custo extra e as linhas de custo; os trabalhos e os fechos. A verificação usa totais reais dos seus workspaces.
- Comparar a mesma métrica em ecrãs diferentes (Dashboard, Visão, Lucro, Fecho mensal, Relatórios) e listar as diferenças.
- Comparar o modelo atual com o fluxo proposto (Projeto → Colaborador → Valor → Concluído → A pagar → Ciclo → Pago) e com os ciclos de pagamento configuráveis, com recomendação justificada e sem assumir à partida que o modelo novo é melhor.

**B. Fluxos e UX**
- Percorrer a app com sessão real, em computador e em telemóvel, nos módulos principais: Dashboard, Projetos/Kanban, CRM/Clientes, Equipa, Calendário/Tarefas/Trabalhos, Financeiro, Chat, Media/Review, Configurações e Planos.
- Contar cliques nas tarefas mais comuns e registar nomes inconsistentes, ações duplicadas, estados sem função e informação escondida.
- Simular a vista de um colaborador: o que tem a fazer, quanto vai receber e quando.

**C. Técnico e segurança**
- Hooks e cálculos duplicados, consultas repetidas, componentes muito grandes, subscrições desnecessárias e índices.
- Rever permissões e acesso financeiro por função, com o que está pendente no scanner de segurança e no linter, sem corrigir nada.

## Notas técnicas
- Só leitura: consultas de leitura, leitura de código e navegação com browser. Nenhuma migração e nenhum deploy.
- Os valores financeiros reais aparecem agregados. Nenhum dado pessoal sensível entra no relatório.
- Respeita as regras já definidas do projeto: um projeto só entra no Financeiro quando é dado como entregue, e o mês é ancorado por entrega → gravação → data de criação. Onde a auditoria sugerir mudar uma destas regras, isso fica assinalado como decisão sua.
