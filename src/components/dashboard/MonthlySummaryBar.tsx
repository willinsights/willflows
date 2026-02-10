import { motion } from 'framer-motion';
import { Plus, CalendarCheck, PackageCheck, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MonthlySummary } from '@/lib/finance/types';

interface MonthlySummaryBarProps {
  summary: MonthlySummary;
  loading: boolean;
}

const items = [
  { key: 'created' as const, label: 'Criados', icon: Plus, color: 'text-muted-foreground', tooltip: 'Projetos criados neste mês (created_at)' },
  { key: 'planned' as const, label: 'Planeados', icon: CalendarCheck, color: 'text-primary', tooltip: 'Projetos com data de entrega neste mês' },
  { key: 'delivered' as const, label: 'Entregues', icon: PackageCheck, color: 'text-success', tooltip: 'Projetos entregues neste mês (delivered_at)' },
  { key: 'postponed' as const, label: 'Adiados', icon: ArrowRightLeft, color: 'text-warning', tooltip: 'Planeados para este mês mas ainda não entregues' },
  { key: 'rescued' as const, label: 'Resgatados', icon: RotateCcw, color: 'text-accent-foreground', tooltip: 'Entregues neste mês mas planeados para meses anteriores' },
];

export function MonthlySummaryBar({ summary, loading }: MonthlySummaryBarProps) {
  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex items-center gap-1 flex-wrap"
    >
      {items.map((item) => (
        <Tooltip key={item.key}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/40 text-xs">
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-semibold">{summary[item.key]}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px]">
            <p className="text-xs">{item.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </motion.div>
  );
}
