# Review Studio único — plano

## Porque existe hoje a aba «Vídeos novos»
Foi criada durante as correções de segurança dos vídeos: um circuito novo e mais protegido (links assinados e curtos, ficheiros isolados por espaço, sem apagar vídeos por engano). Ficou separado do Review Studio antigo para não partir os links de aprovação já enviados. Ficou só com o mínimo (enviar e ver); comentários com timecode, miniaturas, versões e aprovação ficaram apenas em «Vídeos já guardados». Resultado: duas áreas, nenhuma completa. Tem razão — deve existir só uma.

## O que vai ficar
Um único Review Studio por cartão, sem abas:

1. **Vários vídeos por cartão** — lista de «entregáveis» (ex.: Vídeo principal, Reel 9:16, Teaser), cada um com nome, miniatura e estado.
2. **Versões por vídeo (V1, V2, V3…)** — enviar nova versão com nota «o que mudou»; a versão anterior fica guardada e marcada como substituída.
3. **Comparar V1 / V2** — lado a lado ou com alternância, sincronizados no mesmo tempo; comentários de cada versão visíveis.
4. **Comentários com timecode** — clicar no vídeo para comentar no segundo exato, marcadores na barra de tempo, resolver/reabrir, miniaturas na lista.
5. **Aprovação** — botão aprovar por versão; versão aprovada com **indicação verde** no estúdio, no cartão do kanban e no link do cliente.
6. **Link do cliente com a marca do estúdio** — logo e nome do espaço de trabalho (já configurados nas definições do espaço); sem «WillFlow» no título, rodapé, emails ou nome do separador. Se não houver logo, aparece só o nome do estúdio.
7. **Depois de aprovado** — o link continua a funcionar 7 dias (só para ver/descarregar, sem novos comentários), com contagem «disponível até …». Depois disso, mostra uma página simples «link expirado» com a marca do estúdio.
8. **Vídeos antigos** — continuam a aparecer na mesma lista (marcados como versões anteriores), e os links já enviados aos clientes continuam a funcionar.

## Ordem de execução
1. Juntar as duas áreas num só ecrã (todos os vídeos, antigos e novos, numa lista).
2. Trazer comentários, miniaturas, versões e aprovação para o circuito protegido.
3. Vários vídeos por cartão + comparação V1/V2.
4. Marca do estúdio no link do cliente e nos emails de aprovação.
5. Regra dos 7 dias após aprovação + selo verde.
6. Testar com a sua conta no In-Sights: enviar 2 vídeos, V1→V2, comentar, comparar, aprovar, abrir o link como cliente.

## Detalhes técnicos
- Base: circuito privado (`CanonicalVideoStudio`, função `private-video`, registo privado); a UI completa de `VideoProductionTabContent` (player HLS, `TimestampComments`, `VideoVersionsList`, `RevisionHistory`, `ApprovalButton`) passa a ler desse circuito através de um adaptador comum; aba e `TabsList` em `VideoProductionTab` removidas.
- Leitura combinada: versões legacy (`video_versions`) listadas como só leitura no mesmo ecrã; links `wf2_` e antigos mantêm o encaminhamento atual (sem fallback entre eles).
- Novo agrupamento «entregável» (nome, ordem) por projeto/tarefa; versões ligadas a ele; migração aditiva com GRANT + RLS por pertença ao espaço.
- Comparação: dois `useHlsPlayer` com sincronização de tempo/play.
- Branding: página pública de aprovação e templates de email de aprovação usam `workspaces.name`/logo; remover textos e meta tags WillFlow só nessas páginas (o site público continua igual).
- Retenção: reutiliza `retention_settings` (7 dias, já ativo) — o link aprovado lê `approved_at + retention_days`; após aprovação, comentários bloqueados no servidor.
- Testes: regra dos 7 dias, bloqueio de comentários após aprovação, uma só versão aprovada por entregável.
- Edge Functions afetadas publicadas após aprovação; app precisa de publicação.
