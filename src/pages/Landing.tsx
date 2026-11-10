import "@/styles/marketing.css";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { trackCtaClick } from '@/lib/google-ads';
import { isBetaModeEnabled } from '@/contexts/BetaContext';
import { MotionConfig, motion } from 'framer-motion';
import {
  Calendar,
  CreditCard,
  Users,
  Check,
  ArrowRight,
  Kanban,
  FileSpreadsheet,
  BarChart3,
  Film,
  Clapperboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import dashboardPreview from '@/assets/screenshot-dark-dashboard.png';
import kanbanPreview from '@/assets/screenshot-dark-kanban.png';
import calendarPreview from '@/assets/screenshot-dark-calendar.png';
import paymentsPreview from '@/assets/screenshot-dark-payments.png';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { WaitlistForm } from '@/components/marketing/WaitlistForm';



const features = [
  {
    icon: Kanban,
    title: 'Kanban Visual',
    description: 'Acompanhe cada projeto desde a captação até à entrega final com um fluxo visual intuitivo.',
  },
  {
    icon: Users,
    title: 'CRM Integrado',
    description: 'Gira todos os seus clientes, contactos e histórico de projetos num só lugar.',
  },
  {
    icon: Calendar,
    title: 'Calendário',
    description: 'Visualize compromissos, sessões e prazos com integração Google Calendar.',
  },
  {
    icon: CreditCard,
    title: 'Pagamentos',
    description: 'Gira receitas, custos e pagamentos de forma simples e organizada.',
  },
  {
    icon: Film,
    title: 'Aprovação de Vídeo',
    description: 'Partilhe versões com os seus clientes e reúna comentários por instante do vídeo. Exclusivo Studio.',
    badge: 'Studio',
  },
  {
    icon: Clapperboard,
    title: 'Timeline',
    description: 'Estrutura visual para guiar a edição de vídeo. Exclusivo Studio.',
    badge: 'Studio',
  },
  {
    icon: FileSpreadsheet,
    title: 'Exportação Excel e PDF',
    description: 'Exporte relatórios em PDF e, nos planos Pro e Studio, também em Excel.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Analise o desempenho do seu negócio com relatórios visuais e detalhados.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Crie o seu workspace',
    description: 'Escolha Portugal (EUR) ou Brasil (BRL) para configurar moeda e fuso horário automaticamente.',
  },
  {
    number: '02',
    title: 'Adicione projetos',
    description: 'Crie projetos de Fotografia, Vídeo ou ambos. Cada tipo com o seu fluxo específico.',
  },
  {
    number: '03',
    title: 'Entrega automática',
    description: 'Quando um projeto de Captação é entregue, a fase de Edição abre automaticamente.',
  },
];

const faqs = [
  {
    question: 'Preciso de cartão para testar?',
    answer: 'Não! O trial de 7 dias é completamente grátis e não precisa de cartão. Só adiciona o cartão quando decidir subscrever.',
  },
  {
    question: 'Posso trocar de EUR para BRL?',
    answer: 'A moeda é definida por workspace no momento da criação. Portugal = EUR, Brasil = BRL. Se precisar de outra moeda, pode criar um novo workspace.',
  },
  {
    question: 'Posso cancelar antes do trial acabar?',
    answer: 'Sim! Pode cancelar a qualquer momento durante o trial de 7 dias e não será cobrado absolutamente nada.',
  },
  {
    question: 'Posso trabalhar com freelancers?',
    answer: 'Sim. Pode convidar membros para administração, edição, captação ou colaboração, com permissões de acesso adequadas à sua função.',
  },
  {
    question: 'Tem faturação?',
    answer: 'O WillFlow exporta dados formatados (Excel/PDF) para que possa faturar usando o seu software de faturação preferido. Não emitimos faturas diretamente.',
  },
];

const showcaseFeatures = [
  {
    id: 'kanban',
    label: 'Kanban Visual',
    image: kanbanPreview,
    description: 'Acompanhe cada projeto desde a captação até à entrega',
  },
  {
    id: 'financas',
    label: 'Visão geral',
    image: paymentsPreview,
    description: 'Gira receitas, custos e lucro em tempo real',
  },
  {
    id: 'calendario',
    label: 'Pagamentos',
    image: calendarPreview,
    description: 'Acompanhe valores a receber e pagamentos pendentes',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    image: dashboardPreview,
    description: 'Analise o desempenho do seu negócio',
  },
];

import { 
  PLANS, 
  PLAN_ORDER, 
  getDisplayPrice, 
  getCurrencySymbol,
  type PlanId,
  type Currency,
} from '@/lib/plans';

export default function Landing() {
  const [showBRL, setShowBRL] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isBetaMode = isBetaModeEnabled();

  const currency: Currency = showBRL ? 'brl' : 'eur';
  const currencySymbol = getCurrencySymbol(currency);

  const getPrice = (planId: PlanId) => {
    return getDisplayPrice(planId, currency, isAnnual ? 'yearly' : 'monthly');
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="public-landing min-h-screen bg-background">
      <Helmet>
        <title>WillFlow - Gestão de Projetos para Fotógrafos e Filmmakers</title>
        <meta name="description" content="Sistema completo de gestão de projetos para fotógrafos, filmmakers, agências e produtoras. Kanban, CRM, calendário e finanças num só lugar." />
        <link rel="canonical" href="https://willflow.app" />
        
        {/* Open Graph */}
        <meta property="og:title" content="WillFlow - Gestão de Projetos para Fotógrafos e Filmmakers" />
        <meta property="og:description" content="Sistema completo de gestão para produtores: Kanban visual, CRM, calendário, pagamentos e relatórios. 7 dias grátis." />
        <meta property="og:url" content="https://willflow.app" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WillFlow - Gestão de Projetos para Fotógrafos e Filmmakers" />
        <meta name="twitter:description" content="Sistema completo de gestão para produtores: Kanban visual, CRM, calendário, pagamentos e relatórios. 7 dias grátis." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": "Como começar com o WillFlow",
            "description": "Guia passo a passo para configurar o WillFlow e gerir os seus projetos de fotografia e vídeo",
            "step": steps.map((step, index) => ({
              "@type": "HowToStep",
              "position": index + 1,
              "name": step.title,
              "text": step.description
            }))
          })}
        </script>
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
      <main id="conteudo-principal" tabIndex={-1}>
      <section className="landing-intro relative overflow-hidden border-b border-border">
        <div className="container relative z-10 mx-auto px-4 pt-28 pb-10 text-center">
          <p className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-accent">
            <Clapperboard className="h-4 w-4" /> Gestão para fotografia e vídeo
          </p>
          <h1 className="mb-4 text-5xl font-bold sm:text-6xl lg:text-7xl">WillFlow</h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Da captação à entrega, com tudo em ordem.{' '}<br className="hidden sm:block" />
            Projetos, equipa, clientes e finanças num só lugar.
          </p>
          {isBetaMode ? (
            <div className="mx-auto max-w-xl"><WaitlistForm variant="hero" /></div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg"><Link to="/auth?trial=true" onClick={() => trackCtaClick('hero')}>Começar teste grátis <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#produto">Ver o WillFlow</a></Button>
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">{isBetaMode ? 'Acesso por convite' : '7 dias grátis · Sem cartão'}</p>
        </div>
        <div className="landing-product-view mx-auto max-w-5xl px-4">
          <img src={dashboardPreview} alt="Exemplo do painel WillFlow com projetos, receitas, custos e calendário" width={1184} height={768} loading="eager" decoding="async" className="w-full h-auto" />
        </div>
      </section>

      <section id="produto" className="scroll-mt-20 border-b border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="mb-2 text-sm font-medium text-accent">O seu estúdio, organizado</p><h2 className="text-3xl font-bold">Uma visão de cada etapa</h2></div>
            <p className="max-w-md text-sm text-muted-foreground">Prévia do produto com dados de exemplo.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {showcaseFeatures.map(feature => (
              <div key={feature.id} className="min-w-0">
                <Button variant="ghost" className="landing-preview h-auto w-full overflow-hidden rounded-lg border border-border p-0" onClick={() => setSelectedImage(feature.image)} aria-label={`Ampliar ${feature.label}`}>
                  <img src={feature.image} alt={`Exemplo de ${feature.label} no WillFlow`} width={1184} height={768} loading="lazy" decoding="async" className="aspect-[3/2] w-full object-contain bg-card" />
                </Button>
                <h3 className="mt-4 text-lg font-semibold">{feature.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Dialog open={selectedImage !== null} onOpenChange={open => { if (!open) setSelectedImage(null); }}>
        <DialogContent className="max-w-5xl rounded-lg p-4 pt-12">
          <DialogTitle className="sr-only">Prévia do WillFlow</DialogTitle>
          <DialogDescription className="sr-only">Imagem do produto com dados de exemplo.</DialogDescription>
          {selectedImage && <img src={selectedImage} alt="Prévia ampliada do WillFlow" className="max-h-[75dvh] w-full object-contain" />}
        </DialogContent>
      </Dialog>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona</h2>
            <p className="text-lg text-muted-foreground">3 passos simples para começar</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl font-bold gradient-text mb-4">{step.number}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features with Focal Zoom */}
      <section className="py-20 px-4 bg-muted/30 relative overflow-hidden">
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Tudo o que precisa, num só lugar
            </motion.h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas pensadas especificamente para o fluxo de trabalho de criadores visuais
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 focal-container">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                viewport={{ once: true }}
                className="focal-card p-6 glow-ring"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4 transition-transform group-hover:scale-110">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/funcionalidades">
              <Button variant="outline" size="lg" className="backdrop-blur-sm glow-ring">
                Ver todas as funcionalidades
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing with Focal Zoom */}
      <section className="py-20 px-4 relative overflow-hidden" id="pricing">
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            {/* Trial Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success mb-6 backdrop-blur-sm"
            >
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                7 dias grátis · Sem cartão
              </span>
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Planos simples e transparentes
            </motion.h2>
            <p className="text-lg text-muted-foreground mb-8">
              Escolha o plano ideal para o seu negócio
            </p>

            {/* Toggles Container */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Currency Toggle */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
                <span className={`text-sm font-medium transition-colors ${!showBRL ? 'text-foreground' : 'text-muted-foreground'}`}>
                  EUR
                </span>
                <Switch
                  checked={showBRL}
                  onCheckedChange={setShowBRL}
                  className="data-[state=checked]:bg-primary"
                  aria-label="Alternar moeda entre Euro e Real Brasileiro"
                />
                <span className={`text-sm font-medium transition-colors ${showBRL ? 'text-foreground' : 'text-muted-foreground'}`}>
                  BRL
                </span>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
                <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Mensal
                </span>
                <Switch
                  checked={isAnnual}
                  onCheckedChange={setIsAnnual}
                  className="data-[state=checked]:bg-primary"
                  aria-label="Alternar entre pagamento mensal e anual"
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
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto focal-container">
            {PLAN_ORDER.map((planId, index) => {
              const plan = PLANS[planId];
              
              // Features a mostrar por plano (apenas diferenças)
              const HIGHLIGHT_FEATURES: Record<PlanId, string[]> = {
                starter: ['kanban', 'crmBasic', 'calendar', 'mediaHub', 'reportsBasic', 'financialReports'],
                pro: ['chat', 'crmComplete', 'exportExcel', 'googleCalendar', 'reportsAdvanced'],
                studio: ['automations', 'permissions'],
              };
              
              const highlightKeys = HIGHLIGHT_FEATURES[planId];
              const displayFeatures = plan.features.filter(f => 
                f.category !== 'limit' && 
                f.category !== 'studio' && 
                highlightKeys.includes(f.key) && 
                f.included
              );
              
              return (
                <motion.div
                  key={planId}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  viewport={{ once: true }}
                  className={`focal-card relative flex flex-col rounded-2xl border p-6 ${
                    plan.popular 
                      ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 md:scale-105 z-10' 
                      : 'border-border/50 bg-background/50'
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary px-4">
                      Recomendado
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
                        Faturado anualmente ({currencySymbol}{plan.prices[currency].yearly}/ano)
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 mb-6 pb-6 border-b border-border/50">
                    <p className="text-sm font-medium">{plan.limitsDisplay.workspaces}</p>
                    <p className="text-sm font-medium">{plan.limitsDisplay.users}</p>
                    <p className="text-sm font-medium">{plan.limitsDisplay.projects}</p>
                  </div>

                  {/* Texto "Tudo do X, mais:" */}
                  {planId !== 'starter' && (
                    <p className="text-xs text-muted-foreground mb-3 italic">
                      ✓ Tudo do {planId === 'pro' ? 'Starter' : 'Pro'}, mais:
                    </p>
                  )}

                  {/* Studio Exclusive Highlight Box */}
                  {planId === 'studio' && (
                    <div className="mb-4 border-l-2 border-accent pl-4">
                      <p className="text-xs font-semibold text-primary/80 uppercase tracking-wide mb-3">Exclusivo Studio</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          
                          <span className="text-sm font-semibold text-foreground">Aprovação de vídeo e comparação A/B</span>
                        </div>
                        <div className="flex items-center gap-3">
                          
                          <span className="text-sm font-semibold text-foreground">Desenho de Timeline</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">10 GB armazenamento incluído</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {displayFeatures.map((feature) => (
                      <li key={feature.key} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                        <span>{feature.name}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/auth?trial=true">
                    <Button
                      className={`w-full glow-ring ${plan.popular ? 'gradient-primary' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      Testar grátis 7 dias
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link to="/planos/comparar">
              <Button variant="link" className="text-primary">
                Ver comparação detalhada de todos os planos →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ with premium styling */}
      <section className="py-20 px-4 bg-muted/30 relative overflow-hidden">
        
        <div className="container mx-auto max-w-3xl relative z-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-12"
          >
            Perguntas frequentes
          </motion.h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <AccordionItem value={`item-${index}`} className="focal-card px-6 border-0">
                  <AccordionTrigger className="text-left font-medium hover:no-underline">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
          <div className="text-center mt-8">
            <Link to="/ajuda">
              <Button variant="link">Ver todas as perguntas →</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA with premium depth effects */}
      <section className="py-20 px-4 relative overflow-hidden border-t border-border">
        
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="py-6 text-center max-w-3xl mx-auto relative overflow-hidden"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para transformar a sua gestão?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              7 dias grátis · Sem cartão
            </p>
            <Link to="/auth?trial=true" onClick={() => trackCtaClick('footer-cta')}>
              <Button size="lg" className="gradient-primary text-lg px-8 glow-ring lens-flare">
                Começar teste grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      </main>

      <PublicFooter />
      

    </div>
    </MotionConfig>
  );
}
