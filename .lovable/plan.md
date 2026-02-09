

## Corrigir player para videos verticais no portal do cliente

### Problema
Videos verticais (9:16, como Reels) aparecem com zoom/cortados no portal Studio Review. O video ocupa 100% da largura do container, forcando o conteudo vertical a ser cortado em vez de se adaptar mostrando barras laterais (pillarbox).

### Solucao
Alterar o CSS do elemento `<video>` e do container para que videos verticais se adaptem correctamente, usando `max-w-full` e `max-h-[70vh]` com `object-fit: contain` dentro de um container flex centrado.

### Alteracoes em `src/pages/public/VideoApproval.tsx`

**1. Container do player (linha ~827)**
- Remover `style={{ minHeight: '300px', maxHeight: '70vh' }}`
- Usar classes Tailwind: `min-h-[300px] max-h-[70vh] items-center`

**2. Elemento video (linhas ~833-839)**
- Remover `className="w-full h-full"` e o style inline
- Usar `className="max-w-full max-h-[70vh] object-contain"` para que o video se ajuste sem cortar

### Resultado
- Videos verticais (9:16): mostram completos com barras laterais pretas (pillarbox)
- Videos horizontais (16:9): continuam a ocupar a largura disponivel normalmente
- O player adapta-se ao aspect ratio real do video

