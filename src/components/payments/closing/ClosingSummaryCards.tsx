import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useHideValues } from '@/hooks/useHideValues';

interface Props {
  revenue: string;
  editorPayable: string;
  ownerProfit: string;
  alreadyPaid: string;
  simple?: boolean;
  simpleValue?: string; // Freelancer view: single "meu rendimento"
}

export function ClosingSummaryCards({ revenue, editorPayable, ownerProfit, alreadyPaid, simple, simpleValue }: Props) {
  const { hideValues } = useHideValues();

  const cards = simple
    ? [
        { label: 'Receita', value: revenue, cls: 'text-success', border: 'border-success/20' },
        { label: 'O meu rendimento', value: simpleValue || ownerProfit, cls: 'text-primary', border: 'border-primary/20' },
      ]
    : [
        { label: 'Receita do fecho', value: revenue, cls: 'text-success', border: 'border-success/20' },
        { label: 'A pagar (editores + extras)', value: editorPayable, cls: 'text-destructive', border: 'border-destructive/20' },
        { label: 'Lucro do dono', value: ownerProfit, cls: 'text-primary', border: 'border-primary/20' },
        { label: 'Já pago', value: alreadyPaid, cls: 'text-muted-foreground', border: 'border-muted' },
      ];

  return (
    <div className={cn('grid gap-3 md:gap-4', simple ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <Card className={cn('glass-card hover:shadow-md transition-shadow', c.border)}>
            <CardContent className="p-4 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
              <p className={cn('text-2xl font-bold mt-1', c.cls, hideValues && 'blur-md select-none')}>
                {c.value}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
