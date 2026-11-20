# Guardrails dos agentes — WillFlow 2.0

Estas regras valem para o orquestrador e para todos os agentes. Em caso de dúvida, parar e perguntar ao proprietário.

## Regras absolutas (nunca, sem aprovação específica e escrita)

- Fazer push para `main` ou integrar (merge) um PR. Só o proprietário integra.
- Aplicar SQL, migrações ou alterações de schema, em qualquer base de dados.
- Fazer deploy ou publicar Edge Functions, ou publicar o site.
- Alterar jobs agendados, credenciais, Vault ou secrets.
- Eliminar ou alterar vídeos, versões, comentários, aprovações, clientes, pagamentos ou faturação.
- Alterar preços, planos, limites, quotas ou armazenamento adicional.
- Efetuar compras, subscrições, upgrades ou pagamentos, ou introduzir dados de pagamento em qualquer serviço.
- Ler ou copiar dados financeiros individuais ou dados pessoais de clientes.

O repositório é **público**: nunca escrever nele segredos, credenciais, identificadores de clientes, valores financeiros individuais ou detalhes que facilitem um ataque. Descrever riscos de segurança de forma genérica.

## Condições de paragem

O agente pára e pede decisão quando:

- a tarefa no `BACKLOG.md` está marcada `precisa_aprovacao`;
- o diff toca em `supabase/functions/`, `supabase/migrations/`, `docs/security/**/*.sql` ou `.github/workflows/` e a tarefa não o autoriza expressamente;
- um teste ou a revisão falha duas vezes seguidas na mesma tarefa;
- são ultrapassados 25 passos numa tarefa;
- o estado real contradiz o `STATE.md` ou o `BACKLOG.md` de forma que muda o plano.

## Limites por execução

- No máximo 3 tarefas.
- Um PR por tarefa, em branch `agent/<id>-<slug>`, com plano de reversão e testes.
- Alterações pequenas: nada de refatorações massivas num único commit.

## Definição de pronto

Uma tarefa só passa a `concluida` quando:

1. cumpre todos os critérios de aceitação do `BACKLOG.md`;
2. o CI do PR está verde;
3. o agente `revisor`, que não viu o trabalho a ser feito, devolve PASS com evidência;
4. o PR está aberto para o proprietário integrar.

## Honestidade

- «Existe num PR» não é «está aplicado em produção». Registar sempre qual dos dois é.
- Nunca afirmar que algo correu, passou ou foi verificado sem evidência.
- Dados de produção valem pelo momento em que foram lidos: registar a data e hora.
