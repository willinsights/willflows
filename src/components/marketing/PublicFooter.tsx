import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import logoLight from '@/assets/logo-willflow.png';
import logoDark from '@/assets/logo-willflow-white.png';

const footerLinks = {
  produto: [
    { label: 'Funcionalidades', href: '/funcionalidades' },
    { label: 'Planos & Preços', href: '/planos' },
    { label: 'Integrações', href: '/integracoes' },
  ],
  recursos: [
    { label: 'Ajuda & FAQ', href: '/ajuda' },
    { label: 'Segurança', href: '/seguranca' },
  ],
  legal: [
    { label: 'Termos de Uso', href: '/termos' },
    { label: 'Privacidade', href: '/privacidade' },
    { label: 'Cookies', href: '/cookies' },
  ],
};

export function PublicFooter() {
  const { theme } = useTheme();
  const logo = theme === 'dark' ? logoDark : logoLight;

  return (
    <footer className="py-16 px-4 border-t border-border bg-muted/30">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src={logo} alt="WillFlow" className="h-10 object-contain mb-4" />
            <p className="text-sm text-muted-foreground max-w-xs">
              O CRM + Kanban feito para produção de Foto e Vídeo. Gerencie projetos desde a captação até a entrega.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-2">
              {footerLinks.produto.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-2">
              {footerLinks.recursos.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} WillFlow. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Made for creators 🎬
          </p>
        </div>
      </div>
    </footer>
  );
}
