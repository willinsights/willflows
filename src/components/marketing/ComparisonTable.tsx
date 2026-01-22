import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';

interface ComparisonItem {
  feature: string;
  competitor: boolean | 'partial';
  willflow: boolean | 'partial';
}

interface ComparisonTableProps {
  title?: string;
  subtitle?: string;
  competitorName: string;
  items: ComparisonItem[];
}

function StatusIcon({ status }: { status: boolean | 'partial' }) {
  if (status === true) {
    return (
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20">
        <Check className="h-4 w-4 text-green-500" />
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20">
        <Minus className="h-4 w-4 text-yellow-500" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20">
      <X className="h-4 w-4 text-red-500" />
    </div>
  );
}

export function ComparisonTable({
  title = 'Comparação',
  subtitle,
  competitorName,
  items,
}: ComparisonTableProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl md:text-3xl font-bold mb-4"
              >
                {title}
              </motion.h2>
            )}
            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 border-b border-border/50">
              <div className="font-medium text-muted-foreground">Funcionalidade</div>
              <div className="font-medium text-center text-muted-foreground">
                {competitorName}
              </div>
              <div className="font-medium text-center">
                <span className="gradient-text font-bold">WillFlow</span>
              </div>
            </div>

            {/* Rows */}
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className={`grid grid-cols-3 gap-4 p-4 items-center ${
                  index !== items.length - 1 ? 'border-b border-border/30' : ''
                }`}
              >
                <div className="text-sm">{item.feature}</div>
                <div className="flex justify-center">
                  <StatusIcon status={item.competitor} />
                </div>
                <div className="flex justify-center">
                  <StatusIcon status={item.willflow} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
