import { NavLink, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import logoWillflow from '@/assets/logo-willflow.png';

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
      { icon: FolderKanban, label: 'Projetos', path: '/app/projetos' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { icon: Users, label: 'Clientes', path: '/app/clientes' },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { icon: Settings, label: 'Configurações', path: '/app/configuracoes' },
    ],
  },
];

export function AppSidebar({ collapsed, onToggle, isMobile }: AppSidebarProps) {
  const location = useLocation();

  const NavItem = ({ item }: { item: NavSection['items'][0] }) => {
    const isActive = location.pathname === item.path || 
                     (item.path !== '/app' && location.pathname.startsWith(item.path));
    
    const content = (
      <NavLink
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive && 'bg-primary/10 text-primary font-medium',
          collapsed && !isMobile && 'justify-center px-2'
        )}
      >
        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
        {(!collapsed || isMobile) && (
          <span className="truncate">{item.label}</span>
        )}
      </NavLink>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        collapsed && !isMobile ? 'justify-center' : 'justify-between'
      )}>
        <div className="flex items-center gap-2">
          <img 
            src={logoWillflow} 
            alt="WillFlow" 
            className={cn(
              'h-8 object-contain',
              collapsed && !isMobile ? 'h-7' : 'h-8'
            )} 
          />
          {(!collapsed || isMobile) && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-lg text-foreground"
            >
              WillFlow
            </motion.span>
          )}
        </div>
        
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
          {navSections.map((section) => (
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
                {section.items.map((item) => (
                  <NavItem key={item.path} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

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
