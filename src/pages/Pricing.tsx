import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Check,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
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

const faqs = [
  {
    question: 'Como funciona o período de teste?',
    answer: 'Ao criar conta, tem automaticamente 30 dias grátis como bónus de lançamento para experimentar todas as funcionalidades sem precisar de cartão. Após o trial, escolhe o plano que melhor se adequa.',
  },
  {
    question: 'Posso mudar de plano a qualquer momento?',
    answer: 'Sim, pode fazer upgrade ou downgrade do seu plano a qualquer momento. As alterações são aplicadas proporcionalmente ao tempo restante.',
  },
  {
    question: 'Como funciona a faturação anual?',
    answer: 'Com a faturação anual, paga antecipadamente por 12 meses e obtém 20% de desconto. O valor é cobrado uma única vez por ano.',
  },
  {
    question: 'Aceitam pagamentos em Real (BRL)?',
    answer: 'Sim! Aceitamos pagamentos em Euro (EUR) e Real Brasileiro (BRL). Basta selecionar a moeda preferida antes de subscrever.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, pode cancelar a sua subscrição a qualquer momento sem compromisso. Continuará a ter acesso até ao final do período pago.',
  },
  {
    question: 'Os meus dados estão seguros?',
    answer: 'Absolutamente. Usamos encriptação de ponta a ponta e os seus dados são armazenados em servidores seguros. Processamos pagamentos através do Stripe.',
  },
];

export default function Pricing() {
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

  const getPrice = (planId: PlanId) => {
    return getDisplayPrice(planId, currency, interval);
  };

  const handleSelectPlan = async (planId: PlanId) => {
    // If not authenticated, redirect to auth with plan param
    if (!user) {
      navigate(`/auth?plan=${planId}&currency=${currency}&interval=${interval}`);
      return;
    }

    // If no workspace, redirect to onboarding with plan param
    if (!currentWorkspace) {
      navigate(`/onboarding?plan=${planId}&currency=${currency}&interval=${interval}`);
      return;
    }

    // If authenticated with workspace, start checkout
    setLoadingPlan(planId);
    try {
      const priceId = getPriceId(planId, currency, interval);
      
      if (!priceId) {
        throw new Error('Preço não encontrado');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
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
        <title>Planos e Preços | WillFlow - A partir de 14€/mês</title>
        <meta name="description" content="Escolha o plano ideal para o seu estúdio. Starter, Pro ou Studio. 30 dias grátis, sem cartão. Facturação em EUR ou BRL. Cancele quando quiser." />
        <link rel="canonical" href="https://willflow.app/planos" />
        <meta property="og:title" content="Planos e Preços | WillFlow - A partir de 14€/mês" />
        <meta property="og:description" content="Escolha o plano ideal para o seu estúdio. Starter, Pro ou Studio. 30 dias grátis, sem cartão. Facturação em EUR ou BRL." />
        <meta property="og:url" content="https://willflow.app/planos" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Planos e Preços | WillFlow - A partir de 14€/mês" />
        <meta name="twitter:description" content="Escolha o plano ideal para o seu estúdio. Starter, Pro ou Studio. 30 dias grátis, sem cartão." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })}
        </script>
      </Helmet>
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Trial Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success mb-6">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                🎉 30 dias grátis • Bónus de lançamento!
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Escolha o plano ideal para o seu{' '}
              <span className="gradient-text">negócio</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Comece com 30 dias grátis e faça upgrade conforme cresce. Cancele a qualquer momento.
            </p>

            {/* Toggles Container */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              {/* Currency Toggle */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm">
                <span className={`text-sm font-medium transition-colors ${!showBRL ? 'text-foreground' : 'text-muted-foreground'}`}>
                  🇵🇹 EUR
                </span>
                <Switch
                  checked={showBRL}
                  onCheckedChange={setShowBRL}
                  className="data-[state=checked]:bg-primary"
                />
                <span className={`text-sm font-medium transition-colors ${showBRL ? 'text-foreground' : 'text-muted-foreground'}`}>
                  🇧🇷 BRL
                </span>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm">
                <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Mensal
                </span>
                <Switch
                  checked={isAnnual}
                  onCheckedChange={setIsAnnual}
                  className="data-[state=checked]:bg-primary"
                />
                <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
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

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLAN_ORDER.map((planId, index) => {
              const plan = PLANS[planId];
              const displayFeatures = plan.features.filter(f => f.category !== 'limit');
              
              return (
                <motion.div
                  key={planId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative flex flex-col rounded-2xl border backdrop-blur-xl p-6 ${
                    plan.popular 
                      ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 scale-105 z-10' 
                      : 'border-border/50 bg-background/50'
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary px-4">
                      Mais vendido
                    </Badge>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    
                    {/* Price */}
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        {currencySymbol}{getPrice(planId)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    
                    {isAnnual && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Faturado anualmente ({currencySymbol}{getYearlyTotal(planId, currency)}/ano)
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 mb-6 pb-6 border-b border-border/50">
                    <p className="text-sm font-medium">{plan.limitsDisplay.workspaces}</p>
                    <p className="text-sm font-medium">{plan.limitsDisplay.users}</p>
                    <p className="text-sm font-medium">{plan.limitsDisplay.projects}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {displayFeatures.map((feature) => (
                      <li key={feature.key} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-success flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                        )}
                        <span className={!feature.included ? 'text-muted-foreground/60' : ''}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${plan.popular ? 'gradient-primary' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(planId)}
                    disabled={loadingPlan === planId}
                  >
                    {loadingPlan === planId ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Começar 30 dias grátis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Comparação detalhada
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold">Funcionalidade</th>
                  {PLAN_ORDER.map((planId) => {
                    const plan = PLANS[planId];
                    return (
                      <th key={planId} className="text-center py-4 px-4 font-semibold">
                        <span className={plan.popular ? 'gradient-text' : ''}>{plan.name}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Limits rows */}
                <tr className="border-b border-border/50 bg-muted/20">
                  <td className="py-4 px-4 text-sm font-medium">Workspaces</td>
                  <td className="text-center py-4 px-4 text-sm">1</td>
                  <td className="text-center py-4 px-4 text-sm font-medium text-primary">Até 3</td>
                  <td className="text-center py-4 px-4 text-sm">Até 10</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-4 px-4 text-sm font-medium">Utilizadores</td>
                  <td className="text-center py-4 px-4 text-sm">Até 2</td>
                  <td className="text-center py-4 px-4 text-sm font-medium text-primary">Até 10</td>
                  <td className="text-center py-4 px-4 text-sm">Ilimitados</td>
                </tr>
                <tr className="border-b border-border/50 bg-muted/20">
                  <td className="py-4 px-4 text-sm font-medium">Projetos ativos</td>
                  <td className="text-center py-4 px-4 text-sm">20</td>
                  <td className="text-center py-4 px-4 text-sm font-medium text-primary">Ilimitados</td>
                  <td className="text-center py-4 px-4 text-sm">Ilimitados</td>
                </tr>
                {/* Feature rows - use Studio as reference since it has all features */}
                {PLANS.studio.features.filter(f => f.category !== 'limit').map((feature, index) => (
                  <tr key={feature.key} className={`border-b border-border/50 ${index % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="py-4 px-4 text-sm">{feature.name}</td>
                    {PLAN_ORDER.map((planId) => {
                      const plan = PLANS[planId];
                      const planFeature = plan.features.find(f => f.key === feature.key);
                      const included = planFeature?.included ?? false;
                      return (
                        <td key={planId} className="text-center py-4 px-4">
                          {included ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Perguntas frequentes
          </h2>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm px-6"
              >
                <AccordionTrigger className="text-left font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            🎉 30 dias grátis como bónus de lançamento! Veja como o WillFlow pode transformar o seu negócio.
          </p>
          <Button 
            size="lg" 
            className="gradient-primary"
            onClick={() => handleSelectPlan('pro')}
          >
            <ArrowRight className="mr-2 h-5 w-5" />
            Começar teste grátis
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
