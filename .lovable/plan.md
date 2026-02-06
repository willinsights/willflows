

## Substituir banners e redesenhar hero principal

### 1. Substituir as 9 imagens anteriores

Copiar as novas imagens (sufixo `-2`) para `public/screenshots/`, substituindo os banners anteriores:

| Imagem nova | Destino (substitui) |
|---|---|
| banner_novo_001-2.png | `public/screenshots/banner-dashboard-overview.png` |
| banner_novo_002-2.png | `public/screenshots/banner-chat.png` |
| banner_novo_003-2.png | `public/screenshots/banner-calendario.png` |
| banner_novo_004-2.png | `public/screenshots/banner-crm.png` |
| banner_novo_005-2.png | `public/screenshots/banner-kanban.png` |
| banner_novo_006-2.png | `public/screenshots/banner-video-approval.png` |
| banner_novo_007-2.png | `public/screenshots/banner-studio-review.png` |
| banner_novo_008-2.png | `public/screenshots/banner-pagamentos.png` |
| banner_novo_009-2.png | `public/screenshots/banner-relatorios.png` |

Como os nomes dos ficheiros permanecem iguais, todas as paginas de funcionalidades (Chat, Calendario, CRM, Kanban, VideoApproval, Pagamentos, Relatorios) atualizam automaticamente sem alterar codigo.

### 2. Redesenhar o Hero da Landing Page

Substituir o layout atual (imagem centralizada por baixo do texto) por um layout split:

- **Esquerda**: Textos (badge, h1, subtitulo, pills, CTAs) alinhados a esquerda
- **Direita**: Banner 001 (dashboard overview) sem caixa, sem borda, sem glow box — apenas a imagem com sombra suave, ligeiramente maior que o bloco de texto para dar impacto visual

Layout: `grid lg:grid-cols-[1fr_1.2fr]` com texto a esquerda e imagem a direita, sem `glass-card`, sem `border`, sem caixas visuais. A imagem flutua limpa.

### 3. Reutilizar banners nas FeatureSections internas

Atualmente as FeatureSections dentro de cada pagina de funcionalidade usam screenshots genericos antigos (ex: `screenshot-kanban-full.png`, `screenshot-dashboard-light-full.png`). Substituir pelos novos banners contextuais, sem adicionar caixas — os componentes `FeatureSection` ja mostram a imagem sem moldura extra:

| Pagina | FeatureSection | Novo screenshot |
|---|---|---|
| Kanban | "Colunas Customizaveis" | `banner-kanban.png` (005) |
| Kanban | "Drag & Drop" | `banner-kanban.png` (005) |
| Chat | "Canais por Projeto" | `banner-chat.png` (002) |
| Chat | "Criar Tarefas" | `banner-chat.png` (002) |
| Calendario | "Vistas Flexiveis" | `banner-calendario.png` (003) |
| Calendario | "Sync Google" | `banner-calendario.png` (003) |
| CRM | secoes internas | `banner-crm.png` (004) |
| Pagamentos | "A Receber" | `banner-pagamentos.png` (008) |
| Pagamentos | "A Pagar" | `banner-pagamentos.png` (008) |
| Pagamentos | "Export Excel/PDF" | `banner-relatorios.png` (009) |
| Relatorios | "Top Clientes" | `banner-relatorios.png` (009) |
| Relatorios | "Tendencias Mensais" | `banner-relatorios.png` (009) |

### 4. Adicionar banner contextual nas paginas de comparacao

As paginas de comparacao (VsTrello, VsAsana, VsClickUp) atualmente nao tem imagens de produto. Adicionar o banner do dashboard (001) na secao hero de cada uma, ao lado do titulo, usando o mesmo layout limpo sem caixa — imagem flutuante com sombra suave.

### 5. Remover glow/border visual dos componentes

Modificar `FeatureHero.tsx` e `FeatureSection.tsx` para remover:
- `border border-border/50` da tag `<img>`
- O `div` com gradiente blur que cria o efeito "caixa brilhante" em volta da imagem
- Manter apenas `rounded-2xl shadow-xl` para um visual limpo

### Ficheiros a alterar

1. **9 imagens** — copiar para `public/screenshots/` (mesmo nome, conteudo novo)
2. **`src/pages/Landing.tsx`** — refazer hero: layout split texto-esquerda + imagem-direita sem caixa
3. **`src/components/marketing/FeatureHero.tsx`** — remover glow box e border da imagem
4. **`src/components/marketing/FeatureSection.tsx`** — remover glow box e border da imagem
5. **`src/pages/features/Kanban.tsx`** — atualizar screenshots das FeatureSections
6. **`src/pages/features/Chat.tsx`** — atualizar screenshots das FeatureSections
7. **`src/pages/features/Calendario.tsx`** — atualizar screenshots das FeatureSections
8. **`src/pages/features/CRM.tsx`** — atualizar screenshots das FeatureSections
9. **`src/pages/features/Pagamentos.tsx`** — atualizar screenshots das FeatureSections
10. **`src/pages/features/Relatorios.tsx`** — atualizar screenshots das FeatureSections
11. **`src/pages/comparisons/VsTrello.tsx`** — adicionar banner no hero
12. **`src/pages/comparisons/VsAsana.tsx`** — adicionar banner no hero
13. **`src/pages/comparisons/VsClickUp.tsx`** — adicionar banner no hero

