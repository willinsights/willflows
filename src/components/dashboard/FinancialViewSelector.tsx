import { Eye, TrendingUp, Wallet, Info } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FinancialViewMode } from '@/lib/finance/types';

interface FinancialViewSelectorProps {
  value: FinancialViewMode;
  onChange: (mode: FinancialViewMode) => void;
}

const modes = [
  {
    value: 'REALIZADO' as const,
    label: 'Realizado',
    icon: Eye,
    tooltip: 'Conta no mês em que o projeto foi entregue (delivered_at).',
  },
  {
    value: 'PREVISAO' as const,
    label: 'Previsão',
    icon: TrendingUp,
    tooltip: 'Conta no mês planeado. Projetos atrasados entram como rollover.',
  },
  {
    value: 'CAIXA' as const,
    label: 'Caixa',
    icon: Wallet,
    tooltip: 'Conta no mês em que o dinheiro entrou/saiu (paid_at).',
  },
];

export function FinancialViewSelector({ value, onChange }: FinancialViewSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v as FinancialViewMode);
        }}
        className="bg-muted/50 rounded-lg p-0.5"
      >
        {modes.map((mode) => (
          <Tooltip key={mode.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={mode.value}
                className="text-xs px-3 h-7 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
              >
                <mode.icon className="h-3.5 w-3.5" />
                {mode.label}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px]">
              <p className="text-xs">{mode.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </div>
  );
}
