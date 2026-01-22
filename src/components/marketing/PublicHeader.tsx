import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Menu, X, ChevronDown, Camera, Video, Scale, Building2, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useTheme } from '@/contexts/ThemeContext';
import { isBetaModeEnabled } from '@/contexts/BetaContext';
import { trackCtaClick } from '@/lib/google-ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navLinks = [
  { label: 'Funcionalidades', href: '/funcionalidades' },
  { label: 'Planos', href: '/planos' },
  { label: 'Blog', href: '/blog' },
  { label: 'Ajuda', href: '/ajuda' },
];

const solutionsLinks = [
  { label: 'Para Fotógrafos', href: '/para-fotografos', icon: Camera },
  { label: 'Para Videomakers', href: '/para-videomakers', icon: Video },
  { label: 'Para Agências', href: '/para-agencias', icon: Building2 },
  { label: 'Para Produtoras', href: '/para-produtoras', icon: Film },
];

const comparisonLinks = [
  { label: 'WillFlow vs Asana', href: '/vs/asana' },
  { label: 'WillFlow vs ClickUp', href: '/vs/clickup' },
  { label: 'WillFlow vs Trello', href: '/vs/trello' },
];

export function PublicHeader() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isBetaMode = isBetaModeEnabled();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <Logo className="h-10" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? 'text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Solutions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  solutionsLinks.some(s => location.pathname === s.href)
                    ? 'text-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Soluções
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              {solutionsLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link to={link.href} className="flex items-center gap-2">
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Comparisons Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  comparisonLinks.some(c => location.pathname === c.href) || location.pathname === '/vs'
                    ? 'text-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Comparações
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              {comparisonLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link to={link.href} className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden sm:flex">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Link to="/auth" className="hidden sm:block">
            <Button variant="ghost">Entrar</Button>
          </Link>
          
          {/* Only show signup CTA if NOT in beta mode */}
          {!isBetaMode && (
            <Link to="/auth?trial=true" className="hidden sm:block" onClick={() => trackCtaClick('header')}>
              <Button className="gradient-primary">
                Começar teste grátis
              </Button>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border bg-background"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.href
                      ? 'text-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Solutions section in mobile */}
              <div className="pt-2 pb-2">
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Soluções</p>
                {solutionsLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === link.href
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
              
              {/* Comparisons section in mobile */}
              <div className="pt-2 pb-2">
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comparações</p>
                {comparisonLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === link.href
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Scale className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
              
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm text-muted-foreground">Tema</span>
                  <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </div>
                
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Entrar</Button>
                </Link>
                
                {/* Only show signup CTA if NOT in beta mode */}
                {!isBetaMode && (
                  <Link to="/auth?trial=true" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full gradient-primary">
                      Começar teste grátis
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
