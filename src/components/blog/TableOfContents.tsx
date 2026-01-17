import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

export function TableOfContents({ content, className }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings from HTML content
  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h2, h3');
    
    const tocItems: TocItem[] = [];
    headings.forEach((heading, index) => {
      const text = heading.textContent || '';
      const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;
      tocItems.push({
        id,
        text,
        level: heading.tagName === 'H2' ? 2 : 3,
      });
    });
    
    setItems(tocItems);
  }, [content]);

  // Add IDs to actual headings in the DOM and track active section
  useEffect(() => {
    if (items.length === 0) return;

    // Add IDs to headings
    const articleContent = document.querySelector('.blog-content');
    if (articleContent) {
      const headings = articleContent.querySelectorAll('h2, h3');
      headings.forEach((heading, index) => {
        if (items[index]) {
          heading.id = items[index].id;
        }
      });
    }

    // Intersection Observer for active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -70% 0px',
        threshold: 0,
      }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (items.length === 0) return null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Table of Contents */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          Índice
        </h3>
        <nav className="space-y-1">
          {items.filter(item => item.level === 2).map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToHeading(item.id)}
              className={cn(
                'block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors',
                'hover:bg-muted hover:text-foreground',
                activeId === item.id
                  ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                  : 'text-muted-foreground'
              )}
            >
              {item.text}
            </button>
          ))}
        </nav>
      </div>

      {/* CTA Card */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-xl p-5 border border-primary/20">
        <h4 className="font-semibold mb-2">Comece a usar WillFlow</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Gerencie o seu estúdio de forma simples e eficiente.
        </p>
        <Button asChild size="sm" className="w-full gradient-primary">
          <Link to="/auth">Começar Gratuitamente</Link>
        </Button>
      </div>
    </div>
  );
}
