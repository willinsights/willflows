# Primeiro lote: reconciliação Stripe independente

**Candidato, não autorização.** SQL exacto `candidate.sql`, reversão `rollback.sql`, handler `supabase/functions/stripe-reconcile/index.ts`, helpers cron-auth/timing-safe/safe-cron; SHA256SUMS local. Nenhuma quota, vídeo, push, email, frontend ou factura incluída. No Stripe só subscriptions.retrieve. Escritas permitidas FUTURAS: novas divergências e claims de execução, não cobranças/resolução de histórico.

## Pré-condições fail-closed
- Novo catálogo antes de aplicar: safe_cron_runs e três RPCs deste pacote ausentes, índice/constraint ausentes; schema workspaces/user_subscriptions/profiles/discrepancies consistente. Se pacote hardening já aplicado, este não é compatível: STOP e novo pacote, não IF NOT EXISTS cego.
- Zero abertas com null/blank identity/duplicadas; um vínculo de workspace por subscrição; snapshot anterior não substitui preflight. candidate SQL aborta por null/duplicadas, RPC recusa vínculo ambíguo; blanks exigem preflight explícito.
- Proprietário comprova backup UTC e método recuperável; capturar definição/ACL da função e artefacto/version actual/previous, segredos não exportados. SQL cria recursos novos, sem substituir schema de pagamentos; único índice parcial afecta futuras inserções abertas.
- Aprovação específica para pausar **job 11 stripe-reconcile-daily**, manter `15 3 * * *`; pausar não cancela pedido HTTP antigo. Provar drenagem inclusive callers manuais via operador/logs completos. Sem prova não copiar código activo, pois pode implantar automaticamente.

## Ordem
1. Apresentar SHA SQL/handler/helpers/rollback e riscos ao proprietário; nenhuma execução com aprovação genérica “Avance”.
2. Pausa autorizada, logs de zero in-flight/pending, guarda fontes anteriores verificadas e backup.
3. Aplicar apenas SQL exacto via migração versionada transaccional após aprovação do pacote. Rever catálogo/ACL/RLS por SELECT, sem operações de negócio.
4. Copiar apenas handler/helper necessários após autorização de activação. Helper existente cron-auth gerado não sobrescrever sem prova de equivalência; rebind não autorizado. Se não há implantação selectiva comprovada, STOP. Não publicar Main/global.
5. Confirmar versão activa/artefacto. Retomar MESMO job 11 autorizado; nenhum novo schedule, sem mudança de frequência.
6. Canário primeiro **evento natural** aprovado: HTTP 200, checked esperado e errors=0, claim idle, no duplicate open identities, nenhum email/payment mutation. Comparar antes/depois agregados + monitor de chamadas Stripe só GET. Não invocar manualmente enquanto job pode correr; canário manual só aprovação separada/drenado. Cliente “notify:true” não tem caminho envio.
7. Se retrieve transitório falhar: 503 e claim uncertain; não recuperar automaticamente; STOP/pausa autorizada, comparar logs. Não chamar cobrança nem retry incerto.

## Rollback e aceitação
- Antes de qualquer claim: parar/drenar, restaurar handler EXACTO capturado só se seguro/no-email e o proprietário aprovar; `rollback.sql` remove apenas novos recursos, conserva todas divergências. Testado offline.
- Com qualquer claim: rollback SQL aborta, manter ledger/unique index e função segura; pausar e corrigir forward. Não apagar claims/histórico nem repor antigo envio de email. Rollback de código anterior pode reactivar email, portanto proibido automaticamente.
- Critério release: artefacto verificado + backup + drenagem + aprovação exacta + evento natural sanitizado com confirmação de execução e nenhuma escrita de pagamentos/envios. Sem qualquer um: NO-GO. Uma execução simulada não fecha produção.