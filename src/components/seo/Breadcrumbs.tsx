import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

// Route name mappings for automatic breadcrumb generation
const routeLabels: Record<string, string> = {
  '': 'Início',
  'funcionalidades': 'Funcionalidades',
  'chat': 'Chat de Equipa',
  'kanban': 'Kanban Visual',
  'crm': 'CRM Integrado',
  'calendario': 'Calendário',
  'pagamentos': 'Pagamentos',
  'relatorios': 'Relatórios',
  'media-hub': 'Media Hub',
  'planos': 'Planos',
  'para-fotografos': 'Para Fotógrafos',
  'para-videomakers': 'Para Videomakers',
  'blog': 'Blog',
  'ajuda': 'Ajuda',
  'sobre': 'Sobre',
  'seguranca': 'Segurança',
  'integracoes': 'Integrações',
  'contato': 'Contato',
  'privacidade': 'Privacidade',
  'termos': 'Termos',
  'cookies': 'Cookies',
  'vs': 'Comparações',
  'asana': 'WillFlow vs Asana',
  'clickup': 'WillFlow vs ClickUp',
  'trello': 'WillFlow vs Trello',
};

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const baseUrl = 'https://willflow.app';

  // Generate Schema.org BreadcrumbList
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: baseUrl,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
        ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
      })),
    ],
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <nav 
        aria-label="Breadcrumb" 
        className={`flex items-center text-sm text-muted-foreground ${className}`}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {/* Home */}
          <li className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center hover:text-foreground transition-colors"
              aria-label="Página inicial"
            >
              <Home className="h-4 w-4" />
            </Link>
          </li>

          {/* Breadcrumb items */}
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={item.label} className="flex items-center gap-1.5">
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
                    className="hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

// Auto-generate breadcrumbs from current route
export function AutoBreadcrumbs({ className = '' }: { className?: string }) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) return null;

  const items: BreadcrumbItem[] = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    return {
      label,
      href: index < pathSegments.length - 1 ? href : undefined,
    };
  });

  return <Breadcrumbs items={items} className={className} />;
}

export default Breadcrumbs;
