import { motion } from 'framer-motion';
import { Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { Logo } from '@/components/ui/logo';
import { useLocation } from 'react-router-dom';
import { labelFromSegment } from '@/lib/route-labels';
import { useCommandPalette } from '@/components/command/CommandPaletteProvider';

export function MobileAppHeader() {
  const location = useLocation();
  const { open: openCommandPalette } = useCommandPalette();

  const pageSegments = location.pathname
    .split('/')
    .filter((s) => s && s !== 'app');
  const pageLabels = pageSegments.map((s) => labelFromSegment(s));

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 h-14 bg-card/95 backdrop-blur-md border-b border-border/60 px-4 flex items-center gap-3 safe-area-top"
    >
      {/* Left: Logo + Workspace Selector + Page Title */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Logo iconOnly className="h-8 w-8 shrink-0" />
        <WorkspaceSelector />
        {pageLabels.length > 0 && (
          <div className="flex items-center gap-0.5 min-w-0 overflow-hidden">
            {pageLabels.map((label, i) => (
              <span key={i} className="flex items-center gap-0.5 shrink-0">
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: Search (opens command palette) + Notifications */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={openCommandPalette}
          aria-label="Abrir pesquisa"
        >
          <Search className="h-5 w-5" />
        </Button>
        <NotificationCenter />
      </div>
    </motion.header>
  );
}
