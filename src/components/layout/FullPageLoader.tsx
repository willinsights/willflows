import { Logo } from '@/components/ui/logo';

/**
 * Optimized FullPageLoader using CSS animations instead of Framer Motion
 * - Reduces JavaScript bundle size
 * - Avoids main thread blocking from animation library
 * - Uses GPU-accelerated CSS animations
 */
export function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
        <Logo className="h-10" />
        
        <div className="flex items-center gap-2">
          <div 
            className="h-2 w-2 rounded-full bg-primary animate-pulse-dot"
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className="h-2 w-2 rounded-full bg-primary animate-pulse-dot"
            style={{ animationDelay: '200ms' }}
          />
          <div 
            className="h-2 w-2 rounded-full bg-primary animate-pulse-dot"
            style={{ animationDelay: '400ms' }}
          />
        </div>
      </div>
    </div>
  );
}
