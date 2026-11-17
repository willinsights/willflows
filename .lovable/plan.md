# Auditoria de fecho WillFlow 2.0 (só leitura)

## Objetivo
Produzir uma matriz priorizada e verificável de todas as pendências da 2.0 e um roadmap para 2.0 estável, sem alterar código, base de dados, segredos, configuração, agendamentos ou produção, e sem executar crons nem fazer deploy. «Ilimitados» mantém-se por decisão do proprietário.

## Classificação de estado (obrigatória por item)
- **Código**: existe no editor (ficheiro/linha).
- **Publicado**: presente no frontend servido em willflow.app (SHA/asset) ou função ativa (só quando houver evidência de versão).
- **Testado isolado**: teste offline/cópia temporária identificado e executado.
- **Verificado em produção**: evidência por catálogo, metadados ou logs reais.
- **Não verificável**: sem ferramenta ou sem registo; indicar o motivo.

Regra: nenhum item sobe de estado sem evidência citada. Os 5 cron não serão declarados "a devolver 401" sem logs HTTP; o estado será "incompatibilidade prevista no código, resultado HTTP não verificável".

## Âmbito e fontes por área
| Área | Fontes de leitura |
|---|---|
| S01 segurança/RLS/serviços internos | linter, resultados Security existentes, catálogo de políticas/ACL/SECURITY DEFINER, docs/security |
| Planos: limites e permissões | plans.ts, PLAN_LIMITS, funções enforce_plan_*, can_access_feature |
| Pagamentos/Stripe | funções stripe-*, subscription_discrepancies (agregado), stripe_webhook_log (contagens) |
| Criação e trial | create_trial_subscription, handle_new_user, signup, regra "uma vez por conta" |
| Cron HTTP | list_http_schedules (sem comandos), código das 5 funções, cron-auth.ts |
| Editor/aprovação de vídeo | funções de vídeo ativas vs docs/security/g04-s03/revised, useVideoVersions.ts |
| CRM, projetos, calendário | hooks/páginas, S-DELIV, triggers de mês fechado, Google Calendar |
| Financeiro | testes financeiros, v_project_profit, fontes partilhadas |
| Notificações/push/email | push_notification_queue, email_send_log (agregados), domínio notify.willflow.app |
| Storage | workspace_storage, quotas, retenção de vídeo |
| Integrações | Google OAuth/Calendar, R2/Stream (só metadados) |
| Site público | Landing, preços, JSON-LD, prova social, blog fail-closed |

## Pendências já conhecidas (a confirmar na auditoria)
| # | Pendência | Sev. | Evidência atual | Estado |
|---|---|---|---|---|
| 1 | 5 agendamentos sem autenticação compatível | Alta | check-deadlines/index.ts L2/L29 aceita gerida; cleanup-expired-videos/index.ts L21 só `x-cron-secret`; histórico HTTP bloqueado | Código parcial; produção não verificável |
| 2 | Lote vídeo G04/S03 completo (processador estrito + SQL) | Alta | pacote revisto v2; transição de chaves; versões ativas desconhecidas | Testado isolado |
| 3 | Notificações push pendentes sem worker | Média | 46 pendentes, sem cron associado | Verificado (agregado) |
| 4 | Divergência Stripe aberta desde junho | Média | subscription_discrepancies: 1 aberta | Verificado (agregado) |
| 5 | Confirmar primeiro envio real pós-retries | Média | fila sem jobs novos após deploy | Não verificado |
| 6 | Trial apenas uma vez por conta | Média | sete dias confirmados; regra por conta não confirmada | A confirmar |
| 7 | Domínio de email com CNAME pendente | Média | estado notify.willflow.app | A confirmar |
| 8 | Logótipos/prova social e preços vs Stripe | Baixa | revisão do site anterior | A confirmar |
| 9 | Reorganização Calendário/Criar Projeto | Baixa | roadmap item 7 adiado | Adiado |
| 10 | Divergência de memória sobre «Ilimitados» | Info | plans.ts vs regra de comunicação | Decisão do proprietário: manter |

## Formato de cada linha da matriz final
Severidade · evidência (ficheiro:linha, teste ou consulta) · estado · causa provável · correção mínima segura · dependências · plano de testes · critério de aceitação.

## Entrega (no chat)
1. Matriz priorizada (Crítica → Baixa).
2. Roadmap 2.0 estável em fases: (A) agendamentos e autenticação, (B) lote vídeo coordenado, (C) push/Stripe/email, (D) trial e planos, (E) site público, (F) refactors adiados.
3. Riscos e decisões que exigem aprovação: substituição dos agendamentos (risco de execução duplicada), ordem de implantação do vídeo e reversão, tratamento da divergência Stripe, ativação de worker push, regra do trial.

## Detalhes técnicos
- Ferramentas só de leitura: code--view/rg, supabase--read_query (SELECT de catálogo e contagens agregadas, sem dados pessoais), supabase--linter, security--get_scan_results, list_http_schedules, logs de funções, Vitest em /tmp quando necessário.
- Proibido: run_sql, migrações, deploy, rebind/alteração de segredos, criação/alteração de agendamentos, publicação, invocar funções de negócio.
- Subagentes em paralelo por área para leitura; consolidação final com evidências.
