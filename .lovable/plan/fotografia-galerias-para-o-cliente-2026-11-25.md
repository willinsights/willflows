# Fotografia: galerias para o cliente

Um novo separador **Fotografia** nos cartões de projetos de fotografia (ou foto e vídeo), e um link externo com a marca do estúdio, como já acontece na aprovação de vídeos.

## O que vai existir

1. **Galerias para o cliente**
   - O estúdio envia fotos (várias de uma vez) para uma galeria do projeto.
   - Gera um link privado para o cliente, com prazo de validade opcional e o logo/nome do estúdio (nunca a marca WillFlow).
   - O cliente vê a grelha de fotos e abre cada uma em ecrã inteiro.

2. **Seleção de favoritas com limite**
   - O estúdio define quantas fotos estão incluídas (ex.: 30).
   - O cliente marca favoritas; o contador mostra "12 de 30". Ao chegar ao limite, pode continuar a marcar, mas as extras passam a "fotos extra".
   - O cliente envia a seleção final; o estúdio é avisado e a seleção fica bloqueada.

3. **Comentários num ponto da foto**
   - O cliente toca num ponto da foto e deixa um pedido ("tirar este reflexo").
   - O estúdio vê os marcadores, responde e marca como resolvido.

4. **Entrega em alta resolução com marca de água opcional**
   - A galeria de prova mostra versões leves; com a opção ligada, aparecem com a marca de água do estúdio.
   - Na entrega, o estúdio envia as versões finais e o cliente descarrega as fotos (uma a uma ou todas).

5. **Compra de fotos extras**
   - O estúdio define o preço por foto extra.
   - O cliente vê o total antes de enviar ("5 extras × 15 € = 75 €").
   - O valor entra como receita extra do projeto, seguindo a regra financeira atual (só conta após a entrega).
   - Pressuposto desta primeira versão: **sem pagamento online pelo cliente**. O estúdio marca como pago, como já faz com os recebimentos. O pagamento online pode vir numa fase seguinte.

6. **Lista de fotos obrigatórias por sessão**
   - Lista própria ("noivos com os pais", "fachada do hotel"), com modelos reutilizáveis.
   - No dia da sessão, a equipa marca cada foto como feita no telemóvel; o cartão mostra o que falta.

## Ordem de construção
1. Galerias + upload + link do cliente (base de tudo)
2. Favoritas com limite + fotos extras
3. Comentários no ponto
4. Marca de água + entrega em alta resolução
5. Lista de fotos obrigatórias
Cada fase fica utilizável antes da seguinte. Testamos primeiro no In-Sights.

## Detalhes técnicos
- Armazenamento: fotos no mesmo armazenamento de ficheiros dos vídeos (R2), com links assinados de curta duração; nada público. O espaço conta na quota do workspace.
- Novas tabelas com RLS por workspace e GRANTs: `photo_galleries`, `gallery_photos`, `gallery_access_tokens` (hash do token, como nos convites), `photo_selections`, `photo_comments` (coordenadas x/y em %), `shot_lists`, `shot_list_items`, `shot_list_templates`.
- Acesso do cliente só por funções de servidor que validam o token (sem leitura pública direta das tabelas); limite de pedidos públicos reaproveitado.
- Pré-visualizações e marca de água geradas no navegador do estúdio no upload (versão leve + original), evitando custo de processamento no servidor.
- Funcionalidade limitada aos planos com Review Studio, verificada no servidor.
- Receita de extras via linha de recebimento existente do projeto, sem duplicar receita.
- Testes: limite de favoritas, cálculo do total de extras, expiração do link, contagem na quota.
