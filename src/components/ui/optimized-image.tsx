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
}

/**
 * Optimized Image component for Core Web Vitals
 * - Native lazy loading for below-the-fold images
 * - Priority loading with fetchPriority="high" for LCP
 * - Async decoding to avoid blocking main thread
 * - Smooth fade-in transition on load
 * - Placeholder to prevent CLS
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  priority = false,
  placeholderColor = 'bg-muted',
  aspectRatio,
  blur = false,
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
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
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
 * Preload critical images for LCP optimization
 * Call this in useEffect for above-the-fold images
 */
export function preloadImage(src: string): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }
}

/**
 * Check if native lazy loading is supported
 */
export function supportsLazyLoading(): boolean {
  return typeof window !== 'undefined' && 'loading' in HTMLImageElement.prototype;
}
