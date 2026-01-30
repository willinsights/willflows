

## Plano: Botão para Esconder Valores Financeiros no Dashboard

### Objetivo

Adicionar um botão que permite ao utilizador ocultar valores financeiros sensíveis (receita, custos, lucro, pagamentos pendentes) no dashboard, aplicando um efeito de blur/fosco. A preferência é persistida localmente.

---

### Componentes a Criar

| Componente | Descrição |
|------------|-----------|
| `useHideValues` | Hook para gerir o estado de valores ocultos (com localStorage) |
| `HideValuesButton` | Botão toggle com ícone olho/olho fechado |

---

### Componentes a Modificar

| Componente | Alteração |
|------------|-----------|
| `DashboardHeader.tsx` | Adicionar botão de esconder valores ao lado do nome |
| `KPICards.tsx` | Aplicar blur condicional aos valores financeiros |
| `MobileKPICarousel.tsx` | Aplicar blur condicional aos valores financeiros |
| `FinancialChart.tsx` | Aplicar blur no tooltip e sumário anual |
| `MonthlyGoalsCard.tsx` | Aplicar blur aos valores de receita/metas |
| `PendingPaymentsList.tsx` | Aplicar blur aos valores de pagamentos |
| `MobilePendingPayments.tsx` | Aplicar blur aos valores |
| `MobileFinancialSummary.tsx` | Aplicar blur no preview e valores |
| `MobileGoalsSummary.tsx` | Aplicar blur aos valores de metas |
| `PerformanceMetricsCard.tsx` | Aplicar blur aos valores financeiros (receita por projeto, etc.) |

---

### Implementação Técnica

#### 1. Hook `useHideValues` (novo ficheiro)

```tsx
// src/hooks/useHideValues.ts
import { useState, useEffect, useCallback } from 'react';

const HIDE_VALUES_KEY = 'wf_hide_financial_values';

export function useHideValues() {
  const [hideValues, setHideValuesState] = useState(() => {
    try {
      return localStorage.getItem(HIDE_VALUES_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideValues = useCallback(() => {
    setHideValuesState(prev => {
      const newValue = !prev;
      localStorage.setItem(HIDE_VALUES_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return { hideValues, toggleHideValues };
}
```

#### 2. Componente de Valor Oculto (reutilizável)

```tsx
// Exemplo de uso inline
<span className={cn(
  'font-bold text-lg',
  hideValues && 'blur-md select-none'
)}>
  {formatCurrency(value)}
</span>
```

#### 3. Botão no Header

```tsx
// Em DashboardHeader.tsx
import { Eye, EyeOff } from 'lucide-react';
import { useHideValues } from '@/hooks/useHideValues';

// No JSX
<Button
  variant="ghost"
  size="sm"
  onClick={toggleHideValues}
  className="h-8 w-8 p-0"
  title={hideValues ? 'Mostrar valores' : 'Esconder valores'}
>
  {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</Button>
```

---

### Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `src/hooks/useHideValues.ts` | Hook para gerir estado de valores ocultos |

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/dashboard/DashboardHeader.tsx` | Adicionar botão toggle |
| `src/components/dashboard/KPICards.tsx` | Blur nos valores financeiros |
| `src/components/dashboard/FinancialChart.tsx` | Blur no sumário anual |
| `src/components/dashboard/MonthlyGoalsCard.tsx` | Blur nos valores |
| `src/components/dashboard/PendingPaymentsList.tsx` | Blur nos valores |
| `src/components/dashboard/PerformanceMetricsCard.tsx` | Blur nos valores |
| `src/components/mobile/MobileKPICarousel.tsx` | Blur nos valores móveis |
| `src/components/mobile/MobilePendingPayments.tsx` | Blur nos valores |
| `src/components/mobile/MobileFinancialSummary.tsx` | Blur nos valores |
| `src/components/mobile/MobileGoalsSummary.tsx` | Blur nos valores |

---

### UX Design

```text
┌──────────────────────────────────────────────────────────┐
│  Bom dia, João!                              [👁] [+]   │
│  quinta-feira, 30 de janeiro • 16:30                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐│
│  │ 5       │ │ 8       │ │ 12      │ │ ████████        ││
│  │Captação │ │ Edição  │ │Entregues│ │ Receita (blur)  ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **Ícone**: `Eye` quando visível, `EyeOff` quando oculto
- **Blur**: Classe `blur-md` do Tailwind (suficiente para obscurecer mas reconhecível)
- **Interação**: Um clique para toggle, hover mostra tooltip

---

### Resultado Esperado

1. Botão visível no header do dashboard (desktop e mobile)
2. Ao clicar, todos os valores financeiros ficam com blur
3. Preferência guardada em localStorage (persiste entre sessões)
4. Contagem de projetos (captação, edição, entregues) **não** são afetados
5. Apenas valores monetários são ocultados

