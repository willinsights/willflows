# Roadmap — pendências da auditoria

## Relatórios e marca na aprovação externa (25/11)
- [x] Remover a marca WillFlow durante o carregamento externo; logo/nome In-Sights confirmado no link real.
- [x] Atividade usa projetos entregues, custos atuais e competência; tema atual e atualização automática a cada 30 segundos sem desmontar a página.
- [x] Indicadores com 142 px iguais no computador; gráfico top 3, lista inteira com rolagem até o último cliente.
- [x] Custos consolidados de €25.461 conferidos com o gráfico; fases usam intervalos completos de movimentos registrados quando não há histórico fechado, sem inventar tempos abertos.
- [x] Sessão válida In-Sights, novembro com 84 entregues/€12.386 em ambas as páginas, celular sem transbordo, link real sem marca WillFlow, 611 testes aprovados; publicação separada.

## Erros do chat (25/11)
- [x] Corrigir abertura de conversas: presença compartilhada entre feed e painel; troca de canais e recarregamento verificados na sessão válida do In-Sights.
- [x] Verificar marcação da equipe com @: seleção, envio e registro da menção confirmados; mensagem temporária para o próprio usuário removida.

## Abas do cartão e logotipo (25/11)
- [x] Ordenar as abas: Detalhes, Links, Timeline, Tempo, Checklist, Financeiro e Review Studio; sequência confirmada num cartão real do In-Sights.
- [x] Corrigir o envio do logotipo permitindo a leitura dos ficheiros da própria conta necessária à substituição; envio no campo real confirmado, ficheiro temporário removido e logotipo guardado inalterado.

## Entrada de pagamento do cliente
- [x] Criar formulário partilhado no cartão e em Movimentos, sem duplicar receita; recebimento integral de projetos entregues, com data escolhida.
- [x] 15 testes aprovados; sessão administradora, recebimento via Movimentos no computador e via cartão no telemóvel, leitura cruzada após recarregar; fixtures removidas, pagamentos reais intocados, compilação OK. Publicação separada.

## SEO — plan comparison
- [x] Clarify Starter, Pro and Studio on /planos/comparar and its title/description without changing plan facts; 54 plan regression tests passed, desktop/mobile currency→annual→signup verified without runtime errors, metadata duplicates removed and build OK. Publication remains separate.

## PR #2 — activação coordenada autorizada em 19/11/2026
- [x] 20/11 14:08: Review Studio autenticado integrado e publicado 9afe0cf7; percurso real no domínio sem interceptação passou upload→playback→comentário→link/aprovação→reload. Versão HTML 9afe0cf76b6e8d14bafb62f2a9361da93ead74d4, bundle index-BYnmyAa8.js, marcador canonical-client-20261120-1. Ativados 6 Studio elegíveis (inclui fixture); zero divergências/projeções privadas e históricos intactos. Limitações privadas: corrigido no mesmo ID/comparação/thumbnail ainda não integrados; usar nova versão, sem release integral. Resultado CLIENT-RELEASE-2026-11-20.md.
- [x] 20/11 retoma 65c4109e: inventário 54/54 estável; reconciliação 0012 aplicada sob locks/fingerprint, zero divergências; registry 0013/guard 0014 e private-video implantados; router integrado, HLS/comentários/aprovação reais desktop/mobile e legado fictício verificados. Piloto habilitado somente no workspace sintético; uploads normais abertos. Publicação e revisão registadas em PRODUCTION-SIDECAR-2026-11-20.md.
- [x] 20/11 13:37 alternativa ponto 3 implementada em candidato new-only: schema privado/claims/tokens/feedback, montagem de accounting+guards, runtime+UI nova; 16 Vitest/PG integrado/Deno OK e piloto browser desktop/mobile com RPCs reais descartáveis. Cleanup antigo real em três ramos não alcança assets/tokens privados; sem projeção nova no legado. Produção somente leitura, uploads normais abertos; sem republicação a56f1383. Resultado em SIDECAR-RESULT-2026-11-20.md.
- [x] Piloto canónico produtivo: divergência corrigida por inventário individual protegido; R2 PUT, frozen-copy, Stream signed-only, idempotência, playback e feedback verificados com fixture real. Expandido em 20/11 após integração normal/publicação verificada: 6 Studio elegíveis habilitados, sem projeção no legado, alteração de limites ou exclusões.
- [x] Janela autorizada 20/11 13:31: pausa privada real de 10 min aberta como postgres até 13:42:33, retomada explicitamente antes de 13:35:06; sem congelar BD/alterar crons. Ajuste móvel independente integrado/publicado a56f1383; domínio HTTP 200/SHA confirmado 13:35:54; 25 testes/build e navegador público mobile/desktop com fixture isolada, playback/comentário/aprovação readback sem erros. Tolerância a uploads transitórios aplicada; não autoriza DELETE externo de versão consolidada nem desativação de link. Migração/quota integral não aplicada; serviço aberto, relatório PUBLICATION-WINDOW-2026-11-20.md.
- [x] 20/11 coexistência: cinco OPTIONS 200/version 1/fontes coincidentes às 13:26; histórico até 0011 consistente; frontend servido c3504bc0 sem diff src posterior. Candidato em coexistence: RMW neutralizado, identidade durável, gerações protegidas por RPC, montagem completa hash/rollback e reservas; 13 grupos PG + 2 Vitest + 25 regressões/build OK. Cleanup real antigo com fornecedores fictícios elimina ambos os objetos ANTES de update rejeitado e desativa token: in-place integral NO-GO. Alternativa faseada em coexistence/RESULT.md; sem pausa/deploy/SQL produtivo.
- [ ] Coexistência integral: separar projeção antiga da identidade canónica privada/lifecycle/autorização dos novos objetos, ou comprovar fencing do DELETE no fornecedor incluindo operações já aceites. Prefixo/labels/SQL não bastam quando cleanup lê a referência nova. O contador requer snapshot individual atual sob lock no momento da aplicação. Não depende de metadados de gateway indisponíveis.
- [x] 20/11 13:09 autorização expressa: migração real 0010 de observação aplicada pelo executor gerido, identidade postgres/ownership verificados na transação e catálogo; cinco bridges implantados, OPTIONS 200/version 1/hash candidato coincidente e POST anónimo 401 nos cinco, às 13:12 UTC; admissão aberta e nenhuma pausa. Evidência em operational/production-2026-11-20/RESULT.md.
- [x] 20/11 runtime candidato ligado aos controlos privados de emissão/processamento/aborto/recuperação; grants 7200s+60s, retoma segura e ativação atómica preparada; 37 Vitest/12 PG/4 Deno/1 Python. Percurso real candidato durante pausa verificado; montagem corrigida para table NOWAIT antes de advisory lock. Catálogo confirma precedente owner postgres; identidade do executor futuro/gateway drain não documentados. Sequência em operational/RUNTIME-READINESS-2026-11-20.md, sem pausa/produção.
- [x] Pausa funcional job6 preparada: SQL privado, 5 bridges actuais (inclui status/settings), leases permanentes/incerteza, grants 3600s+skew, fence de escritores e timeout reversível pré-cutover; 4 Deno, 10 PG (inclui concorrência), entrypoint cleanup pausado sem efeitos e 5 checks aprovados.
- [ ] Janela/cutover: executor owner e observação confirmados; suporte declarou indisponíveis timestamp global, término por revisão e limite documentado. Substituir esse gate por convivência segura comprovada ou isolamento/fencing verificável externo; não usar logs silenciosos como prova.
- [x] Verificação complementar: corrigir cabeçalho móvel apenas na página candidata; ambos os vídeos, comentário e aprovação verificados a 390/1280 px nos temas claro/escuro, sem transbordo; sem publicação.
- [x] 20/11: navegador anónimo com página real e handlers candidatos locais, HLS real dos dois clipes privados; frames, mesmo link, comentário e aprovação persistidos em SQLite fictício; inventário individual 54 HEAD R2 coincidentes e 54 referências Stream existentes.
- [ ] 20/11: barreira de emissão candidata preparada; aplicar/pausar job6 só após prova operacional de drenagem e reversão. Ferramentas geridas não disponibilizam pausa do job legado; logs cleanup ausentes. Contador não alterado antes da janela estável.
- [x] Implementar reprodução privada candidata: ingestão/settings signed-only, signer autorizado e página/hook/approval; 72 testes, tipos/build e GET real playlists/segmentos 200 dos dois UIDs sintéticos, 1064 bytes cada; sem deploy/quota. Provas PRIVATE-PLAYBACK-2026-11-19.md.
- [x] Rever baseline individual actual, dependências e compatibilidade pós-PR11; 47 hashes intactos, 64 testes, 22 grupos PG, 5 Deno checks e overlay/browser aprovados; relatório ACTIVATION-2026-11-19.md.
- [ ] Aplicar apenas SQL montado pelo assembler: bloqueado por reconciliação individual não comprovada, ausência de barreira/janela e drenagem HTTP/job6; não alterar job12, faturação ou limpeza.
- [ ] Implantar handlers/frontend coordenados e ensaiar substituição fictícia integral: playback privado agora integrado e testado como candidato; continuam bloqueios de cleanup escritor/deleter activo, quota/drenagem e reversão das versões activas não exportada; conservar PR11 e indicador de refresh posterior.
- [x] Restauro real PG17.12 confirmado pelo proprietário: 138 TABLE DATA e 735 índices/restrições/FKs; não repetir, sem restauro sobre produção.

## PR #2 — canário real autorizado, sem vídeos/quota de clientes
- [x] Criar despacho privado único e função pr2-video-canary, testar ACL/replay e implantar apenas o canário.
- [x] Executar duas fixtures R2/Stream privadas: 18 verificações PASS; autorização consumida permanentemente e função removida (HTTP 404). Provas no registo privado, resumo em docs/security/pr2-canary/RESULT.md.

## Retoma das pendências — novembro 2026
- [x] 20/11 16:30 emails de teste: destinatário passa a ser apenas o email verificado do próprio remetente (campanhas e automações); 5 testes, dois handlers implantados, recusa ao vivo de endereço externo confirmada e os dois avisos encerrados.
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

## Links antigos no Review Studio atual (25/11)
- [x] Abrir tokens antigos na interface atual sem copiar vídeos nem invalidar links.
- [x] Adaptar versões, aprovações, respostas, exportação e gestão de comentários; 592 testes, compilação e links reais anónimos/aprovados/comparação/mobile validados sem alterar conteúdo real.

## Review Studio único (25/11)
- [x] Uma só área no cartão (estúdio completo); vídeos do circuito novo só aparecem se existirem
- [x] Link do cliente com nome/logo do espaço, sem marca WillFlow
- [x] Após aprovação: vídeo visível 7 dias, faixa verde, download, sem novos comentários; depois «Link expirado»
- [x] Selo verde «Aprovada» na lista de versões
- [ ] Vários vídeos (entregáveis) por cartão — precisa de nova estrutura de dados
- [ ] Bloquear comentários no servidor após aprovação

- [x] Review Studio: um só estúdio (circuito novo), vários vídeos por cartão, comentários com tempo, bloqueio após aprovação, link com marca do estúdio

- [x] Fotos das galerias no Cloudflare (pasta própria), contam no espaço, só plano Studio, notificações e alerta no painel

## Gestão de espaço das galerias (25/11)
- [x] Adicionar exclusão manual confirmada e opções por data ou confirmação de recebimento.
- [x] Impedir envios durante exclusão; remover objetos do Cloudflare e legado antes de liberar quota.
- [x] Limpeza horária implantada (24 execuções/dia); opções salvas e relidas no estúdio, download real e confirmação anônima/mobile verificados, quota restaurada na remoção individual; 12 testes e compilação OK. Galerias fictícias aguardam o período de segurança antes da limpeza física automática, ainda não observada.
