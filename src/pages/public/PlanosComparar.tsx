import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
      { key: 'kanban', label: 'Kanban Visual', tooltip: 'Quadro visual para gerir fases do projeto' },
      { key: 'crm', label: 'CRM Integrado', tooltip: 'Gestão completa de clientes e contactos' },
      { key: 'calendar', label: 'Calendário', tooltip: 'Visualização de eventos, sessões e deadlines' },
      { key: 'mediaHub', label: 'Media Hub', tooltip: 'Gestão centralizada de ficheiros multimédia' },
      { key: 'contracts', label: 'Contratos Digitais', tooltip: 'Criação e assinatura digital de contratos' },
      { key: 'financialReports', label: 'Relatórios Financeiros', tooltip: 'Análise de receitas, custos e margens' },
    ],
  },
  {
    name: 'Produtividade',
    features: [
      { key: 'exportExcel', label: 'Export Excel', tooltip: 'Exportar dados para folhas de cálculo' },
      { key: 'exportPdf', label: 'Export PDF', tooltip: 'Gerar relatórios e documentos em PDF' },
      { key: 'chat', label: 'Chat da Equipa', tooltip: 'Comunicação interna com a equipa' },
      { key: 'googleCalendar', label: 'Integração Google Calendar', tooltip: 'Sincronização bidirecional com Google Calendar' },
    ],
  },
  {
    name: 'Avançado (Studio)',
    features: [
      { key: 'videoApproval', label: 'Aprovação de Vídeo', tooltip: 'Sistema de review e aprovação de vídeos por clientes' },
      { key: 'videoStorage', label: 'Armazenamento de Vídeo', tooltip: 'Storage dedicado para ficheiros de vídeo' },
      { key: 'aiFeatures', label: 'Funcionalidades IA', tooltip: 'Geração automática de conteúdo com IA' },
      { key: 'apiAccess', label: 'Acesso API', tooltip: 'Integração com sistemas externos via API' },
    ],
  },
];

// Get feature value for each plan
function getFeatureValue(planId: PlanId, featureKey: string): string | boolean {
  const plan = PLANS[planId];
  
  // Handle limit features
  if (featureKey === 'workspaces') {
    return plan.limitsDisplay.workspaces;
  }
  if (featureKey === 'users') {
    return plan.limitsDisplay.users;
  }
  if (featureKey === 'projects') {
    return plan.limitsDisplay.projects;
  }
  
  // Handle regular features
  const feature = plan.features.find(f => f.key === featureKey);
  if (!feature) return false;
  
  if (typeof feature.value === 'string') {
    return feature.value;
  }
  
  return feature.included;
}

export default function PlanosComparar() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
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

    if (!currentWorkspace) {
      navigate(`/onboarding?plan=${planId}&currency=${currency}&interval=${interval}`);
      return;
    }

    setLoadingPlan(planId);
    try {
      const priceId = getPriceId(planId, currency, interval);
      if (!priceId) throw new Error('Preço não encontrado');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Comparação de Planos | WillFlow - Starter vs Pro vs Studio</title>
        <meta
          name="description"
          content="Compare todos os planos WillFlow lado a lado. Veja funcionalidades, limites e preços de cada plano. Encontre o ideal para o seu estúdio."
        />
        <link rel="canonical" href="https://willflow.app/planos/comparar" />
        <meta property="og:title" content="Comparação de Planos | WillFlow" />
        <meta property="og:description" content="Compare Starter, Pro e Studio. Encontre o plano ideal para o seu estúdio de foto e vídeo." />
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
              Comparação <span className="gradient-text">detalhada</span> de planos
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Encontre o plano perfeito para as necessidades do seu estúdio.
            </p>

            {/* Toggles */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm">
                <span className={`text-sm font-medium ${!showBRL ? 'text-foreground' : 'text-muted-foreground'}`}>
                  🇵🇹 EUR
                </span>
                <Switch checked={showBRL} onCheckedChange={setShowBRL} />
                <span className={`text-sm font-medium ${showBRL ? 'text-foreground' : 'text-muted-foreground'}`}>
                  🇧🇷 BRL
                </span>
              </div>

              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm">
                <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Mensal
                </span>
                <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
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

      {/* Comparison Table */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
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
                            <Badge className="gradient-primary mb-2">Mais popular</Badge>
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
                  <>
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
                  </>
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
                          Começar grátis
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
            Todos os planos incluem <strong>30 dias grátis</strong> como bónus de lançamento.
            Cancele a qualquer momento sem compromisso.
          </motion.p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
