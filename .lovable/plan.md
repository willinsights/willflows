

## Apagar banners antigos, padronizar padding e preparar efeito nevoa (ClickUp-style)

### 1. Apagar os 14 screenshots antigos

Eliminar todos os ficheiros `screenshot-*.png` de `public/screenshots/`, mantendo apenas os 9 banners novos (`banner-*.png`):

**A apagar:**
- screenshot-calendario-full.png
- screenshot-captacao-estudio.png
- screenshot-conta-planos.png
- screenshot-dashboard-dark-full.png
- screenshot-dashboard-estudio.png
- screenshot-dashboard-light-full.png
- screenshot-kanban-full.png
- screenshot-onboarding-planos.png
- screenshot-onboarding-regiao.png
- screenshot-pagamentos-estudio.png
- screenshot-pagamentos.png
- screenshot-permissoes.png
- screenshot-projeto-modal.png
- screenshot-relatorios-3m.png
- screenshot-relatorios-6m.png

**A manter (9 novos):**
- banner-dashboard-overview.png
- banner-chat.png
- banner-calendario.png
- banner-crm.png
- banner-kanban.png
- banner-video-approval.png
- banner-studio-review.png
- banner-pagamentos.png
- banner-relatorios.png

### 2. Atualizar todas as referencias a screenshots antigos

Substituir todos os caminhos `screenshot-*.png` pelo banner contextual mais adequado nas paginas que ainda os usam:

| Pagina | Substituicao |
|---|---|
| **ParaFotografos.tsx** | Todos os `screenshot-*` passam para banners contextuais (kanban, calendario, crm, pagamentos, relatorios) |
| **ParaVideomakers.tsx** | Idem |
| **ParaProdutoras.tsx** | Idem |
| **Tutorial.tsx** | Idem — cada passo usa o banner da funcionalidade correspondente |
| **features/Calendario.tsx** | Sections internas que ainda usam `screenshot-projeto-modal` e `screenshot-kanban-full` passam para `banner-calendario.png` |
| **features/Pagamentos.tsx** | `screenshot-dashboard-light-full` passa para `banner-pagamentos.png` |
| **features/Relatorios.tsx** | `screenshot-relatorios-3m` e `screenshot-permissoes` passam para `banner-relatorios.png` |
| **features/Timeline.tsx** | `screenshot-kanban-full` e `screenshot-calendario-full` passam para banners adequados |
| **features/MediaHub.tsx** | Verificar e substituir se necessario |
| **comparisons/*.tsx** | Ja usam banners — verificar que nenhum antigo resta |

### 3. Padronizar padding lateral em todas as paginas

Garantir que TODAS as paginas marketing usam o mesmo sistema de margens:

```text
container mx-auto px-4
```

Verificar e corrigir:
- `FeatureHero.tsx` — ja usa `px-4` na section, confirmar `container mx-auto` dentro
- `FeatureSection.tsx` — ja usa `container mx-auto px-4`
- `Landing.tsx` — garantir `container mx-auto px-4` em todas as sections
- Paginas Para*.tsx — verificar consistencia
- Paginas de comparacao — verificar consistencia

### 4. Efeito nevoa/fog estilo ClickUp nas imagens

O ClickUp usa um gradiente que desfoca a parte inferior e lateral das imagens de produto, integrando-as com o fundo da pagina. Isto e feito com CSS puro usando `mask-image` com gradiente linear.

**Implementacao nos componentes `FeatureHero` e `FeatureSection`:**

Envolver cada `<img>` num `div` com um overlay de gradiente que vai de transparente (topo) para a cor de fundo (base), criando o efeito de "nevoa" que funde a imagem no fundo:

```text
<div className="relative">
  <img src={screenshot} className="w-full rounded-t-2xl" />
  {/* Fog overlay - bottom fade */}
  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
  {/* Fog overlay - side fade (optional) */}
  <div className="absolute inset-0 bg-gradient-to-r from-background/30 to-transparent pointer-events-none" />
</div>
```

Alternativa mais limpa com CSS `mask-image`:
```css
.screenshot-fog {
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}
```

O resultado: a imagem aparece nitida no topo e desvanece suavemente para o fundo da pagina na base, exactamente como o ClickUp faz.

**Aplicar em:**
- `FeatureHero.tsx` — imagem do hero (fade inferior + lateral direita)
- `FeatureSection.tsx` — imagens de cada section (fade inferior)
- `Landing.tsx` — banner do hero (fade inferior + lateral direita para "sangrar" no fundo)
- Paginas Para*.tsx — imagens inline que tenham o mesmo pattern

### 5. Remover sombras e borders restantes das imagens

Como as imagens vao ter fundo transparente e o efeito de nevoa, remover:
- `shadow-2xl` e `shadow-xl` das `<img>` nos componentes
- Qualquer `border` residual
- `rounded-2xl` na base (manter apenas `rounded-t-xl` ou similar no topo)

### Ficheiros a alterar

1. **Apagar 15 ficheiros** de `public/screenshots/screenshot-*.png`
2. `src/components/marketing/FeatureHero.tsx` — fog overlay + remover shadow
3. `src/components/marketing/FeatureSection.tsx` — fog overlay + remover shadow
4. `src/pages/Landing.tsx` — fog overlay no hero banner
5. `src/pages/ParaFotografos.tsx` — substituir screenshots antigos
6. `src/pages/ParaVideomakers.tsx` — substituir screenshots antigos
7. `src/pages/ParaProdutoras.tsx` — substituir screenshots antigos
8. `src/pages/Tutorial.tsx` — substituir screenshots antigos
9. `src/pages/features/Calendario.tsx` — substituir restantes
10. `src/pages/features/Pagamentos.tsx` — substituir restantes
11. `src/pages/features/Relatorios.tsx` — substituir restantes
12. `src/pages/features/Timeline.tsx` — substituir restantes
13. `src/pages/features/MediaHub.tsx` — verificar e substituir
14. `src/index.css` — adicionar classe `.screenshot-fog` se necessario

**Nota:** As imagens do hero e sections ficam todas preparadas com o efeito nevoa. Quando enviares os novos banners sem fundo, basta substituir os ficheiros — o efeito CSS ja estara aplicado e vai integrar perfeitamente com o fundo do site.
