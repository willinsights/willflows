
## Plano de Correção: Estado de Esconder Valores Não Está Sincronizado

### Problema Identificado

O hook `useHideValues` usa `useState` localmente em cada componente. Quando múltiplos componentes chamam `useHideValues()`, cada um tem a sua própria instância do estado. Ao clicar no botão no `DashboardHeader`, apenas o estado desse componente muda - os restantes componentes (`KPICards`, `FinancialChart`, `PendingPaymentsList`, etc.) não são atualizados porque têm instâncias separadas.

---

### Solução

Converter o hook para usar um **React Context** que fornece um estado global partilhado por todos os componentes.

---

### Implementação Técnica

#### 1. Criar Context `HideValuesContext`

```tsx
// src/contexts/HideValuesContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const HIDE_VALUES_KEY = 'wf_hide_financial_values';

interface HideValuesContextType {
  hideValues: boolean;
  toggleHideValues: () => void;
}

const HideValuesContext = createContext<HideValuesContextType | undefined>(undefined);

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hideValues, setHideValues] = useState(() => {
    try {
      return localStorage.getItem(HIDE_VALUES_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideValues = useCallback(() => {
    setHideValues(prev => {
      const newValue = !prev;
      localStorage.setItem(HIDE_VALUES_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return (
    <HideValuesContext.Provider value={{ hideValues, toggleHideValues }}>
      {children}
    </HideValuesContext.Provider>
  );
}

export function useHideValues() {
  const context = useContext(HideValuesContext);
  if (context === undefined) {
    throw new Error('useHideValues must be used within a HideValuesProvider');
  }
  return context;
}
```

#### 2. Adicionar Provider ao App Layout

```tsx
// Em AppLayout.tsx ou no root da aplicação
import { HideValuesProvider } from '@/contexts/HideValuesContext';

// Envolver o layout com o provider
<HideValuesProvider>
  {/* ... resto do layout */}
</HideValuesProvider>
```

---

### Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `src/contexts/HideValuesContext.tsx` | Context provider para estado global de esconder valores |

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useHideValues.ts` | Remover ou redirecionar para o Context |
| `src/components/layout/AppLayout.tsx` | Adicionar `HideValuesProvider` no root |
| `src/components/layout/MobileAppLayout.tsx` | Adicionar `HideValuesProvider` no root (se separado) |

---

### Como Funciona

```text
┌─────────────────────────────────────────────────────┐
│                 HideValuesProvider                   │
│                   (estado global)                    │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │DashboardHeader│ │   KPICards   │ │FinancialChart│
│  │  (toggle btn) │ │   (blur)     │ │   (blur)     │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│         │                 │                │        │
│         └─────────────────┴────────────────┘        │
│                     partilham mesmo estado          │
└─────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. Ao clicar no botão do olho no header, **todos** os componentes atualizam imediatamente
2. O estado continua persistido em localStorage
3. A preferência é mantida entre sessões e entre navegações dentro da app
