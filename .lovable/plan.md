

# Plano: Reduzir Logo no Sidebar Expandido em 30%

## Situação Actual

O logo no sidebar expandido usa a classe `h-10` (40px de altura).

| Componente | Classe Actual | Tamanho |
|------------|---------------|---------|
| Logo expandido | `h-10` | 40px |
| Logo colapsado | `h-8` | 32px |

## Alteração

Reduzir o logo expandido em ~30%:
- **Actual:** `h-10` = 40px
- **30% menos:** 40px × 0.7 = 28px ≈ `h-7`

### `src/components/layout/AppSidebar.tsx`

**Antes (linha 184):**
```tsx
collapsed && !isMobile ? 'h-8' : 'h-10'
```

**Depois:**
```tsx
collapsed && !isMobile ? 'h-8' : 'h-7'
```

---

## Visual Comparativo

```
ANTES (h-10 = 40px):          DEPOIS (h-7 = 28px):
┌───────────────────────┐     ┌───────────────────────┐
│ [══ WILLFLOW ══]  ☰  │     │ [═ WILLFLOW ═]    ☰  │
│                       │     │                       │
│ VISÃO GERAL           │     │ VISÃO GERAL           │
│ 🏠 Dashboard          │     │ 🏠 Dashboard          │
└───────────────────────┘     └───────────────────────┘
         ↓ 30% menor
```

---

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/layout/AppSidebar.tsx` | Linha 184: alterar `h-10` para `h-7` |

