# Auditoria completa do WillFlow (só leitura) e proposta de melhorias

Nada é alterado durante a auditoria: sem migrações, sem mudanças em acessos, sem pagamentos, sem publicar. O resultado é um relatório; qualquer correção só avança depois de aprovar um segundo plano.

## Entrega
Um relatório em PT-PT, guardado como documento para descarregar (`Auditoria_WillFlow_2026-11.md` e versão PDF), com:
- Resumo executivo (máx. 10 linhas).
- Tabela: área, achado, gravidade, esforço, recomendação.
- Duas listas: "seguro aplicar já" vs "exige aprovação" (pagamentos, faturação, segurança, SQL em produção).
- Sem emails, segredos, tokens, dados de clientes nem valores financeiros reais.

## 1. O que mudou nos últimos 7 dias
- Histórico de commits (git log) desde 17/11, agrupado por: migrações SQL, Edge Functions, interface, cron, armazenamento.
- Para cada item: o quê, porquê (mensagem/PR/AGENTS.md) e estado: em produção, só no código, ou por confirmar.
- Comparar ficheiros de migração com o histórico aplicado na base; listar funções cujo deploy não foi confirmado.
- Pendentes conhecidos a confirmar: função `pay_team_batch` (PR #62) não instalada; resposta 401 do cron às 14:00 de 23/11 (identificar a tarefa de origem); candidatos C3 ainda não aplicados.

## 2. Segurança (análise, sem ataques)
- RLS de todas as tabelas: tabelas sem políticas, UPDATE sem WITH CHECK, políticas demasiado abertas.
- Funções SECURITY DEFINER: verificação de `auth.uid()`/pertença ao espaço e `search_path`.
- Segredos: procura no código do cliente e nos comandos de cron.
- Links públicos (aprovação de vídeo, contratos, pastas): expiração, revogação e limites de tentativas.
- Edge Functions: validação de entradas, assinatura do Stripe no webhook, CORS, cabeçalhos, limites de taxa.
- Dependências: scan atual (os 3 avisos moderados já conhecidos sem correção disponível).
- Reaproveitar resultados do scanner e do linter, e indicar o que fica por cobrir.

## 3. Desempenho
- Tamanho do bundle por página (build de análise em pasta temporária), dependências não usadas, imagens/vídeos sem otimização.
- Consultas lentas (estatísticas da base) e planos de execução de `v_project_profit` e `get_dashboard_metrics`; padrões N+1 nos hooks do dashboard; índices em falta.
- Métricas reais de visitantes (LCP/INP/CLS por página).
- Cada proposta com ganho estimado e risco.

## 4. Experiência do utilizador
- Fluxo de aprovação do cliente: estados, mensagens, sessão expirada a retomar no mesmo passo (teste no navegador com dados fictícios).
- Acessibilidade: contraste, foco de teclado, rótulos, botões só com ícone.
- Estados vazios, erros e carregamentos.
- Prioridade por impacto x esforço.

## 5. Design menos "gerado por IA"
- Capturas das páginas principais (painel, kanban, Review Studio, aprovação pública, landing).
- Identificar padrões genéricos: cartões iguais, sombras pesadas, gradientes padrão, textos de exemplo, escala tipográfica inconsistente.
- 2 a 3 direções visuais com paleta, tipografia e trechos de código/maquetes, sem aplicar. Respeitar a preferência já registada pela apresentação pública rica em imagens.

## Pontos a notar
- Diferença já detetada: a página de planos mostra "Ilimitados" apesar de limites internos; decidiu mantê-los, por isso só aparece como nota, não como correção.
- Algumas leituras (histórico interno do cron) estão bloqueadas pelas ferramentas; o relatório dirá o que não foi possível verificar.

## Detalhes técnicos
- Fontes: git log/diff, `supabase/migrations`, histórico de migrações, `pg_policies`, `pg_proc` (prosecdef, proconfig), `net._http_response`, lista de cron, logs das Edge Functions, `security--get_scan_results`, linter, dependency scan, slow queries + EXPLAIN, analytics web_vitals, Playwright com sessão de teste.
- Builds de análise só em /tmp; nenhum ficheiro do projeto é alterado além do relatório em /mnt/documents.
