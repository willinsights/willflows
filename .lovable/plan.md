# Link do cliente: vídeo maior, comentários por baixo

## O que muda
- O vídeo passa a ocupar toda a largura da página (até ~1400px), sem a coluna de comentários ao lado.
- Os comentários vão para baixo do vídeo: à esquerda a caixa de escrever (nome, texto, «Comentar em 0:12»), à direita a lista de comentários com tempo clicável. No telemóvel ficam um por baixo do outro.
- No modo comparação, os dois vídeos usam toda a largura do ecrã (cada um com metade), com os controlos por baixo; os comentários continuam abaixo.
- Barra de cima (nome do estúdio, versão, Comparar, Aprovar) fica igual, sem marca WillFlow.
- Aplica-se aos dois tipos de link (o novo e o antigo «Studio Review» da imagem), para ficarem iguais.

## Detalhes técnicos
- `PrivateVideoApproval.tsx`: trocar a grelha `md:grid-cols-[2fr_1fr]` por coluna única `max-w-[1400px]`; secção de comentários em `md:grid-cols-2` abaixo do player.
- `src/pages/public/VideoApproval.tsx` (link antigo): mesma reorganização; painel de comparação a largura total.
- Sem alterações no servidor nem nos dados.
