import { useState, useCallback, memo, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  /** Priority loading for LCP images above the fold */
  priority?: boolean;
  /** Placeholder background color while loading */
  placeholderColor?: string;
  /** Aspect ratio for placeholder (e.g., "16/9", "4/3") */
  aspectRatio?: string;
  /** Show blur placeholder effect */
  blur?: boolean;
  /** WebP source for modern browsers (optional) */
  webpSrc?: string;
}

/**
 * Optimized Image component for Core Web Vitals
 * - Native lazy loading for below-the-fold images
 * - Priority loading with fetchPriority="high" for LCP
 * - Async decoding to avoid blocking main thread
 * - Smooth fade-in transition on load
 * - Placeholder to prevent CLS
 * - WebP support with fallback
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  priority = false,
  placeholderColor = 'bg-muted',
  aspectRatio,
  blur = false,
  webpSrc,
  className,
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  const imgClassName = cn(
    'w-full h-full object-cover transition-opacity duration-300',
    isLoaded ? 'opacity-100' : 'opacity-0'
  );

  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        placeholderColor,
        !isLoaded && blur && 'animate-pulse',
        className
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {!hasError && (
        webpSrc ? (
          <picture>
            <source srcSet={webpSrc} type="image/webp" />
            <img
              src={src}
              alt={alt}
              width={width}
              height={height}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={priority ? 'high' : 'auto'}
              onLoad={handleLoad}
              onError={handleError}
              className={imgClassName}
              {...props}
            />
          </picture>
        ) : (
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            onLoad={handleLoad}
            onError={handleError}
            className={imgClassName}
            {...props}
          />
        )
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Imagem indisponível
        </div>
      )}
    </div>
  );
});

/**
 * SEO-optimized image with descriptive alt text patterns
 * Use for marketing pages to improve image search rankings
 */
interface SeoImageProps extends OptimizedImageProps {
  /** Product/Feature name for SEO */
  productName?: string;
  /** Action/Context description */
  context?: string;
}

export const SeoImage = memo(function SeoImage({
  alt,
  productName = 'WillFlow',
  context,
  ...props
}: SeoImageProps) {
  // Generate SEO-friendly alt text
  const seoAlt = context 
    ? `${productName} - ${alt}. ${context}`
    : `${productName} - ${alt}`;
  
  return <OptimizedImage alt={seoAlt} {...props} />;
});

/**
 * Preload critical images for LCP optimization
 * Call this in useEffect for above-the-fold images
 */
export function preloadImage(src: string, asWebp = false): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    if (asWebp) {
      link.type = 'image/webp';
    }
    document.head.appendChild(link);
  }
}

/**
 * Check if native lazy loading is supported
 */
export function supportsLazyLoading(): boolean {
  return typeof window !== 'undefined' && 'loading' in HTMLImageElement.prototype;
}

/**
 * Check if WebP is supported
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  });
}

/**
 * Generate descriptive alt text for common UI screenshots
 */
export const altTextPatterns = {
  dashboard: (context: string) => 
    `Painel de controlo WillFlow mostrando ${context} com métricas de projetos e receitas em tempo real`,
  kanban: (context: string) => 
    `Quadro Kanban visual WillFlow organizando ${context} por fases de produção: captação, edição e entrega`,
  calendar: (context: string) => 
    `Calendário WillFlow com ${context}, sessões agendadas e prazos de entrega sincronizados`,
  payments: (context: string) => 
    `Gestão de pagamentos WillFlow exibindo ${context}, valores pendentes e recebidos por projeto`,
  crm: (context: string) => 
    `CRM WillFlow com ${context}, histórico de clientes e comunicações registadas`,
  reports: (context: string) => 
    `Relatórios analíticos WillFlow mostrando ${context}, gráficos de desempenho e tendências`,
};
