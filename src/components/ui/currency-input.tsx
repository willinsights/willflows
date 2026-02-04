import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value' | 'onBlur' | 'onKeyDown'> {
  value: number | string | null | undefined;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onBlur, onKeyDown, placeholder = "0.00", ...props }, ref) => {
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
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
