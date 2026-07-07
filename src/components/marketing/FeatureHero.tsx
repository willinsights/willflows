import "@/styles/marketing.css";
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureHeroProps {
  icon: LucideIcon;
  badge?: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  screenshot: string;
  /** Custom alt text for SEO - defaults to title + subtitle */
  screenshotAlt?: string;
  ctaText?: string;
  ctaLink?: string;
}

export function FeatureHero({
  icon: Icon,
  badge,
  title,
  titleHighlight,
  subtitle,
  screenshot,
  screenshotAlt,
  ctaText = 'Começar teste grátis (30 dias)',
  ctaLink = '/auth?trial=true',
}: FeatureHeroProps) {
  // Generate SEO-friendly alt text
  const fullTitle = titleHighlight ? `${title} ${titleHighlight}` : title;
  const altText = screenshotAlt || 
    `Interface WillFlow - ${fullTitle}. ${subtitle.slice(0, 80)}`;
  return (
    <section className="pt-32 pb-16 px-4 overflow-hidden">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {badge && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Icon className="h-4 w-4" />
                {badge}
              </div>
            )}

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {title}{' '}
              {titleHighlight && (
                <span className="gradient-text">{titleHighlight}</span>
              )}
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-xl">
              {subtitle}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to={ctaLink}>
                <Button size="lg" className="gradient-primary">
                  {ctaText}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/funcionalidades">
                <Button size="lg" variant="outline">
                  Ver todas as funcionalidades
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Screenshot with fog overlay */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <img
              src={screenshot}
              alt={altText}
              title={fullTitle}
              className="w-full screenshot-fog-hero"
              loading="eager"
              decoding="async"
              {...({ fetchpriority: 'high' } as any)}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
