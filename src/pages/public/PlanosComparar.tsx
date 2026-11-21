import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Check, X, ArrowRight, ArrowLeft, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePlanCheckout } from '@/hooks/usePlanCheckout';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { Link } from 'react-router-dom';
import {
  PLANS,
  PLAN_ORDER,
  getDisplayPrice,
  getYearlyTotal,
  getCurrencySymbol,
  getPriceId,
  type PlanId,
  type Currency,
} from '@/lib/plans';

const planComparisonHighlights: Record<PlanId, { audience: string; featureKeys: string[] }> = {
  starter: {
    audience: 'Para profissionais independentes: organize projetos, clientes e finanças.',
    featureKeys: ['kanban', 'crmBasic', 'financialReports'],
  },
  pro: {
    audience: 'Para equipes em crescimento: acrescente comunicação, exportações e integrações.',
    featureKeys: ['chat', 'exportExcel', 'googleCalendar', 'reportsAdvanced'],
  },
  studio: {
    audience: 'Para agências e produtoras: todos os recursos do Pro, mais revisão de vídeo e automações.',
    featureKeys: ['videoApproval', 'videoStorage', 'automations', 'permissions'],
  },
};

// Feature categories for organized display
const featureCategories = [
  {
    name: 'Limites',
    features: [
      { key: 'workspaces', label: 'Workspaces', tooltip: 'Espaços de trabalho separados para diferentes empresas ou projetos' },
      { key: 'users', label: 'Utilizadores', tooltip: 'Número de membros que podem aceder ao workspace' },
      { key: 'projects', label: 'Projetos ativos', tooltip: 'Projetos em andamento simultaneamente' },
    ],
  },
  {
    name: 'Funcionalidades Core',
    features: [
      { key: 'kanban', label: 'Kanban Visual', tooltip: 'Quadro visual para gerir fases do projeto (Captação → Edição → Finalizados)' },
      { key: 'crm', label: 'CRM Integrado', tooltip: 'Gestão de clientes, leads e contactos' },
      { key: 'calendar', label: 'Calendário', tooltip: 'Visualização de eventos, sessões e deadlines' },
      { key: 'mediaHub', label: 'Media Hub', tooltip: 'Gestão centralizada de links de media por projeto' },
      { key: 'financialReports', label: 'Relatórios Financeiros', tooltip: 'Análise de receitas, custos e margens' },
    ],
  },
  {
    name: 'Produtividade',
    features: [
      { key: 'exportExcel', label: 'Export Excel', tooltip: 'Exportar dados para folhas de cálculo' },
      { key: 'exportPdf', label: 'Export PDF', tooltip: 'Gerar relatórios e documentos em PDF' },
      { key: 'chat', label: 'Chat da Equipa', tooltip: 'Comunicação interna com canais por projeto' },
      { key: 'googleCalendar', label: 'Google Calendar + Meet', tooltip: 'Sincronização bidirecional e criação automática de reuniões' },
      { key: 'reportsAdvanced', label: 'Relatórios Avançados', tooltip: 'Dashboards detalhados e análises de performance' },
    ],
  },
  {
    name: 'Exclusivo Studio',
    features: [
      { key: 'videoApproval', label: 'Aprovação de Vídeo + A/B', tooltip: 'Portal de review com comentários por timecode e comparação de versões' },
      { key: 'timeline', label: 'Desenho de Timeline', tooltip: 'Estrutura visual para planear a edição de vídeo' },
      { key: 'videoStorage', label: 'Armazenamento de Vídeo', tooltip: '10 GB incluídos, com opção de expansão' },
      { key: 'automations', label: 'Automações', tooltip: 'Fluxos de trabalho automatizados' },
      { key: 'permissions', label: 'Permissões Avançadas', tooltip: 'Controlo granular de permissões por função' },
    ],
  },
];

// Get feature value for each plan
function getFeatureValue(planId: PlanId, featureKey: string): string | boolean {
  const plan = PLANS[planId];
  
  // Handle limit features
  if (featureKey === 'workspaces') return plan.limitsDisplay.workspaces;
  if (featureKey === 'users') return plan.limitsDisplay.users;
  if (featureKey === 'projects') return plan.limitsDisplay.projects;
  
  // Handle CRM which maps to crmBasic/crmComplete in plans config
  if (featureKey === 'crm') {
    const complete = plan.features.find(f => f.key === 'crmComplete');
    if (complete?.included) return true;
    const basic = plan.features.find(f => f.key === 'crmBasic');
    return basic?.included ?? false;
  }
  
  // Handle regular features
  const feature = plan.features.find(f => f.key === featureKey);
  if (!feature) return false;
  
  if (typeof feature.value === 'string') return feature.value;
  
  return feature.included;
}

export default function PlanosComparar() {
  const { user } = useAuth();
  const { currentWorkspace, isAdmin } = useWorkspace();
  const { checkout } = usePlanCheckout();
  const navigate = useNavigate();

  const [showBRL, setShowBRL] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currency: Currency = showBRL ? 'brl' : 'eur';
  const interval = isAnnual ? 'yearly' : 'monthly';
  const currencySymbol = getCurrencySymbol(currency);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!user) {
      navigate(`/auth?plan=${planId}&currency=${currency}&interval=${interval}`);
      return;
    }

    // O plano pertence à conta. Só o administrador do workspace atual compra
    // «para o workspace»; sem workspace, ou como convidado, a compra é para a conta.
    setLoadingPlan(planId);
    try {
      await checkout({
        priceId: getPriceId(planId, currency, interval),
        workspaceId: currentWorkspace && isAdmin ? currentWorkspace.id : undefined,
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Starter vs Pro vs Studio: compare planos e preços | WillFlow</title>
        <meta
          name="description"
          content="Compare os planos WillFlow: Starter para organizar projetos; Pro com chat, Excel e Google Calendar; Studio com aprovação de vídeo e automações. Veja preços."
        />
        <link rel="canonical" href="https://willflow.app/planos/comparar" />
        <meta property="og:title" content="Starter vs Pro vs Studio: compare planos e preços | WillFlow" />
        <meta property="og:description" content="Compare os planos WillFlow: Starter para organizar projetos; Pro com chat, Excel e Google Calendar; Studio com aprovação de vídeo e automações. Veja preços." />
        <meta property="og:url" content="https://willflow.app/planos/comparar" />
      </Helmet>
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/planos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-4 w-4" />
              Voltar aos planos
            </Link>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Starter vs Pro vs Studio: <span className="gradient-text">compare os planos</span> WillFlow
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Starter para organizar o trabalho. Pro para colaborar com a equipe.
              Studio para aprovar vídeos e automatizar a produção.
            </p>

            {/* Toggles */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm">
                <span className={`text-sm font-medium ${!showBRL ? 'text-foreground' : 'text-muted-foreground'}`}>
                  🇵🇹 EUR
                </span>
                <Switch checked={showBRL} onCheckedChange={setShowBRL} aria-label="Mostrar preços em reais" />
                <span className={`text-sm font-medium ${showBRL ? 'text-foreground' : 'text-muted-foreground'}`}>
                  🇧🇷 BRL
                </span>
              </div>

              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm">
                <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Mensal
                </span>
                <Switch checked={isAnnual} onCheckedChange={setIsAnnual} aria-label="Mostrar cobrança anual" />
                <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Anual
                </span>
                {isAnnual && (
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    −20%
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section aria-label="Principais diferenças entre os planos" className="px-4 pb-12">
        <div className="container mx-auto max-w-6xl grid gap-8 md:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const highlights = planComparisonHighlights[planId];
            return (
              <div key={planId} className="border-t border-border pt-6 min-w-0">
                <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
                <p className="text-lg font-semibold mb-3">
                  {currencySymbol}{getDisplayPrice(planId, currency, interval)}/mês
                  {isAnnual && (
                    <span className="block text-sm font-normal text-muted-foreground">
                      {currencySymbol}{getYearlyTotal(planId, currency)}/ano · cobrança anual
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mb-4">{highlights.audience}</p>
                <p className="text-sm mb-4">
                  {plan.limitsDisplay.workspaces} · {plan.limitsDisplay.users}
                  {planId === 'starter' && ` · ${plan.limitsDisplay.projects}`}
                </p>
                <ul className="space-y-2">
                  {highlights.featureKeys.map((key) => {
                    const feature = plan.features.find((item) => item.key === key && item.included);
                    if (!feature) return null;
                    return (
                      <li key={key} className="flex items-start gap-2 text-sm">
                        <Check aria-hidden="true" className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                        <span>{feature.name}{typeof feature.value === 'string' ? ` (${feature.value})` : ''}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-3">Compare recursos, limites e preços lado a lado</h2>
          <p className="text-muted-foreground mb-6">
            Kanban, CRM, calendário e relatórios financeiros estão nos três planos.
            Chat, exportações Excel e PDF e Google Calendar entram no Pro e no Studio.
            Aprovação de vídeo, timeline e automações são exclusivos do Studio.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
            <table className="w-full min-w-[800px]">
              {/* Header with plan names and prices */}
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-6 px-6 w-1/4">
                    <span className="text-lg font-semibold">Funcionalidade</span>
                  </th>
                  {PLAN_ORDER.map((planId) => {
                    const plan = PLANS[planId];
                    return (
                      <th key={planId} className={`text-center py-6 px-4 ${plan.popular ? 'bg-primary/5' : ''}`}>
                        <div className="space-y-2">
                          {plan.popular && (
                            <Badge className="gradient-primary mb-2">Recomendado</Badge>
                          )}
                          <p className={`text-lg font-bold ${plan.popular ? 'gradient-text' : ''}`}>
                            {plan.name}
                          </p>
                          <p className="text-2xl font-bold">
                            {currencySymbol}{getDisplayPrice(planId, currency, interval)}
                            <span className="text-sm font-normal text-muted-foreground">/mês</span>
                          </p>
                          {isAnnual && (
                            <p className="text-xs text-muted-foreground">
                              {currencySymbol}{getYearlyTotal(planId, currency)}/ano
                            </p>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {featureCategories.map((category, catIndex) => (
                  <Fragment key={category.name}>
                    {/* Category header */}
                    <tr key={`cat-${catIndex}`} className="bg-muted/30">
                      <td colSpan={4} className="py-3 px-6">
                        <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                          {category.name}
                        </span>
                      </td>
                    </tr>
                    {/* Features in category */}
                    {category.features.map((feature, featureIndex) => (
                      <tr
                        key={feature.key}
                        className={`border-b border-border/30 ${featureIndex % 2 === 0 ? '' : 'bg-muted/10'}`}
                      >
                        <td className="py-4 px-6">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm flex items-center gap-2 cursor-help">
                                  {feature.label}
                                  <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{feature.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        {PLAN_ORDER.map((planId) => {
                          const value = getFeatureValue(planId, feature.key);
                          const plan = PLANS[planId];
                          return (
                            <td
                              key={planId}
                              className={`text-center py-4 px-4 ${plan.popular ? 'bg-primary/5' : ''}`}
                            >
                              {typeof value === 'string' ? (
                                <span className="text-sm font-medium">{value}</span>
                              ) : value ? (
                                <Check className="h-5 w-5 text-success mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>

              {/* Footer with CTAs */}
              <tfoot>
                <tr className="border-t border-border">
                  <td className="py-6 px-6"></td>
                  {PLAN_ORDER.map((planId) => {
                    const plan = PLANS[planId];
                    return (
                      <td key={planId} className={`text-center py-6 px-4 ${plan.popular ? 'bg-primary/5' : ''}`}>
                        <Button
                          className={`w-full max-w-[180px] ${plan.popular ? 'gradient-primary' : ''}`}
                          variant={plan.popular ? 'default' : 'outline'}
                          onClick={() => handleSelectPlan(planId)}
                          disabled={loadingPlan === planId}
                        >
                          {loadingPlan === planId ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {user ? 'Subscrever' : 'Começar grátis'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-sm text-muted-foreground mt-8"
          >
            <strong>7 dias grátis · Sem cartão</strong>.
            Cancele a qualquer momento sem compromisso.
          </motion.p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
