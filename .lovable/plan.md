

## Remover Setas de Inputs Numéricos para Valores Monetários

### Problema

Os campos de valores monetários estão a usar `type="number"` que mostra as setas (spinner) para incrementar/decrementar. Isso é pouco prático para valores monetários onde os utilizadores preferem digitar diretamente.

---

### Solução

Criar um componente `CurrencyInput` reutilizável que:
1. Usa `type="text"` com `inputMode="decimal"` (teclado numérico em mobile)
2. Remove as setas (spinners) completamente
3. Formata automaticamente o valor como moeda
4. Aceita apenas números e separadores decimais

---

### Componente a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `src/components/ui/currency-input.tsx` | Novo componente de input para moeda |

---

### Implementação do Componente

```typescript
// currency-input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value'> {
  value: number | string | null | undefined;
  onChange: (value: number | null) => void;
  currencySymbol?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, currencySymbol, placeholder = "0.00", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');

    // Sync display value with prop value
    React.useEffect(() => {
      if (value === null || value === undefined || value === '') {
        setDisplayValue('');
      } else {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(numValue)) {
          setDisplayValue(numValue.toString());
        }
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty input
      if (inputValue === '') {
        setDisplayValue('');
        onChange(null);
        return;
      }

      // Only allow numbers, decimal point, and minus sign
      const sanitized = inputValue.replace(/[^0-9.,\-]/g, '').replace(',', '.');
      
      // Validate number format
      if (/^-?\d*\.?\d*$/.test(sanitized)) {
        setDisplayValue(sanitized);
        const numValue = parseFloat(sanitized);
        if (!isNaN(numValue)) {
          onChange(numValue);
        }
      }
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
```

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/projects/ProjectFinancialTab.tsx` | Substituir `type="number"` por `CurrencyInput` |
| `src/components/projects/CreateProjectModal.tsx` | Substituir inputs monetários |
| `src/components/contracts/CreateContractModal.tsx` | Substituir input de valor total |
| `src/components/leads/CreateLeadModal.tsx` | Substituir input de valor estimado |
| `src/components/dashboard/MonthlyGoalsCard.tsx` | Substituir input de meta de receita |

---

### Exemplo de Substituição

**Antes:**
```tsx
<Input
  type="number"
  step="0.01"
  min="0"
  placeholder="0.00"
  value={member.payment_amount || ''}
  onChange={(e) => handleChange(Number(e.target.value))}
/>
```

**Depois:**
```tsx
<CurrencyInput
  placeholder="0.00"
  value={member.payment_amount}
  onChange={(value) => handleChange(value || 0)}
/>
```

---

### Resultado Visual

| Antes | Depois |
|-------|--------|
| Campo com setas ↑↓ | Campo de texto limpo |
| Incremento por clique | Digitação direta |
| `type="number"` | `type="text" inputMode="decimal"` |

---

### Vantagens

1. **UX melhorada**: Sem setas que ocupam espaço e causam cliques acidentais
2. **Mobile-friendly**: `inputMode="decimal"` mostra teclado numérico
3. **Consistência**: Mesmo componente em todo o projeto
4. **Validação**: Só aceita valores numéricos válidos

