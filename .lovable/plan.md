
# Plano: Adicionar "Comparação A/B de versões" ao texto de Aprovação de Vídeo

## Problema

Nas páginas `/planos` e Landing page, a caixa "Exclusivo Studio" diz apenas "Aprovação de vídeo", sem mencionar a comparação A/B de versões -- uma funcionalidade diferenciadora importante.

## Alterações

### 1. Pricing.tsx (linha 355) e Landing.tsx (linha 832)

Actualizar o texto na caixa "Exclusivo Studio" de:
- `Aprovação de vídeo`

Para:
- `Aprovação de vídeo e comparação A/B`

### 2. src/lib/plans.ts (linhas 199, 235, 271)

Actualizar o nome da feature `videoApproval` de:
- `Aprovação de vídeo`

Para:
- `Aprovação de vídeo e comparação A/B`

Isto actualiza automaticamente a tabela de comparação detalhada na página `/planos` (que usa `PLANS.studio.features`).

### 3. Landing.tsx (linha 78-79) -- Secção de features

Actualizar a descrição do card de "Aprovação de Vídeo" para incluir a comparação:
- De: `Portal de review para clientes com comentários por timecode.`
- Para: `Portal de review com comparação A/B de versões e comentários por timecode.`

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/plans.ts` | Renomear feature `videoApproval` para incluir "e comparação A/B" |
| `src/pages/Pricing.tsx` | Actualizar texto na caixa Studio |
| `src/pages/Landing.tsx` | Actualizar texto na caixa Studio + descrição do card de features |

## Impacto

- A tabela de comparação detalhada na página `/planos` reflecte automaticamente a mudança via `plans.ts`
- Ambas as caixas "Exclusivo Studio" (Landing + Pricing) ficam alinhadas
- Visitantes vêem claramente que a aprovação inclui comparação de versões
