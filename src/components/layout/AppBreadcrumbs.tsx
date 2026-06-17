import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { labelFromSegment } from '@/lib/route-labels';


// Routes that should not show breadcrumbs (root level)
const hideBreadcrumbsRoutes = ['/app', '/app/dashboard'];

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function AppBreadcrumbs({ className = '' }: { className?: string }) {
  const location = useLocation();
  
  // Don't show breadcrumbs on root app routes
  if (hideBreadcrumbsRoutes.includes(location.pathname)) {
    return null;
  }

  // Split path and filter empty segments
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Need at least 2 segments (e.g., /app/relatorios)
  if (pathSegments.length < 2) return null;

  // Skip the first 'app' segment and build breadcrumb items
  const items: BreadcrumbItem[] = pathSegments.slice(1).map((segment, index) => {
    // Build the href for this segment
    const href = '/' + pathSegments.slice(0, index + 2).join('/');
    const label = labelFromSegment(segment);
    
    return {
      label,
      href: index < pathSegments.length - 2 ? href : undefined, // Last item has no link
    };
  });

  if (items.length === 0) return null;

  return (
    <nav 
      aria-label="Navegação de contexto" 
      className={cn('flex items-center text-sm text-muted-foreground', className)}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {/* Home/Dashboard link */}
        <li className="flex items-center">
          <Link 
            to="/app/dashboard" 
            className="flex items-center hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
            aria-label="Dashboard"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        {/* Breadcrumb items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label + index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
              {isLast || !item.href ? (
                <span 
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link 
                  to={item.href} 
                  className="hover:text-foreground transition-colors hover:underline underline-offset-2"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
