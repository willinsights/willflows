import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  MessageSquare,
  User,
  X,
} from 'lucide-react';
import { useTotalUnreadMessages } from '@/hooks/useTotalUnreadMessages';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { navSections, superAdminSection, filterSections } from '@/lib/nav-config';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Início', path: '/app' },
  { icon: FolderKanban, label: 'Projetos', path: '/app/captacao' },
  { icon: null, label: 'Criar', path: null }, // FAB placeholder
  { icon: MessageSquare, label: 'Chat', path: '/app/chat' },
  { icon: User, label: 'Menu', path: null }, // Opens menu sheet
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalUnread } = useTotalUnreadMessages();
  const { isAdmin } = useWorkspace();
  const { isSuperAdmin } = useSuperAdmin();
  const {
    canViewLeads,
    canViewClients,
    canViewContracts,
    canViewTeam,
    canViewReports,
    canViewAllFinancials,
  } = useFinancialPermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const baseSections = isSuperAdmin ? [...navSections, superAdminSection] : navSections;
  const sections = filterSections(baseSections, {
    isAdmin,
    isSuperAdmin,
    canViewLeads,
    canViewClients,
    canViewContracts,
    canViewTeam,
    canViewReports,
    canViewFinancials: canViewAllFinancials,
  });

  const isActive = (path: string | null) => {
    if (!path) return false;
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: typeof mainNavItems[0], index: number) => {
    if (index === 2) {
      setCreateModalOpen(true);
    } else if (index === 4) {
      setMenuOpen(true);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleMenuItemClick = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };


  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-[72px] px-4">
          {mainNavItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            // FAB Button (center)
            if (index === 2) {
              return (
                <button
                  key="fab"
                  onClick={() => handleNavClick(item, index)}
                  className="relative -mt-6 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform z-10"
                  aria-label="Criar projeto"
                >
                  <Plus className="h-7 w-7" />
                </button>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item, index)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-label={item.label}
              >
                <div className="relative">
                  {Icon && <Icon className={cn("h-6 w-6", active && "stroke-[2.5px]")} />}
                  {/* Unread badge for Chat */}
                  {item.label === 'Chat' && totalUnread > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1.5 -right-2.5 h-5 min-w-5 px-1 text-[10px] font-bold"
                    >
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  active && "font-semibold"
                )}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute bottom-1 h-1 w-8 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Full Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 z-[60]">
          <SheetHeader className="px-5 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold">Menu</SheetTitle>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(85vh-88px)] px-5">
            <div className="space-y-6 pb-8">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleMenuItemClick(item.path)}
                          className={cn(
                            'flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]',
                            active
                              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                              : 'bg-muted/50 hover:bg-muted'
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Separator className="mt-6" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Create Project Modal */}
      <CreateProjectModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
        onSuccess={() => setCreateModalOpen(false)}
      />
    </>
  );
}
