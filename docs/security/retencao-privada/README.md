# Retenção das versões privadas (wf2_) — candidato, NÃO aplicado

Decisão do proprietário de 23/11/2026: os vídeos servem só para aprovação e são apagados do Cloudflare 7 dias depois de aprovados. A8 (#47) aplicou a regra às versões legadas. Esta pasta trata das versões do registo privado `willflow_video_private`, que a limpeza legada não alcança.

## Desenho
1. `retention_settings` é um interruptor no servidor. Vem **desligado** e, sem linha, conta como desligado.
2. `private_video_retention_withdraw(limit)` (só `service_role`, com o lock 742019 dos outros escritores) retira (`state='withdrawn'`) as versões `persisted/ready` do mesmo âmbito (workspace, projeto, tarefa) quando a aprovação tem mais de 7 dias.
   - Uma aprovação mais recente no âmbito reinicia a janela.
   - Versões `submitting/uncertain` nunca são tocadas.
   - Os objetos R2/Stream vão para o outbox `assets` existente, com `reason='retention_after_approval'`.
3. `worker.ts` apaga no fornecedor. No Stream, 404 conta como já apagado. `private_video_retention_result` só marca `deleted_at` com sucesso confirmado; as falhas ficam para a próxima corrida.
4. Comentários, aprovações, links e linhas de versão **ficam** na base. A quota privada liberta-se porque `withdrawn` já está excluído da soma.

## Ensaios (dados fictícios)
- `python3 -I ensaio_postgres.py` usa PostgreSQL 17 descartável. Carrega as migrações aplicadas `drizzle/migrations/0013–0015` (com `WF_SIDECAR=draft`, o rascunho `sidecar.sql`) e depois o candidato. Os 10 pontos passam:
  - desligado não faz nada;
  - pedido sem `service_role` é recusado;
  - só o âmbito vencido é retirado;
  - aprovação recente reinicia a janela;
  - `uncertain` fica intacta;
  - aprovações preservadas;
  - outbox correto;
  - falha fica pendente;
  - segunda corrida é idempotente;
  - quota libertada;
  - o rollback aplica.
- `npx vitest run --config docs/security/retencao-privada/vitest.config.ts`: 3 testes do worker com fornecedores simulados.

## Riscos para aprovação
- **Eliminação externa irreversível.** Depois de ativado, os ficheiros R2/Stream das versões privadas aprovadas há mais de 7 dias são apagados. O link de aprovação continua a abrir, mas sem vídeo.
- **Âmbito por tarefa.** Aprovar uma versão retira também as outras versões da mesma tarefa, como na regra legada. Numa entrega sem tarefa, todo o projeto conta como um âmbito, o que é mais largo do que no legado, onde só a versão aprovada sai.
- **Definições de produção.** O ensaio usa o texto das migrações 0013–0015 do repositório. As dependências externas (contabilidade, permissões, assinatura) ficam como stubs, e as fixtures são inseridas com os triggers desligados. O catálogo real de produção não foi comparado, porque não há acesso de leitura à base (ver A6/A7).
- **Leitores.** `withdrawn` faz o leitor privado recusar a versão. A interface deve mostrar «vídeo expirado após aprovação» e não um erro genérico; isso ainda não está feito.
- **Ordem de ativação.** Aplicar o SQL, publicar o worker em `cleanup-expired-videos` e só depois ligar o interruptor. O rollback desliga e remove as funções, mas não repõe ficheiros já apagados.
