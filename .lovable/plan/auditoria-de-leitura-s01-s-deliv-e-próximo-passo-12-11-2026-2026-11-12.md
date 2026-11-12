# Auditoria de leitura — S01, S-DELIV e próximo passo (12/11/2026)

Nada foi alterado: sem código, dados, migrações nem publicação. Só leitura de ficheiros em Files e consultas SELECT à base real.

## 1. Artefactos S01 (Files → S01/)

| Ficheiro | Estado vs. teste (09_resultados_testes_minima.md) |
|---|---|
| 10_migracao_producao_S01.sql (52 linhas) | Corpo da função `is_service_role()` igual, linha a linha, ao catálogo final do 09 (linhas 190–205 e 8427–8440). As 14 políticas `TO service_role` e "System admins can view all invoices" (`is_system_admin(auth.uid())`) iguais ao catálogo (linhas 8445–8490). |
| 11_rollback_producao_S01.sql (5 linhas) | Só faz `DROP POLICY "System admins can view all invoices"`. Nunca repõe a função antiga. Está coerente. |
| 12_alteracao_registo_Auth.diff (83 linhas) | Retira a leitura de `promo_codes`, o UPDATE de `trial_ends_at` e o `increment_promo_code_usage`. As mensagens dizem "não será aplicado / 7 dias normais". O efeito é o mesmo que o G6-UI-com do 09, mas o texto não foi comparado com o ficheiro do teste (não está disponível). |
| 13_plano_execucao_S01.md | Passos 1–6 e verificações P1–P9 coerentes com o 10/11/12. |

**Divergências e lacunas**
- D1. O catálogo do 09 não mostra as permissões EXECUTE (`REVOKE FROM PUBLIC` / `GRANT anon, authenticated, service_role`). O 10 inclui-as, mas não há prova de teste direta. P1 tem de as conferir.
- D2. `SECURITY INVOKER` é explícito no 10 e implícito no catálogo. Equivalente (o catálogo não mostra DEFINER).
- D3. O diff tem números de linha (`@@ -180`, `@@ -279`, `@@ -319`) que não confirmei contra o Auth.tsx atual. Aplicar à mão e conferir.
- D4. O caminho da cópia de segurança indicado no 13 ("Mais → Base de dados → Gerir → Cópias de segurança") não foi verificado. É uma condição para avançar e depende do proprietário.
- D5. Ficam sem teste no 09: a matriz DELETE completa, o Studio no navegador autenticado, a aprovação pública de vídeo de ponta a ponta e os serviços externos (Stripe, Cloudflare, Google). P7 cobre-os só por observação dos registos.
- D6. A função `increment_promo_code_usage` continua a poder ser chamada diretamente (não foi revista). Fica para a Fase 2.

**Risco de aplicar:** baixo para os dados (só estrutura, uma transação). É alto em efeito comercial: 44 workspaces com teste terminado e o "Test Starter" passam a ficar bloqueados para criar. O In-Sights não é afetado. Os códigos promocionais ficam indisponíveis.

## 2. Bypass S01 na base real (agora)
- `is_service_role()`: SECURITY DEFINER, `... OR current_user = 'postgres' OR current_user = 'service_role'`. **Continua vulnerável.**
- **14 políticas** dependem dela (contagem em pg_policies).
- 3 funções a chamam: `enforce_plan_project_limit`, `enforce_plan_client_limit`, `enforce_workspace_subscription_active`.

## 3. S-DELIV — análise (sem implementar)
Provas na base real:
- `deliver_project` tem 2 versões (3 e 4 argumentos), ambas SECURITY DEFINER e executáveis por `authenticated`. A versão de 3 argumentos é um duplicado legado.
- Nenhuma faz verificação de identidade: não usa `auth.uid()`, nem `is_workspace_member`, nem `can_edit_project`. Fazem `UPDATE projects` com privilégio de dono.
- `p_target_column_id` não é validado: a coluna pode ser de outro workspace ou de outra fase.
- `p_delivered_at` é livre. Uma data retroativa só é travada pelos gatilhos de mês fechado (não testado por esta via).
- `can_deliver_project` (DEFINER, `authenticated`) revela a existência e as contagens de tarefas de projetos de outros workspaces.
- Prova existente: ANTES-S-DELIV e DEPOIS-S-DELIV no 09 → `can_deliver = true` para um colaborador de outro workspace.
- A app chama estas funções em ProjectDetailsSheet.tsx (linhas 426, 485) e em useKanbanProjectMoves.ts (linhas 126, 182, 280).

**Correção proposta (S-DELIV)**
1. No início das duas funções: `auth.uid()` não nulo e `can_edit_project(auth.uid(), p_project_id)`, ou o serviço interno pela nova `is_service_role()`. Caso contrário, devolver `can_deliver=false` com "Sem permissão", sem revelar contagens.
2. Validar que `p_target_column_id` pertence ao workspace do projeto e à fase `p_phase`.
3. Recusar `p_delivered_at` no futuro. A data retroativa fica sujeita a `is_month_closed`.
4. Retirar a versão de 3 argumentos (confirmar que a app só usa a de 4) ou fazê-la delegar na de 4.
5. Manter a assinatura e o formato de resposta, para não mexer na app.

**Matriz de testes isolados (dados fictícios, cópia separada)**

| Perfil | Projeto próprio | Projeto de outro workspace | Coluna de outro workspace | Data no futuro / mês fechado |
|---|---|---|---|---|
| Admin | entrega | bloqueado | bloqueado | bloqueado |
| Gestão / Edição com permissão | entrega | bloqueado | bloqueado | bloqueado |
| Visualização | bloqueado | bloqueado | — | — |
| Freelancer/colaborador sem edição | bloqueado | bloqueado | — | — |
| Super Admin | conforme a regra global atual | registar resultado | bloqueado | bloqueado |
| Anónimo | sem EXECUTE | sem EXECUTE | — | — |
| Serviço interno / auto-entrega por Kanban | entrega | entrega (só serviço) | bloqueado | — |

Para todos os perfis também se testa:
- `can_deliver_project` não revela contagens de outro workspace;
- regressão de "Entrega retroativa" e da auto-entrega por colunas finais;
- recálculo do lucro e de "A pagar" depois da entrega;
- contagens antes e depois iguais.

## 4. Sequência após S01
1. **Segurança:** S01 → S-DELIV → checkout com preço escolhido pelo cliente → password das contas "pro" no código → e-mail para qualquer destinatário → vídeos de outros editores → exportação após cancelamento → OAuth amplo.
2. **Financeiro:** custo que não atualiza o lucro (C-F01), 54 projetos com custo divergente (C-F02), mês fechado incompleto (C-F03), competência e relatórios (C-F04/05), fechos não atómicos.
3. **Operações:** 147 automações e 46 push mortas, limpeza de vídeos que apaga referências quando o Cloudflare falha, sucesso falso no Kanban, duas falhas da aprovação de vídeo (enum `owner` e falta de INSERT).
4. **UX/Fase 2 S01:** códigos promocionais seguros com limite de tentativas, exceções comerciais só de revogação, bloqueio de concorrência nos limites, cancelamento auditado pelo Super Admin.

## Próximo passo único
**Aplicar a S01 em produção** com o 10 + 12 tal como estão, depois de autorização explícita.

Condições de aceite:
- O proprietário confirma a hora da cópia de segurança de hoje.
- As pré-verificações repetidas são iguais às de hoje: função vulnerável, 14 políticas, 775 projetos e 59 workspaces.
- P1 inclui as permissões EXECUTE (D1).
- P1–P9 passam: 0 políticas com `is_service_role`, P3 dá "não" a todos os perfis humanos, P8 tem contagens idênticas.
- Sem novos erros nos serviços internos durante 60 minutos.
- O diff aplica-se sem conflito e a compilação fica OK (D3).
- Se P1–P4 falharem: aplicar o 11 e nunca repor a função antiga.

## Não verificado
- O texto final da cópia de teste versus o 12.
- O caminho da cópia de segurança.
- A matriz DELETE.
- O comportamento real dos serviços externos.
- Se outra RPC SECURITY DEFINER partilha o padrão do S-DELIV (exige uma varredura dedicada).
