

## Adicionar banners novos nas paginas de marketing

Colocar cada imagem na pagina de funcionalidade correspondente, substituindo os screenshots genericos atuais pelos banners novos e especificos.

### Mapeamento imagem - pagina

| Imagem | Pagina | Onde |
|--------|--------|------|
| banner_novo_001.png | Landing (`src/pages/Landing.tsx`) | Hero section - imagem principal (substituir os FloatingScreenshots) |
| banner_novo_002.png | Chat (`src/pages/features/Chat.tsx`) | FeatureHero screenshot |
| banner_novo_003.png | Calendario (`src/pages/features/Calendario.tsx`) | FeatureHero screenshot |
| banner_novo_004.png | CRM (`src/pages/features/CRM.tsx`) | FeatureHero screenshot |
| banner_novo_005.png | Kanban (`src/pages/features/Kanban.tsx`) | FeatureHero screenshot |
| banner_novo_006.png | Video Approval (`src/pages/features/VideoApproval.tsx`) | FeatureHero screenshot (versao clara) |
| banner_novo_007.png | Video Approval (`src/pages/features/VideoApproval.tsx`) | FeatureSection "Comentarios por Timecode" screenshot (versao escura) |
| banner_novo_008.png | Pagamentos (`src/pages/features/Pagamentos.tsx`) | FeatureHero screenshot |
| banner_novo_009.png | Relatorios (`src/pages/features/Relatorios.tsx`) | FeatureHero screenshot |

### Passos de implementacao

1. **Copiar as 9 imagens** para `public/screenshots/` com nomes descritivos:
   - `banner_novo_001.png` -> `public/screenshots/banner-dashboard-overview.png`
   - `banner_novo_002.png` -> `public/screenshots/banner-chat.png`
   - `banner_novo_003.png` -> `public/screenshots/banner-calendario.png`
   - `banner_novo_004.png` -> `public/screenshots/banner-crm.png`
   - `banner_novo_005.png` -> `public/screenshots/banner-kanban.png`
   - `banner_novo_006.png` -> `public/screenshots/banner-video-approval.png`
   - `banner_novo_007.png` -> `public/screenshots/banner-studio-review.png`
   - `banner_novo_008.png` -> `public/screenshots/banner-pagamentos.png`
   - `banner_novo_009.png` -> `public/screenshots/banner-relatorios.png`

2. **Landing.tsx** - Substituir os 4 FloatingScreenshots por uma unica imagem hero centralizada com o banner_novo_001 (dashboard overview com labels de funcionalidades). Isto simplifica o hero e mostra o produto completo.

3. **Paginas de funcionalidades** (Chat, Calendario, CRM, Kanban, VideoApproval, Pagamentos, Relatorios) - Atualizar o prop `screenshot` do `FeatureHero` de cada pagina para apontar para o novo banner correspondente.

4. **VideoApproval.tsx** - Usar banner_novo_006 no hero e banner_novo_007 na FeatureSection de "Comentarios por Timecode SMPTE".

### Detalhes tecnicos

- As imagens ficam em `public/screenshots/` pois sao referenciadas via URL direta nos props `screenshot` dos componentes `FeatureHero` e `FeatureSection`
- O componente `FeatureHero` e `FeatureSection` ja usam `loading="lazy"` e `fetchPriority` adequados
- Na Landing, o hero sera simplificado: em vez de 4 screenshots flutuantes, tera uma imagem central responsiva com sombra e brilho, mantendo o visual premium
- Os FloatingScreenshots do tablet e mobile tambem serao atualizados para usar a imagem unica

