import { motion } from 'framer-motion';
import { LucideIcon, ArrowRight, ArrowDown } from 'lucide-react';

interface FlowStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FlowDiagramProps {
  steps: FlowStep[];
  direction?: 'horizontal' | 'vertical';
  title?: string;
  subtitle?: string;
}

export function FlowDiagram({
  steps,
  direction = 'horizontal',
  title,
  subtitle,
}: FlowDiagramProps) {
  const isHorizontal = direction === 'horizontal';
  const ArrowIcon = isHorizontal ? ArrowRight : ArrowDown;

  return (
    <section className="py-16 md:py-24 bg-muted/30">
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

        <div
          className={`flex ${
            isHorizontal
              ? 'flex-col md:flex-row items-center justify-center gap-4 md:gap-2'
              : 'flex-col items-center gap-4'
          }`}
        >
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex ${
                isHorizontal ? 'flex-col md:flex-row' : 'flex-col'
              } items-center gap-4 md:gap-2`}
            >
              {/* Step Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6 text-center min-w-[200px] max-w-[280px]"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-4">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>

              {/* Arrow */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  viewport={{ once: true }}
                  className={`${isHorizontal ? 'hidden md:block' : ''}`}
                >
                  <ArrowIcon className="h-6 w-6 text-primary/50" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
