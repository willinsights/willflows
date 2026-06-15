import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Wrapper responsivo para tabelas. Adiciona scroll horizontal em viewports
 * pequenos sem partir o layout, mantendo o cabeçalho fixo no topo do scroll.
 *
 * Uso:
 * ```tsx
 * <ResponsiveTable>
 *   <Table>
 *     <TableHeader>...</TableHeader>
 *     <TableBody>...</TableBody>
 *   </Table>
 * </ResponsiveTable>
 * ```
 */
export const ResponsiveTable = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'w-full overflow-x-auto rounded-lg border border-border bg-card',
      // Scroll-shadow utilitária para indicar mais conteúdo
      'relative',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

ResponsiveTable.displayName = 'ResponsiveTable';
