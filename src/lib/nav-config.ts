/**
 * Shared navigation configuration for both desktop sidebar and mobile menu.
 *
 * Any change to what appears in the menu (labels, icons, routes, permission
 * gates) MUST happen here — the desktop (AppSidebar) and mobile
 * (MobileBottomNav) renderers only differ in presentation, not in data.
 */
import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Target,
  Users,
  FileText,
  Video,
  Film,
  CheckCircle2,
  Upload,
  Euro,
  CreditCard,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  Crown,
  Shield,
} from 'lucide-react';

export type PermissionKey =
  | 'visibility.leads'
  | 'clients.view'
  | 'visibility.contracts'
  | 'team.view'
  | 'reports.view'
  | 'financials.view';

export interface NavItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path: string;
  adminOnly?: boolean;
  permissionKey?: PermissionKey;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'VISÃO GERAL',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/app' },
      { icon: MessageSquare, label: 'Chat', path: '/app/chat' },
      { icon: Calendar, label: 'Calendário', path: '/app/calendario' },
    ],
  },
  {
    title: 'COMERCIAL',
    items: [
      { icon: Target, label: 'Leads', path: '/app/leads', permissionKey: 'visibility.leads' },
      { icon: Users, label: 'Clientes', path: '/app/clientes', permissionKey: 'clients.view' },
      { icon: FileText, label: 'Contratos', path: '/app/contratos', permissionKey: 'visibility.contracts' },
    ],
  },
  {
    title: 'PRODUÇÃO',
    items: [
      { icon: Video, label: 'Captação', path: '/app/captacao' },
      { icon: Film, label: 'Edição', path: '/app/edicao' },
      { icon: CheckCircle2, label: 'Finalizados', path: '/app/finalizados' },
      { icon: Upload, label: 'Media', path: '/app/media' },
    ],
  },
  {
    title: 'FINANÇAS',
    items: [
      { icon: Euro, label: 'Finanças', path: '/app/financeiro', permissionKey: 'financials.view' },
      { icon: CreditCard, label: 'Pagamentos', path: '/app/pagamentos', permissionKey: 'financials.view' },
      { icon: Receipt, label: 'Faturação', path: '/app/faturacao', permissionKey: 'reports.view' },
      { icon: BarChart3, label: 'Relatórios', path: '/app/relatorios', permissionKey: 'reports.view' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { icon: UserCog, label: 'Equipa', path: '/app/equipa', permissionKey: 'team.view' },
      { icon: Settings, label: 'Configurações', path: '/app/configuracoes' },
      { icon: Crown, label: 'Planos', path: '/app/planos', adminOnly: true },
    ],
  },
];

export const superAdminSection: NavSection = {
  title: 'ADMIN',
  items: [
    { icon: Shield, label: 'Super Admin', path: '/admin/dashboard' },
  ],
};

/**
 * Resolves whether an item should be visible given the current user's flags.
 * Both desktop and mobile menus MUST use this — they cannot diverge.
 */
export interface NavPermissionFlags {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  canViewLeads: boolean;
  canViewClients: boolean;
  canViewContracts: boolean;
  canViewTeam: boolean;
  canViewReports: boolean;
  /** Access to financial hub. Fallback: reports.view. */
  canViewFinancials?: boolean;
}

export function isItemVisible(item: NavItem, flags: NavPermissionFlags): boolean {
  if (item.adminOnly && !flags.isAdmin) return false;
  if (!item.permissionKey) return true;
  switch (item.permissionKey) {
    case 'visibility.leads':
      return flags.canViewLeads;
    case 'clients.view':
      return flags.canViewClients;
    case 'visibility.contracts':
      return flags.canViewContracts;
    case 'team.view':
      return flags.canViewTeam;
    case 'reports.view':
      return flags.canViewReports;
    case 'financials.view':
      return flags.canViewFinancials ?? flags.canViewReports;
    default:
      return true;
  }
}

export function filterSections(
  sections: NavSection[],
  flags: NavPermissionFlags,
): NavSection[] {
  return sections
    .map(s => ({ ...s, items: s.items.filter(i => isItemVisible(i, flags)) }))
    .filter(s => s.items.length > 0);
}
