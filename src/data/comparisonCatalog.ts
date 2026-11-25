import type { ReleaseKind } from '@/components/marketing/ReleaseBadge';

/**
 * Verified WillFlow public feature catalogue used by every comparison page.
 * WillFlow availability comes from src/lib/plans.ts; release tags from the 2.0 changelog.
 * Competitor values describe native capability as publicly documented; verify date below.
 */
export const COMPARISON_VERIFIED_AT = '25/11/2026';

export type Competitor = 'trello' | 'asana' | 'clickup';
/** yes = nativo; partial = parcial / plano superior; integration = via integração ou power-up; no = não nativo; unknown = não confirmado */
export type CompetitorStatus = 'yes' | 'partial' | 'integration' | 'no' | 'unknown';

export const COMPETITOR_NAMES: Record<Competitor, string> = { trello: 'Trello', asana: 'Asana', clickup: 'ClickUp' };

export const PHOTO_STUDIO_NEW = ['Galerias de fotografia para o cliente','Seleção de favoritas com limite','Comentários num ponto da foto','Entrega em alta resolução com marca de água opcional','Venda de fotos extra'];

export interface CatalogFeature {
  name: string;
  detail: string;
  release?: Exclude<ReleaseKind, 'versao'>;
  plans: 'Todos os planos' | 'Pro e Studio' | 'Studio';
  href?: string;
  competitors: Record<Competitor, CompetitorStatus>;
}

export interface CatalogCategory { title: string; features: CatalogFeature[] }

export const COMPARISON_CATALOG: CatalogCategory[] = [
  {
    title: 'Produção e dia a dia',
    features: [
      { name: 'Quadro por fases de produção', detail: 'Captação, edição e entrega já pensadas para foto e vídeo.', plans: 'Todos os planos', href: '/funcionalidades/kanban', competitors: { trello: 'partial', asana: 'partial', clickup: 'partial' } },
      { name: 'Ecrã Hoje', detail: 'Gravações, sessões, prazos e pagamentos do dia num só ecrã.', release: 'novo', plans: 'Todos os planos', competitors: { trello: 'no', asana: 'partial', clickup: 'partial' } },
      { name: 'Automações ao mudar de coluna', detail: 'Avisos e emails enviados uma vez, com nova tentativa se falhar.', release: 'melhorado', plans: 'Studio', competitors: { trello: 'yes', asana: 'yes', clickup: 'yes' } },
      { name: 'Tarefas e checklists por projeto', detail: 'Listas de passos dentro de cada cartão.', plans: 'Todos os planos', competitors: { trello: 'yes', asana: 'yes', clickup: 'yes' } },
      { name: 'Calendário com Google Calendar', detail: 'Sessões e gravações sincronizadas com o Google.', plans: 'Todos os planos', href: '/funcionalidades/calendario', competitors: { trello: 'integration', asana: 'yes', clickup: 'yes' } },
    ],
  },
  {
    title: 'Entrega ao cliente',
    features: [
      { name: 'Aprovação de vídeo por link, sem conta', detail: 'O cliente comenta no momento exato e aprova; o link mostra a marca do seu estúdio.', release: 'melhorado', plans: 'Studio', href: '/funcionalidades/video-approval', competitors: { trello: 'no', asana: 'partial', clickup: 'partial' } },
      { name: 'Comparação A/B de versões', detail: 'Duas versões do vídeo lado a lado.', plans: 'Studio', href: '/funcionalidades/video-approval', competitors: { trello: 'no', asana: 'unknown', clickup: 'unknown' } },
      { name: 'Desenho de Timeline para edição', detail: 'Estrutura de segmentos para orientar o editor.', plans: 'Studio', href: '/funcionalidades/timeline', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Galerias de fotografia para o cliente', detail: 'Link externo com validade opcional.', release: 'novo', plans: 'Studio', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Seleção de favoritas com limite', detail: 'O cliente escolhe até ao número combinado.', release: 'novo', plans: 'Studio', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Comentários num ponto da foto', detail: 'Pedidos de retoque marcados no sítio certo.', release: 'novo', plans: 'Studio', competitors: { trello: 'no', asana: 'partial', clickup: 'partial' } },
      { name: 'Entrega em alta resolução com marca d\'água opcional', detail: 'Ficheiros finais na mesma galeria.', release: 'novo', plans: 'Studio', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Venda de fotos extra', detail: 'Extras somados ao valor do projeto.', release: 'novo', plans: 'Studio', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Lista de fotos obrigatórias por sessão', detail: 'Shot list com modelos reutilizáveis.', release: 'novo', plans: 'Studio', competitors: { trello: 'partial', asana: 'partial', clickup: 'partial' } },
    ],
  },
  {
    title: 'Clientes e finanças',
    features: [
      { name: 'Clientes com histórico de projetos', detail: 'Contactos, projetos e valores por cliente.', plans: 'Todos os planos', href: '/funcionalidades/crm', competitors: { trello: 'integration', asana: 'partial', clickup: 'partial' } },
      { name: 'Recebimentos de clientes', detail: 'O que falta receber e o que já entrou.', plans: 'Todos os planos', href: '/funcionalidades/pagamentos', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Pagamentos a freelancers', detail: 'Quanto deve a cada colaborador, por projeto.', plans: 'Todos os planos', href: '/funcionalidades/pagamentos', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Lucro por projeto', detail: 'Valor acordado menos equipa e custos extra.', plans: 'Todos os planos', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Relatórios de receita, custos e clientes', detail: 'Cartões alinhados e rentabilidade de todos os clientes.', release: 'melhorado', plans: 'Todos os planos', href: '/funcionalidades/relatorios', competitors: { trello: 'no', asana: 'partial', clickup: 'partial' } },
      { name: 'Exportação Excel e PDF', detail: 'Relatórios para contabilidade.', plans: 'Pro e Studio', competitors: { trello: 'partial', asana: 'partial', clickup: 'partial' } },
    ],
  },
  {
    title: 'Equipa',
    features: [
      { name: 'Chat interno da equipa', detail: 'Conversas ligadas ao estúdio.', plans: 'Pro e Studio', href: '/funcionalidades/chat', competitors: { trello: 'no', asana: 'partial', clickup: 'yes' } },
      { name: 'Funções por pessoa', detail: 'Administrador, Gestão, Captação, Edição e Visualização.', plans: 'Todos os planos', competitors: { trello: 'partial', asana: 'yes', clickup: 'yes' } },
      { name: 'Colaborador vê só o próprio valor', detail: 'Cada pessoa vê apenas quanto vai receber.', plans: 'Todos os planos', competitors: { trello: 'no', asana: 'no', clickup: 'no' } },
      { name: 'Interface em português', detail: 'Português de Portugal e do Brasil.', plans: 'Todos os planos', competitors: { trello: 'yes', asana: 'yes', clickup: 'yes' } },
    ],
  },
];

export const ALL_CATALOG_FEATURES = COMPARISON_CATALOG.flatMap((c) => c.features);
