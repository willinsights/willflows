import type React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
} from 'lucide-react';
import { useTotalUnreadMessages } from '@/hooks/useTotalUnreadMessages';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/ui/logo';
import { TrialBadge } from '@/components/dashboard/TrialBadge';
import { StorageWarningBadge } from '@/components/layout/StorageWarningBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import {
  navSections,
  superAdminSection,
  filterSections,
} from '@/lib/nav-config';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  autoCollapseOnNav?: boolean;
}

export function AppSidebar({ collapsed, onToggle, isMobile, autoCollapseOnNav = true }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  useAuth();
  const { isAdmin } = useWorkspace();
  const { isSuperAdmin } = useSuperAdmin();
  const { totalUnread } = useTotalUnreadMessages();
  const {
    canViewLeads,
    canViewClients,
    canViewContracts,
    canViewTeam,
    canViewReports,
    canViewAllFinancials,
  } = useFinancialPermissions();

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


  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        collapsed && !isMobile ? 'justify-center' : 'justify-between'
      )}>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className={cn(
            'rounded-md focus-ring',
            collapsed && !isMobile ? '' : '-ml-1'
          )}
          aria-label="Ir para o Dashboard"
        >
          <Logo 
            iconOnly={collapsed && !isMobile}
            className={cn(
              'cursor-pointer',
              collapsed && !isMobile ? 'h-8' : 'h-7'
            )} 
          />
        </button>
        
        
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('h-8 w-8', collapsed && 'hidden')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea hideScrollbar className="flex-1 py-4">
        <nav className={cn('px-3', collapsed && !isMobile ? 'space-y-1' : 'space-y-6')}>
          {sections.map((section, sectionIndex) => (
            <div key={section.title}>
              {/* Section Title (expanded) or Separator (collapsed) */}
              {collapsed && !isMobile ? (
                sectionIndex > 0 && (
                  <Separator className="my-2 mx-auto w-2/3 opacity-40" />
                )
              ) : (
                <div className="px-3 mb-2">
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                    {section.title}
                  </span>
                </div>
              )}
              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  const isChat = item.path === '/app/chat';
                  const showBadge = isChat && totalUnread > 0;
                  
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={collapsed && !isMobile ? item.label : undefined}
                      aria-label={collapsed && !isMobile ? item.label : undefined}
                      onClick={() => !isMobile && !collapsed && autoCollapseOnNav && onToggle()}
                      className={cn(
                        'relative group',
                        collapsed && !isMobile 
                          ? 'flex items-center justify-center px-1 py-2.5 rounded-lg transition-all duration-200'
                          : 'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        active && 'bg-primary/10 text-primary font-medium shadow-sm'
                      )}
                    >
                      {/* Active indicator bar */}
                      {active && !collapsed && !isMobile && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <item.icon className={cn('flex-shrink-0 h-5 w-5 transition-colors', active && 'text-primary')} />
                      {collapsed && !isMobile ? null : (
                        <>
                          <span className="truncate">{item.label}</span>
                          {/* Badge for chat unread messages - expanded sidebar */}
                          <AnimatePresence>
                            {showBadge && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full"
                              >
                                {totalUnread > 99 ? '99+' : totalUnread}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                      {/* Badge for chat unread messages - collapsed sidebar */}
                      <AnimatePresence>
                        {showBadge && collapsed && !isMobile && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center bg-primary text-primary-foreground text-[8px] font-bold rounded-full"
                          >
                            {totalUnread > 9 ? '9+' : totalUnread}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Storage warning (>90%) */}
      <div className={cn('px-3 pb-2', collapsed && !isMobile && 'px-2')}>
        <StorageWarningBadge collapsed={collapsed && !isMobile} />
      </div>

      {/* Trial Badge */}
      <div className="px-3 pb-2">
        {collapsed && !isMobile ? (
          <TrialBadge variant="compact" />
        ) : (
          <TrialBadge variant="full" className="w-full justify-center" />
        )}
      </div>

      {/* Ver Site Link */}
      <div className={cn('px-3 pb-2', collapsed && !isMobile && 'px-2')}>
        <a
          href="https://willflows.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent',
            collapsed && !isMobile && 'justify-center px-2'
          )}
          title={collapsed && !isMobile ? 'Ver Site' : undefined}
        >
          <ExternalLink className="h-4 w-4 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Ver Site</span>}
        </a>
      </div>

      {/* Collapse Button (desktop only) */}
      {!isMobile && collapsed && (
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full h-8 hover:bg-primary/10 transition-all"
            title="Expandir menu"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
          </Button>
        </div>
      )}
    </div>
  );
}
