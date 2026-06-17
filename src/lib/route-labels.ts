// Centralised route label map used by breadcrumbs and document.title.
// Keys are the URL slugs (segments after /app/...).
export const routeLabels: Record<string, string> = {
  app: 'Dashboard',
  dashboard: 'Dashboard',
  projetos: 'Projetos',
  captacao: 'Captação',
  edicao: 'Edição',
  finalizados: 'Finalizados',
  media: 'Media',
  clientes: 'Clientes',
  leads: 'Leads',
  contratos: 'Contratos',
  calendario: 'Calendário',
  chat: 'Chat',
  equipa: 'Equipa',
  pagamentos: 'Pagamentos',
  faturacao: 'Faturação',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
  planos: 'Planos',
  conta: 'Conta',
  preferencias: 'Preferências',
  workspace: 'Workspace',
  integracoes: 'Integrações',
  notificacoes: 'Notificações',
  geral: 'Geral',
  ajuda: 'Ajuda',
  tutorial: 'Tutorial',
  beta: 'Beta',
  feedback: 'Feedback',
  // Finanças
  financeiro: 'Finanças',
  receitas: 'Receitas',
  custos: 'Custos',
  'custos-extras': 'Custos Extras',
  lucro: 'Lucro',
};

/** Fallback: capitalise a slug and replace dashes with spaces. */
export function labelFromSegment(segment: string): string {
  return routeLabels[segment]
    ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}
