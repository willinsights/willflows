import "@/styles/marketing.css";
import { memo, useCallback, KeyboardEvent } from 'react';

interface FloatingScreenshotProps {
  src: string;
  alt: string;
  className?: string;
  delay?: number;
  onClick?: () => void;
  displayWidth?: number;
  /** Priority loading for above-the-fold images */
  priority?: boolean;
}

/**
 * Optimized FloatingScreenshot component
 * - Uses CSS animations instead of Framer Motion for performance
 * - Memoized to prevent unnecessary re-renders
 * - Includes accessibility features (role, tabIndex, keyboard navigation)
 */
export const FloatingScreenshot = memo(function FloatingScreenshot({ 
  src, 
  alt, 
  className = '', 
  delay = 0, 
  onClick,
  displayWidth = 420,
  priority = false,
}: FloatingScreenshotProps) {
  // Calculate display height based on original aspect ratio (1920x1246 = ~1.54:1)
  const displayHeight = Math.round(displayWidth / 1.54);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  // CSS animation with delay
  const animationStyle = {
    '--float-delay': `${delay}s`,
    animationDelay: `${delay}s`,
  } as React.CSSProperties;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Ver ${alt} em detalhe` : undefined}
      className={`absolute cursor-pointer animate-float-in hover:scale-105 hover:-translate-y-5 transition-transform duration-300 ${className}`}
      style={animationStyle}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 backdrop-blur-sm">
        <img 
          src={src}
          alt={alt}
          width={displayWidth}
          height={displayHeight}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...({ fetchpriority: priority ? 'high' : 'auto' } as any)}
          className="w-full h-full object-cover object-top"
        />
        {/* Hover glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      </div>
    </div>
  );
});
