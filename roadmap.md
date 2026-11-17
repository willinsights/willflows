# Roadmap — pendências da auditoria

## Retoma das pendências — novembro 2026
- [x] Integrar otimização de carregamento; build OK e navegação pública/autenticada com fixtures e rede externa bloqueada
- [ ] Retries: pacote precisa de identidade exata por job; deduplicação por executed_at pode confundir dois eventos legítimos posteriores
- [ ] Agendamentos 401: bloqueados pela ausência de conversão gerida dos jobs antigos
- [ ] Vídeo G04/S03: 19 testes offline OK; bloqueado por transição de chaves 5→3 segmentos, versões ativas/reversão desconhecidas e SQL legado da versão conjunta
- [x] Financeiro: testes atuais aprovados; 17 fontes já coincidem com pacote conjunto, sem reintegração necessária
- [ ] Publicação financeira continua bloqueada pela revisão automática anterior
- [ ] Site público: regras de armazenamento/exportação/anual/blog aprovadas em testes; texto «Ilimitados» aguarda escolha do proprietário
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
