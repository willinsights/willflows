# Revisão técnica S-DELIV + dependências S01 (só relatório)

Não se altera nada: sem código, sem migrações, sem produção. O único resultado é o relatório `S01/15_revisao_SDELIV_e_dependencias_S01.md`, gravado em Files.

## A. Inventário (provas recolhidas por leitura)

**Funções de entrega (base real)**

| Função | Execução | Identidade verificada? |
|---|---|---|
| `deliver_project(uuid,text,uuid)` | DEFINER, authenticated | Não. Nenhum ficheiro da app chama esta versão. |
| `deliver_project(uuid,text,uuid,timestamptz)` | DEFINER, authenticated | Não |
| `can_deliver_project(uuid,text)` | DEFINER, authenticated | Não. Revela contagens de tarefas e checklists de qualquer projeto. |
| `reopen_project(uuid)` | DEFINER, authenticated | **Não: achado novo (S-REOPEN)**. Qualquer conta pode reabrir projetos de outro workspace. |

**Onde a app chama estas funções**
- `ProjectDetailsSheet.tsx`: linha 426 (`can_deliver_project`) e linha 485 (`deliver_project` com 4 argumentos e data escolhida).
- `useKanbanProjectMoves.ts`: linhas 126 e 182 (`can_deliver_project`) e linha 280 (`deliver_project` com 4 argumentos).
- Não há tarefas agendadas que entreguem projetos (`cron.job`: 0 tarefas).

**Auto-entrega e gatilhos em `projects`**
- `trigger_sync_delivery_on_final_column` (BEFORE): ao entrar numa coluna final, marca o projeto como entregue com `delivered_at = COALESCE(..., now())`. Ao sair de uma coluna final, tira a entrega e apaga `delivered_at`.
- Os gatilhos BEFORE correm por ordem alfabética: `prevent_invalid_delivery_trigger` e `trg_guard_closed_month_projects` correm **antes** de `trigger_sync_delivery_on_final_column`.
- Consequência provável, deduzida da ordem dos gatilhos e ainda por provar em teste: com um UPDATE direto da coluna, permitido pela regra de acesso `projects.edit`:
  1. **Sem verificação de checklist:** a auto-entrega não passa pela verificação da checklist.
  2. **Mês fechado contornado:** tirar o card da coluna final anula a entrega de um mês fechado sem passar pelo bloqueio. É um risco financeiro: receita e custos saem de um mês fechado.
- Nenhuma das funções confirma que `p_target_column_id`, ou a coluna gravada, é do mesmo workspace e da mesma fase.
- `guard_closed_month_projects` trava `deliver_project` quando a data cai num mês fechado. A data é livre, por isso uma data futura é aceite.

## B. Permissões necessárias por papel (decisão técnica)

**Regra:** entregar ou reabrir exige `can_edit_project(auth.uid(), projeto)`, ou seja, `projects.edit` no workspace do projeto. A mesma regra protege hoje o UPDATE direto. Não há regra global própria para o Super Admin; fica bloqueado se não for membro do workspace, tal como no UPDATE.

| Papel | Entregar ou reabrir no próprio workspace | Noutro workspace |
|---|---|---|
| Admin / Gestão | Sim, se tiver `projects.edit` | Não |
| Edição / Captação | Só se o papel tiver `projects.edit` (configurável por workspace) | Não |
| Visualização / freelancer sem edição | Não | Não |
| Super Admin | Só como membro com `projects.edit` | Não |
| Anónimo | Sem permissão de execução | Sem permissão de execução |
| Serviço interno | Sim, pela nova `is_service_role()` (depende da S01) | Sim |

## C. Especificação mínima da correção SQL (não aplicar)

1. **Guarda comum**, uma função interna sem permissão de execução para utilizadores: `_assert_can_deliver(project, phase, column)`. Aceita o pedido se for o serviço interno, ou se `auth.uid()` não for nulo e `can_edit_project` for verdadeiro. Caso contrário, devolve "Sem permissão" (código `42501`), sem contagens.
2. **Validação da coluna:** `kanban_columns.workspace_id = projects.workspace_id` e `phase = p_phase`. Caso contrário, devolve "Coluna inválida".
3. **Data de entrega:** recusar datas no futuro, com margem de 5 minutos. O mês fechado continua a cargo do gatilho já existente.
4. **`can_deliver_project`:** aplicar a guarda no início e manter o mesmo formato de resposta.
5. **`deliver_project` com 4 argumentos:** aplicar a guarda e a validação da coluna. A versão de 3 argumentos passa a delegar na de 4 com `now()`; não é apagada nesta fase.
6. **`reopen_project`:** aplicar a mesma guarda (S-REOPEN).
7. **Gatilhos:** novo gatilho BEFORE `zz_guard_delivery_after_sync`, que corre depois da sincronização. Repete o bloqueio de mês fechado e a validação da coluna sobre o NEW final. Fecha o desvio da secção A sem mudar os gatilhos atuais.
8. **Permissões:** `REVOKE EXECUTE ... FROM PUBLIC, anon`; `GRANT` só a authenticated e service_role. Todas as funções com `SET search_path = public`.
9. **Inalterado:** assinaturas, formato JSON das respostas, regras de acesso de `projects`, dados.

**Dependência:** o ponto 1 usa a nova `is_service_role()`. **A S-DELIV só pode ser aplicada depois da S01.** Se for preciso antes, a guarda aceita apenas `auth.role() = 'service_role'`.

## D. Matriz de testes em BD isolada (dados fictícios)

Ambiente: dois workspaces, WA e WB, com perfis admin, gestão, edição com e sem `projects.edit`, visualização, freelancer, Super Admin não membro, anónimo e serviço interno. O mês de outubro fica fechado em WA.

**Negativos (têm de falhar)**
- N1. Membro de WB entrega, reabre ou chama `can_deliver_project` sobre um projeto de WA: "Sem permissão", sem contagens.
- N2. Visualização ou freelancer sem edição entrega um projeto de WA.
- N3. Anónimo chama as 4 funções: sem permissão de execução.
- N4. Admin de WA entrega com uma coluna de WB, ou com uma coluna final da outra fase.
- N5. Data de entrega no futuro.
- N6. Data de entrega em outubro, mês fechado.
- N7. UPDATE direto: tirar da coluna final um card entregue em outubro (mês fechado).
- N8. UPDATE direto: pôr um card de WA numa coluna de WB.
- N9. Versão legada de 3 argumentos com perfis de WB.
- N10. Super Admin não membro.

**Positivos (têm de funcionar)**
- P1. Admin e gestão de WA entregam com a data de hoje e com uma data retroativa num mês aberto.
- P2. Arrastar um card para a coluna final entrega-o automaticamente; arrastar para fora reabre-o num mês aberto.
- P3. Uma checklist incompleta continua a bloquear a entrega com `CHECKLIST_INCOMPLETE`.
- P4. O serviço interno entrega.
- P5. `reopen_project` funciona com o admin de WA.
- P6. Lucro, "A pagar", competência e notificações de entrega mantêm-se iguais aos de antes.

**Integridade**
- I1. Contagens e somas de verificação de `projects`, `project_team` e `closed_months` iguais antes e depois.
- I2. Aplicação atómica: com um erro forçado, nada fica aplicado.
- I3. O ensaio da reversão confirma que N1–N4 continuam bloqueados.

## E. Reversão que não reabre o acesso entre workspaces
- Repõe o corpo funcional anterior de cada função, mas **mantém a guarda de identidade e as permissões de execução**.
- Se o gatilho `zz_` causar um falso bloqueio, só ele é desativado; a guarda das funções fica.
- Não existe um passo que reponha a versão sem verificação. É proibido documentá-lo.

## F. Dependências em aberto da S01 para produção

| # | Dependência | Estado verificado | Como fechar |
|---|---|---|---|
| F1 | Cópia de segurança verificável | Não verificada. O caminho no menu não foi confirmado e não há hora da cópia. | O proprietário indica a data e hora da última cópia restaurável e faz uma exportação de dados antes de aplicar. |
| F2 | Alteração do ecrã de registo (12) | O Auth.tsx atual ainda tem o código original na linha 182 (`from('promo_codes')`), compatível com o diff. O texto não foi comparado com a cópia de teste e o diff não foi testado sobre o código atual. | Ensaio numa cópia isolada: aplicar o diff, confirmar que compila e repetir os testes de registo com e sem código. |
| F3 | Permissões de execução | Os testes 09 não as mostram; estão só no ficheiro 10. | Adicionar a P1 a verificação das permissões de execução de anon, authenticated e PUBLIC. |
| F4 | Serviços externos | Não testados (pagamentos, vídeos, Google). | P7: 60 minutos de registos sem erros novos. |
| F5 | Matriz de apagar registos | Não testada. | Aceite como risco residual, documentado. |

## G. Achados novos a registar
- **S-REOPEN (crítico):** `reopen_project` não verifica identidade. Junta-se ao S-DELIV.
- **S-DELIV-TRG (alto):** a ordem dos gatilhos permite contornar a checklist e o mês fechado através da coluna final. Por provar no teste N7.

## Próximo passo seguro
Fechar F1–F3 da S01 sem tocar na produção:
1. O proprietário fornece a prova da cópia de segurança.
2. Ensaio isolado do diff de registo e da verificação das permissões de execução.

Só depois se aplica a S01. A seguir, o ensaio S-DELIV da secção D na base isolada.

**Não verificado:**
- o comportamento real dos gatilhos (N7 e N8 são deduções da ordem alfabética);
- se outros papéis personalizados concedem `projects.edit`;
- outras funções privilegiadas com o mesmo padrão, para além das quatro listadas.
