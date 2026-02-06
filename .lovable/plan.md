

## Substituir banners e redesenhar hero principal

### 1. Substituir as 9 imagens

Copiar as novas imagens (sufixo `-2`) para `public/screenshots/`, substituindo os banners anteriores com os mesmos nomes de ficheiro:

| Imagem nova | Destino |
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

Os FeatureHero das paginas de funcionalidades ja apontam para estes nomes, por isso atualizam automaticamente.

### 2. Redesenhar o Hero da Landing Page

Substituir o layout atual (imagem centralizada absoluta por baixo do texto) por um layout split ergonomico:

- **Esquerda**: Badge, h1, subtitulo, pills, CTAs — alinhados a esquerda
- **Direita**: Banner 001 (dashboard overview) flutuante, sem caixa, sem borda, sem glow — apenas `rounded-2xl shadow-2xl`
- Layout: `grid lg:grid-cols-[1fr_1.2fr]` com `items-center`
- Remover os imports dos dark screenshots antigos (screenshotDashboard, screenshotKanban, etc.) e o bloco `heroScreenshots`
- Manter o mobile carousel mas atualizar para usar a imagem do banner

### 3. Remover glow/border dos componentes de imagem

**`FeatureHero.tsx`** (linhas 83-93):
- Remover o `div` com gradiente blur (`absolute -inset-8 bg-gradient-to-r...`)
- Remover `border border-border/50` do `<img>`
- Manter apenas `rounded-2xl shadow-2xl`

**`FeatureSection.tsx`** (linhas 85-95):
- Remover o `div` com gradiente blur (`absolute -inset-4 bg-gradient-to-r...`)
- Remover `border border-border/50` do `<img>`
- Manter apenas `rounded-2xl shadow-xl`

### 4. Reutilizar banners nas FeatureSections internas

Substituir os screenshots genericos antigos pelos novos banners contextuais:

| Pagina | FeatureSection | Atual | Novo |
|---|---|---|---|
| **Kanban** | Colunas Customizaveis | screenshot-kanban-full.png | banner-kanban.png |
| **Kanban** | Drag & Drop | screenshot-dashboard-light-full.png | banner-kanban.png |
| **Chat** | Canais por Projeto | screenshot-kanban-full.png | banner-chat.png |
| **Chat** | Criar Tarefas | screenshot-projeto-modal.png | banner-chat.png |
| **Calendario** | Vistas Flexiveis | screenshot-calendario-full.png | banner-calendario.png |
| **Calendario** | Sync Google | screenshot-dashboard-light-full.png | banner-calendario.png |
| **CRM** | Ficha de Cliente | screenshot-dashboard-light-full.png | banner-crm.png |
| **CRM** | Historico Projetos | screenshot-projeto-modal.png | banner-crm.png |
| **CRM** | Metricas | screenshot-relatorios-6m.png | banner-relatorios.png |
| **CRM** | Notas e Comunicacoes | screenshot-calendario-full.png | banner-crm.png |
| **Pagamentos** | A Receber | screenshot-pagamentos.png | banner-pagamentos.png |
| **Pagamentos** | A Pagar | screenshot-pagamentos-estudio.png | banner-pagamentos.png |
| **Pagamentos** | Export Excel/PDF | screenshot-relatorios-6m.png | banner-relatorios.png |
| **Relatorios** | Top Clientes | screenshot-relatorios-6m.png | banner-relatorios.png |
| **Relatorios** | Tendencias Mensais | screenshot-dashboard-light-full.png | banner-relatorios.png |

### 5. Adicionar banner nas paginas de comparacao

As paginas VsTrello, VsAsana e VsClickUp atualmente nao tem imagens de produto. Adicionar o banner do dashboard (001) no hero de cada uma, transformando o layout de centrado para split (texto esquerda + imagem direita), sem caixas — imagem flutuante com `rounded-2xl shadow-2xl`.

### Ficheiros a alterar

1. 9 imagens — copiar para `public/screenshots/`
2. `src/pages/Landing.tsx` — refazer hero split
3. `src/components/marketing/FeatureHero.tsx` — remover glow e border
4. `src/components/marketing/FeatureSection.tsx` — remover glow e border
5. `src/pages/features/Kanban.tsx` — atualizar screenshots
6. `src/pages/features/Chat.tsx` — atualizar screenshots
7. `src/pages/features/Calendario.tsx` — atualizar screenshots
8. `src/pages/features/CRM.tsx` — atualizar screenshots
9. `src/pages/features/Pagamentos.tsx` — atualizar screenshots
10. `src/pages/features/Relatorios.tsx` — atualizar screenshots
11. `src/pages/comparisons/VsTrello.tsx` — adicionar banner no hero
12. `src/pages/comparisons/VsAsana.tsx` — adicionar banner no hero
13. `src/pages/comparisons/VsClickUp.tsx` — adicionar banner no hero
