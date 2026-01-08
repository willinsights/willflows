import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Check,
  X,
  ArrowRight,
  Moon,
  Sun,
  ArrowLeft,
  Loader2,
  Users,
  FolderKanban,
  Calendar,
  BarChart3,
  Puzzle,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
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

// Stripe Price IDs
const STRIPE_PRICES = {
  essencial: {
    eur: 'price_1SnISxGuTRnB7JCLL32X5m8U',
    product_id: 'prod_Tko5hx2Pkr7ERk',
  },
  pro: {
    eur: 'price_1SnITEGuTRnB7JCL1bB4woIg',
    product_id: 'prod_Tko5cR05VWjok0',
  },
  studio: {
    eur: 'price_1SnITPGuTRnB7JCLfcpOdsUs',
    product_id: 'prod_Tko5DQ15DWTMhz',
  },
};

const plans = [
  {
    id: 'essencial',
    name: 'Essencial',
    description: 'Para freelancers e pequenas equipas',
    priceEUR: 12,
    priceBRL: 79,
    features: [
      { name: 'Utilizadores', value: '3', included: true },
      { name: 'Clientes', value: '50', included: true },
      { name: 'Projetos/mês', value: '30', included: true },
      { name: 'Kanban Captação + Edição', value: true, included: true },
      { name: 'CRM básico', value: true, included: true },
      { name: 'Relatórios simples', value: true, included: true },
      { name: 'Templates de projeto', value: false, included: false },
      { name: 'Google Calendar', value: false, included: false },
      { name: 'Frame.io', value: false, included: false },
      { name: 'API e Webhooks', value: false, included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para equipas em crescimento',
    priceEUR: 22,
    priceBRL: 137,
    popular: true,
    features: [
      { name: 'Utilizadores', value: '10', included: true },
      { name: 'Clientes', value: '500', included: true },
      { name: 'Projetos/mês', value: '200', included: true },
      { name: 'Kanban Captação + Edição', value: true, included: true },
      { name: 'CRM completo', value: true, included: true },
      { name: 'Relatórios avançados', value: true, included: true },
      { name: 'Templates de projeto', value: true, included: true },
      { name: 'Google Calendar', value: true, included: true },
      { name: 'Frame.io', value: false, included: false },
      { name: 'API e Webhooks', value: false, included: false },
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Para agências e produtoras',
    priceEUR: 32,
    priceBRL: 197,
    features: [
      { name: 'Utilizadores', value: '25', included: true },
      { name: 'Clientes', value: 'Ilimitados', included: true },
      { name: 'Projetos/mês', value: 'Ilimitados', included: true },
      { name: 'Kanban Captação + Edição', value: true, included: true },
      { name: 'CRM completo', value: true, included: true },
      { name: 'Relatórios avançados', value: true, included: true },
      { name: 'Templates de projeto', value: true, included: true },
      { name: 'Google Calendar', value: true, included: true },
      { name: 'Frame.io', value: true, included: true },
      { name: 'API e Webhooks', value: true, included: true },
    ],
  },
];

const faqs = [
  {
    question: 'Posso experimentar antes de pagar?',
    answer: 'Sim! Oferecemos 14 dias de teste gratuito em todos os planos. Não é necessário cartão de crédito para começar.',
  },
  {
    question: 'Posso mudar de plano a qualquer momento?',
    answer: 'Sim, pode fazer upgrade ou downgrade do seu plano a qualquer momento. As alterações são aplicadas no próximo ciclo de faturação.',
  },
  {
    question: 'Como funciona a faturação?',
    answer: 'A faturação é mensal e processada através do Stripe. Aceitamos todos os principais cartões de crédito e débito.',
  },
  {
    question: 'Os meus dados estão seguros?',
    answer: 'Absolutamente. Usamos encriptação de ponta a ponta e os seus dados são armazenados em servidores seguros na União Europeia.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, pode cancelar a sua subscrição a qualquer momento. Continuará a ter acesso até ao final do período pago.',
  },
];

const comparisonFeatures = [
  { category: 'Utilizadores & Limites', icon: Users },
  { category: 'Funcionalidades', icon: FolderKanban },
  { category: 'Integrações', icon: Puzzle },
  { category: 'Suporte', icon: Headphones },
];

export default function Pricing() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [showBRL, setShowBRL] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    // If not authenticated, redirect to auth with plan param
    if (!user) {
      navigate(`/auth?plan=${planId}`);
      return;
    }

    // If no workspace, redirect to onboarding with plan param
    if (!currentWorkspace) {
      navigate(`/onboarding?plan=${planId}`);
      return;
    }

    // If authenticated with workspace, start checkout
    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES].eur,
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl gradient-text">WillFlow</span>
          </Link>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            {!user && (
              <Link to="/auth">
                <Button className="gradient-primary">Entrar</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6">
              14 dias grátis • Sem cartão de crédito
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Escolha o plano ideal para o seu{' '}
              <span className="gradient-text">negócio</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Comece gratuitamente e faça upgrade conforme cresce. Cancele a qualquer momento.
            </p>

            {/* Currency Toggle */}
            <div className="flex items-center justify-center gap-3">
              <Label htmlFor="currency" className={!showBRL ? 'font-semibold' : 'text-muted-foreground'}>
                EUR €
              </Label>
              <Switch
                id="currency"
                checked={showBRL}
                onCheckedChange={setShowBRL}
              />
              <Label htmlFor="currency" className={showBRL ? 'font-semibold' : 'text-muted-foreground'}>
                BRL R$
              </Label>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card p-6 relative flex flex-col ${
                  plan.popular ? 'border-2 border-primary scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary">
                    Mais popular
                  </Badge>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      {showBRL ? `R$${plan.priceBRL}` : `€${plan.priceEUR}`}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.slice(0, 6).map((feature) => (
                    <li key={feature.name} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={!feature.included ? 'text-muted-foreground/60' : ''}>
                        {feature.name}
                        {typeof feature.value === 'string' && `: ${feature.value}`}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.popular ? 'gradient-primary' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loadingPlan === plan.id}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {user ? 'Subscrever' : 'Começar agora'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            ))}
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
                  {plans.map((plan) => (
                    <th key={plan.id} className="text-center py-4 px-4 font-semibold">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans[0].features.map((feature, index) => (
                  <tr key={feature.name} className="border-b border-border/50">
                    <td className="py-4 px-4 text-sm">{feature.name}</td>
                    {plans.map((plan) => {
                      const planFeature = plan.features[index];
                      return (
                        <td key={plan.id} className="text-center py-4 px-4">
                          {typeof planFeature.value === 'string' ? (
                            <span className="text-sm font-medium">{planFeature.value}</span>
                          ) : planFeature.included ? (
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
                className="glass-card px-6"
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
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-4">
              Pronto para começar?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Experimente gratuitamente durante 14 dias. Sem compromisso.
            </p>
            <Button
              size="lg"
              className="gradient-primary text-lg px-8"
              onClick={() => handleSelectPlan('pro')}
            >
              Começar teste grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold gradient-text">WillFlow</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              © 2026 WillFlow. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
