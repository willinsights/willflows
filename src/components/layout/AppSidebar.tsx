import type React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Video,
  Film,
  CheckCircle2,
  FolderKanban,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Euro,
  Upload,
  Tags,
  UserCog,
  Receipt,
  Shield,
  MessageSquarePlus,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/ui/logo';
import { TrialBadge } from '@/components/dashboard/TrialBadge';
import { isBetaModeEnabled } from '@/contexts/BetaContext';
import { useAuth } from '@/contexts/AuthContext';

const SUPER_ADMIN_EMAIL = 'willdesign7@gmail.com';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

interface NavSection {
  title: string;
  items: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    path: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: 'VISÃO GERAL',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/app' },
    ],
  },
  {
    title: 'PROJETOS',
    items: [
      { icon: Video, label: 'Captação', path: '/app/captacao' },
      { icon: Film, label: 'Edição', path: '/app/edicao' },
      { icon: CheckCircle2, label: 'Finalizados', path: '/app/finalizados' },
    ],
  },
  {
    title: 'FINANÇAS',
    items: [
      { icon: Euro, label: 'Pagamentos', path: '/app/pagamentos' },
      { icon: BarChart3, label: 'Relatórios', path: '/app/relatorios' },
    ],
  },
  {
    title: 'FERRAMENTAS',
    items: [
      { icon: Calendar, label: 'Calendário', path: '/app/calendario' },
      { icon: Upload, label: 'Media', path: '/app/media' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { icon: Users, label: 'Clientes', path: '/app/clientes' },
      { icon: UserCog, label: 'Equipa', path: '/app/equipa' },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { icon: Settings, label: 'Configurações', path: '/app/configuracoes' },
{ icon: Crown, label: 'Planos', path: '/app/planos' },
    ],
  },
];

// Beta admin section - only shown when beta mode is enabled
const betaSection: NavSection = {
  title: 'ADMIN',
  items: [
    { icon: Shield, label: 'Gestão Beta', path: '/app/beta-admin' },
    { icon: MessageSquarePlus, label: 'Feedback', path: '/app/feedback' },
  ],
};

export function AppSidebar({ collapsed, onToggle, isMobile }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBetaMode = isBetaModeEnabled();
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  // Add beta section only if in beta mode AND user is super admin
  const sections = (isBetaMode && isSuperAdmin) ? [...navSections, betaSection] : navSections;

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
              collapsed && !isMobile ? 'h-8' : 'h-10'
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
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              {/* Section Title */}
              {(!collapsed || isMobile) && (
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
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={collapsed && !isMobile ? item.label : undefined}
                      aria-label={collapsed && !isMobile ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        collapsed && !isMobile && 'justify-center px-2',
                        active && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary')} />
                      {(!collapsed || isMobile) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Trial Badge */}
      <div className="px-3 pb-2">
        {collapsed && !isMobile ? (
          <TrialBadge variant="compact" />
        ) : (
          <TrialBadge variant="full" className="w-full justify-center" />
        )}
      </div>

      {/* Collapse Button (desktop only) */}
      {!isMobile && collapsed && (
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full h-10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
