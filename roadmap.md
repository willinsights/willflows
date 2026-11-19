# Roadmap — pendências da auditoria

## PR #2 — activação coordenada autorizada em 19/11/2026
- [x] Implementar reprodução privada candidata: ingestão/settings signed-only, signer autorizado e página/hook/approval; 72 testes, tipos/build e GET real playlists/segmentos 200 dos dois UIDs sintéticos, 1064 bytes cada; sem deploy/quota. Provas PRIVATE-PLAYBACK-2026-11-19.md.
- [x] Rever baseline individual actual, dependências e compatibilidade pós-PR11; 47 hashes intactos, 64 testes, 22 grupos PG, 5 Deno checks e overlay/browser aprovados; relatório ACTIVATION-2026-11-19.md.
- [ ] Aplicar apenas SQL montado pelo assembler: bloqueado por reconciliação individual não comprovada, ausência de barreira/janela e drenagem HTTP/job6; não alterar job12, faturação ou limpeza.
- [ ] Implantar handlers/frontend coordenados e ensaiar substituição fictícia integral: bloqueado por playback privado não integrado, cleanup escritor/deleter ainda activo e reversão das versões activas não exportada; conservar PR11 e indicador de refresh posterior.
- [x] Restauro real PG17.12 confirmado pelo proprietário: 138 TABLE DATA e 735 índices/restrições/FKs; não repetir, sem restauro sobre produção.

## PR #2 — canário real autorizado, sem vídeos/quota de clientes
- [x] Criar despacho privado único e função pr2-video-canary, testar ACL/replay e implantar apenas o canário.
- [x] Executar duas fixtures R2/Stream privadas: 18 verificações PASS; autorização consumida permanentemente e função removida (HTTP 404). Provas no registo privado, resumo em docs/security/pr2-canary/RESULT.md.

## Retoma das pendências — novembro 2026
- [ ] Base 24869199: núcleo vídeo/quota isolado preparado em video-integration; 24 Vitest/13 grupos PG + 5 next/19 G04 regressivos PASS. Fecho bloqueado por créditos: compilação/cópia UI, tickets abas antigas, imutabilidade HEAD, writers SQL standalone/fencing/rollback; lista exacta em STATUS.md. Stripe primeiro lote permanece separado e NO-GO operacional
- [x] Base 317ef62b: recursos operacionais lidos (logs alvo ausentes; backups/export activo não acessíveis), upload durável/outbox/contratos quota e Stripe mínimo isolados, SQL/reversão/testes em docs/security/fase-a/next
- [ ] Produção continua bloqueada: proprietário confirmar contrato total/número replacement, timestamp backup, artefacto/version e drenagem; aprovação específica pacote Stripe antes de SQL/função/pausa; 46 push intocados e contador sem ajuste
- [x] Base d5279982: baseline agregado/catálogo; cascatas, produtor push/starvation e enriquecimento Stripe ajustados isoladamente; 27 Vitest/26 grupos PG/2 Deno; plano em hardening/BASELINE-2026-11-17.md
- [ ] Gates operacionais finitos: versões/exportação activa, backup e logs de drenagem/HTTP, política dos 46 push antigos; quota exige contrato add-on, operação upload durável/outbox e reconciliação autorizada de 1 contador; não repetir auditoria sem novas evidências
- [x] Preparar candidatos base ee4c57fd de quota/escritores, push, Stripe e overlap; testes SQL/integração fictícia e matriz em docs/security/fase-a/hardening, sem produção
- [ ] Hardening produção: baseline divergente por reconciliar, contrato quota/upload/outbox e carga integral; versões/backup/drenagem e política de fila antiga pendentes; produtor push e enriquecimento/FK Stripe já testados em candidatos, não activar SQL/funções/jobs
- [x] Próxima fase segura, base a56ef2da: auditoria aprofundada, 16 Vitest/9 Deno/13 grupos PostgreSQL, estratégia por etapas e regressões Stripe/push; relatório em docs/security/fase-a, sem produção
- [ ] Fase A produção: bloqueada por trigger de quota/hard delete, escritores concorrentes, versões activas/backup/drenagem não comprovados; exige autorização específica SQL/deploy/pausa e futura activação destrutiva
- [ ] Notificações/Stripe concorrentes: corrida push e inserção Stripe reproduzidas com fixtures; preparar reservas/recuperação e política de histórico antes de qualquer activação real
- [x] Fase A: implementar candidatos de reservas semanais e quota atómica; 17 testes + 4 ensaios PostgreSQL fictício, tipos e build OK
- [ ] Fase A ativação: SQL aditivo e funções dependentes ainda não aplicados; limpeza pode eliminar dados automaticamente, vedado nesta fase; cutover de cron antigo sem garantia atómica comprovada
- [ ] Concluir ativação real autorizada em 17/11: vídeo final ainda exige transição compatível e conferência SQL; agendamentos antigos sem conversão automática suportada; não contornar revisão nem reenviar avisos antigos
- [x] Validar melhorias atuais: 71 testes financeiros/site e 19 de vídeo candidato; acrescentar teste do frontend ativo para comprovativo ausente
- [x] Integrar otimização de carregamento; build OK e navegação pública/autenticada com fixtures e rede externa bloqueada
- [x] Retries: candidato em docs/security/fase5 corrigido com identidade exata por job/destinatário e validado offline
- [x] Implantação de retries: executor e worker implantados em ordem; 15 testes offline aprovados, fontes anteriores preservadas
- [ ] Confirmar próximo envio real pós-implantação: fila atualmente sem jobs pendentes/em execução; nenhum evento novo observado, sem reenvios manuais
- [ ] Agendamentos antigos: resultado HTTP não verificável, não afirmar 401; conversão gerida/drenagem e cutover sem sobreposição não comprovados
- [ ] Vídeo G04/S03: 19 testes offline OK; bloqueado por transição de chaves 5→3 segmentos, versões ativas/reversão desconhecidas e SQL legado da versão conjunta
- [x] Financeiro: testes atuais aprovados; 17 fontes já coincidem com pacote conjunto, sem reintegração necessária
- [ ] Publicação financeira continua bloqueada pela revisão automática anterior
- [x] Site público: regras de armazenamento/exportação/anual/blog aprovadas em testes; proprietário decidiu manter «Ilimitados» por agora, sem alterar limites
- [ ] Push/reconciliação Stripe: leitura agregada confirma 46 notificações pendentes e 1 divergência aberta; não reenviar nem alterar pagamentos sem solução validada

## Release financeira isolada no Main — sem publicação
- [x] Conferir SHA servido, allowlist financeira e recuperação completa do vídeo antes de editar
- [x] Integrar financeiro v2 e restaurar somente frontend de vídeo à base publicada
- [x] Verificar diff frontend exclusivamente financeiro, reversão e testes offline; conferir build automático

## Candidatos G04/S03 — sem produção
- [x] Revisar transição em fonte isolada: chave histórica, Unicode, validade/reenvio seguro e associações históricas deriváveis
- [x] Validar 19 fluxos positivos offline e documentar reversões individuais e revisão registrada
- [x] Mapear upload/processamento/revisão/download e catálogo estrutural
- [x] Preparar validações compartilhadas, chamadores e SQL/reversão candidatos fora do journal
- [x] Validar 13 fluxos positivos simulados e SQL local fictício sem TCP; registrar hashes e implantação em docs/security/g04-s03

## S01 — testes da versão mínima, somente neste draft
- [x] Confirmar identidade da base isolada antes de qualquer alteração
- [x] Preparar dados fictícios e executar G1–G9 antes/depois, atomicidade e rollback seguro
- [x] Verificar registo e código promocional no navegador; corrigir apenas informação incorreta no draft
- [x] Entregar relatório com evidências, falhas e testes não executados; nunca aceitar este draft

## Candidatos S02/S09 — sem aplicação em produção
- [x] Mapear chamadores e catálogo de faturação, trial e promoções
- [x] Guardar definições e ACL anteriores, sem dados pessoais
- [x] Preparar SQL transacional fora das pastas de migrações aplicáveis e ajustes mínimos de chamadores
- [x] Validar análise estática e fluxos positivos com dados fictícios isolados; registrar arquivos e revisão

## Frontend S-DELIV — novembro 2026
- [x] Integrar patches compartilhados de transferência e coluna inicial não final, com falha sem destino
- [x] Confirmar gravação de competência antes de alterar o valor visual; corrigir label de reabertura
- [x] Executar testes isolados específicos; conferir compilação automática; sem SQL, publicação ou dados de produção

## Restauração do site público — novembro 2026
- [x] Restaurar a apresentação anterior em Landing, PublicHeader e marketing.css
- [x] Conferir imagens e navegação no computador e celular; animações anteriores restauradas; 54 testes aprovados; não publicar

## Reconciliação Morais — Setembro 2026
- [x] Registrar recebimento pessoal dos 17 hotéis sem marcar clientes integralmente pagos
- [x] Exibir no mesmo fecho lucro dos 22 cards, Morais pago e €312 pessoais pendentes
- [x] Verificar valores, exportação e leitura do fecho autenticado

## Site público e trial (outubro 2026)
- [ ] Trial de 7 dias só para novas contas; alinhar referências e remover promoção terminada
- [ ] Guarda fail-closed do blog automático, sem ativar cron ou publicar funções
- [ ] Remover prova social fictícia e duplicados dos logótipos
- [ ] Alinhar armazenamento Studio, exportação Starter e preço anual
- [ ] Metadados/JSON-LD e copy formal da Landing
- [ ] Testar e listar alterações por ficheiro; não publicar

- [x] Corrigir títulos e abas sobrepostos em telas pequenas (janela do projeto e cabeçalhos do app)

- [x] 1. Vista "Hoje"
- [x] 2. Zona de ação no Dashboard
- [x] 3. Glossário (Finalizados→Entregues, Relatório de Atividade→Atividade da equipa)
- [x] 4. Comprovativo no pagamento em lote
- [x] 5. Bloqueio de mês fechado
- [x] 6. Lembrete de fim de mês
- [~] 7. Componentes gigantes: Configurações dividida; Calendário e Criar Projeto adiados (risco alto, ganho invisível)
- [x] 8. Subscrições do chat: já filtradas por conversa/permissões; reações/leituras filtradas no cliente (sem coluna de conversa)

## Custo (card) vs Pagamento
- [x] cost_amount em project_team + trigger + guard
- [x] Formulário da equipa com Custo e Pagamento
- [x] Fecho/Movimentos: Receita | Edição | Captação | Lucro | Meu total
- [x] A pagar ignora pagamento 0

## Simplificação dos valores da equipe
- [x] Substituir os dois campos por Valor e Não pago por mim, preservando diferenças existentes
- [x] Testar regras e salvamento isolado; conferir a tela autenticada sem alterar dados históricos

- [x] Auditoria WillFlow 2.0 (só leitura): 10 relatórios + proposta + roadmap em PDF e MD (análise profunda automática ainda a terminar)
