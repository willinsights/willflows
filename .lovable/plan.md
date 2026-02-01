

# Plano: Logo Reduzido na Página de Aprovação de Vídeo

## Situação Actual

| Área | Estado Actual | Pretendido |
|------|---------------|------------|
| AppSidebar (expandido) | ✅ Logo extenso | Manter |
| AppSidebar (colapsado) | ✅ Logo ícone | Manter |
| VideoApproval (header) | ❌ Logo extenso | Logo ícone |

## Análise

A página de aprovação de vídeo (`VideoApproval.tsx`) usa actualmente os logos extensos:

```tsx
// Linhas 602-603 e 652-653
<img src={logoBlack} alt="WillFlow" className="h-8 dark:hidden" />
<img src={logoWhite} alt="WillFlow" className="h-8 hidden dark:block" />
```

O utilizador pretende que esta página use apenas o ícone reduzido, tornando o header mais compacto.

---

## Alteração

### `src/pages/public/VideoApproval.tsx`

Substituir os logos extensos pelos ícones:

**Antes (2 locais - linhas 602-603 e 652-653):**
```tsx
import logoWhite from '@/assets/logo-willflow-white.png';
import logoBlack from '@/assets/logo-willflow-black.png';
// ...
<img src={logoBlack} alt="WillFlow" className="h-8 dark:hidden" />
<img src={logoWhite} alt="WillFlow" className="h-8 hidden dark:block" />
```

**Depois:**
```tsx
import logoIconCyan from '@/assets/logo-willflow-icon-cyan.png';
import logoIconPurple from '@/assets/logo-willflow-icon-purple.png';
// ...
<img src={logoIconPurple} alt="WillFlow" className="h-8 w-8 dark:hidden" />
<img src={logoIconCyan} alt="WillFlow" className="h-8 w-8 hidden dark:block" />
```

---

## Visual Comparativo

**Antes (logo extenso):**
```
┌─────────────────────────────────────────────────────┐
│ [═══ WILLFLOW ═══]  │  Studio Review  │  [Aprovar] │
└─────────────────────────────────────────────────────┘
```

**Depois (ícone compacto):**
```
┌─────────────────────────────────────────────────────┐
│ [W]  │  Studio Review  │  [Aprovar]                 │
│      │  Chocopalha...  │                            │
└─────────────────────────────────────────────────────┘
```

---

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/public/VideoApproval.tsx` | Substituir logos extensos pelos ícones (2 locais: estado aprovado e estado normal) |

---

## Secção Técnica

### Imports a Alterar

```typescript
// Remover:
import logoWhite from '@/assets/logo-willflow-white.png';
import logoBlack from '@/assets/logo-willflow-black.png';

// Adicionar:
import logoIconCyan from '@/assets/logo-willflow-icon-cyan.png';
import logoIconPurple from '@/assets/logo-willflow-icon-purple.png';
```

### Locais a Alterar

**1. Header do estado "Aprovado" (linhas 602-603):**
```tsx
<img src={logoIconPurple} alt="WillFlow" className="h-8 w-8 dark:hidden" />
<img src={logoIconCyan} alt="WillFlow" className="h-8 w-8 hidden dark:block" />
```

**2. Header do estado normal (linhas 652-653):**
```tsx
<img src={logoIconPurple} alt="WillFlow" className="h-8 w-8 dark:hidden" />
<img src={logoIconCyan} alt="WillFlow" className="h-8 w-8 hidden dark:block" />
```

A classe `w-8` é adicionada para garantir que o ícone mantém proporções quadradas.

