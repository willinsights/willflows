import { motion } from 'framer-motion';
import { LucideIcon, Check } from 'lucide-react';

interface FeatureSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  screenshot: string;
  features: string[];
  reversed?: boolean;
  /** Optional custom alt text for SEO - defaults to descriptive pattern */
  screenshotAlt?: string;
}

/**
 * Feature section with alternating layout for marketing pages
 * - Optimized image loading with lazy loading
 * - SEO-friendly alt text generation
 * - Accessible structure with semantic HTML
 */
export function FeatureSection({
  icon: Icon,
  title,
  description,
  screenshot,
  features,
  reversed = false,
  screenshotAlt,
}: FeatureSectionProps) {
  // Generate SEO-optimized alt text if not provided
  const altText = screenshotAlt || 
    `Interface WillFlow mostrando ${title.toLowerCase()} - ${description.slice(0, 100)}`;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className={`grid md:grid-cols-2 gap-12 items-center ${reversed ? 'md:flex-row-reverse' : ''}`}>
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: reversed ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className={reversed ? 'md:order-2' : ''}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
            </div>
            
            <p className="text-lg text-muted-foreground mb-6">
              {description}
            </p>
            
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          {/* Screenshot with SEO-optimized alt text */}
          <motion.div
            initial={{ opacity: 0, x: reversed ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className={reversed ? 'md:order-1' : ''}
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-50" />
              <img
                src={screenshot}
                alt={altText}
                title={title}
                className="relative rounded-2xl shadow-2xl border border-border/50 w-full"
                loading="lazy"
                decoding="async"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
