import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, Star, TrendingUp } from 'lucide-react';

interface StatItem {
  icon: typeof Users;
  value: string;
  label: string;
}

const stats: StatItem[] = [
  {
    icon: Briefcase,
    value: '500+',
    label: 'Projetos geridos',
  },
  {
    icon: Users,
    value: '50+',
    label: 'Estúdios ativos',
  },
  {
    icon: Star,
    value: '4.9/5',
    label: 'Avaliação média',
  },
  {
    icon: TrendingUp,
    value: '30%',
    label: 'Aumento de produtividade',
  },
];

export const SocialProofBanner = memo(forwardRef<HTMLElement>(function SocialProofBanner(_props, ref) {
  return (
    <section ref={ref} className="py-12 px-4 border-y border-border/50 bg-muted/20">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 text-center"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}));
