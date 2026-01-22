import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings,
  LogOut,
  Loader2,
  ChevronRight,
  ExternalLink,
  BarChart3,
  FileText,
  Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminSession } from '@/hooks/useAdminSession';
import logoWhite from '@/assets/logo-willflow-white.png';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { path: '/admin/analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { path: '/admin/content', label: 'Conteúdo', icon: <FileText className="h-5 w-5" /> },
  { path: '/admin/users', label: 'Utilizadores', icon: <Users className="h-5 w-5" /> },
  { path: '/admin/billing', label: 'Billing', icon: <CreditCard className="h-5 w-5" /> },
  { path: '/admin/growth', label: 'Growth', icon: <Rocket className="h-5 w-5" /> },
  { path: '/admin/system', label: 'Sistema', icon: <Settings className="h-5 w-5" /> },
];

export default function AdminLayout() {
  const { user, isSuperAdmin, loading, signOut } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if not authenticated or not super admin
  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      navigate('/admin');
    }
  }, [loading, user, isSuperAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'AD';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <img 
            src={logoWhite} 
            alt="WillFlow" 
            className="h-7 dark:block hidden"
          />
          <img 
            src={logoWhite} 
            alt="WillFlow" 
            className="h-7 dark:hidden block invert"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Admin</span>
          </div>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {item.icon}
                  {item.label}
                  {isActive && (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* User section */}
        <div className="p-4 space-y-3">
          <a 
            href="/" 
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Site
          </a>
          
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Super Admin
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sair</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-screen">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            <Outlet />
          </motion.div>
        </ScrollArea>
      </main>
    </div>
  );
}
