# Preparação — o que só o proprietário pode fazer

Antes da primeira execução do orquestrador, por esta ordem.

1. **Proteger o `main`.** No GitHub, em Settings, Branches: exigir PR, exigir o CI verde e proibir push direto. O Lovable sincroniza a partir do `main` e pode publicar sozinho, por isso sem isto um erro de um agente chega a produção.
2. **Acesso só de leitura à base de dados.** Os agentes devem ler a base através de uma credencial só de leitura. Não confirmei se o Lovable Cloud permite criar esse papel; confirmar antes. Enquanto não existir, a leitura da base fica como tarefa manual ou supervisionada.
3. **Ambiente de teste.** Depende da tarefa A2 (migrações reproduzíveis). Até existir, nenhum agente toca na base de produção, nem para escrever nem para testar.
4. **Como correr.** Abrir o Claude Code na raiz do repositório (num computador onde as dependências instalem) e executar `/orquestrar`. O orquestrador é o comando da sessão principal, e não um subagente, porque não tenho a certeza de que um subagente consiga lançar outros.
5. **Execução agendada (opcional).** Só depois dos pontos 1 a 3. Limitar a tarefas com estado `pronta` e deixar o orquestrador parar em qualquer condição dos guardrails.

Lembrete: os ficheiros em `docs/agents/` ficam públicos com o repositório. Rever o `BACKLOG.md` e o `STATE.md` antes de cada integração.
