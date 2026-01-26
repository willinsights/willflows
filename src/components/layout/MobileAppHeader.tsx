import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Skeleton } from '@/components/ui/skeleton';

export function MobileAppHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { results, loading } = useGlobalSearch(searchQuery);

  const handleResultClick = (result: any) => {
    setSearchOpen(false);
    setSearchQuery('');
    
    switch (result.type) {
      case 'project':
        navigate(`/app/captacao?projectId=${result.id}`);
        break;
      case 'client':
        navigate(`/app/clientes?clientId=${result.id}`);
        break;
      case 'task':
        navigate(`/app/captacao?taskId=${result.id}`);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 h-14 bg-card/95 backdrop-blur-md border-b border-border/60 px-4 flex items-center gap-3 safe-area-top"
      >
        {/* Left: Logo + Workspace Selector */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Logo iconOnly className="h-8 w-8 shrink-0" />
          <WorkspaceSelector />
        </div>

        {/* Right: Search + Notifications */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <NotificationCenter />
        </div>
      </motion.header>

      {/* Search Sheet */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="h-auto max-h-[80vh] rounded-b-3xl p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="sr-only">Pesquisar</SheetTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Pesquisar projetos, clientes, tarefas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base rounded-xl bg-muted/50 border-0"
              />
            </div>
          </SheetHeader>
          
          {searchQuery.length >= 2 && (
            <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2 py-4">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                        result.type === 'project' && "bg-primary",
                        result.type === 'client' && "bg-blue-500",
                        result.type === 'task' && "bg-amber-500"
                      )}>
                        {result.type === 'project' ? 'P' : result.type === 'client' ? 'C' : 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{result.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Sem resultados para "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
