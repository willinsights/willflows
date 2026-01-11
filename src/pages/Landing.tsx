import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CreditCard,
  Users,
  Check,
  ArrowRight,
  Kanban,
  FileSpreadsheet,
  BarChart3,
  X,
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
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import heroShowcase from '@/assets/hero-showcase.png';
import screenshotKanbanDetail from '@/assets/screenshot-kanban-detail.png';
import screenshotReceitaDetail from '@/assets/screenshot-receita-detail.png';
import screenshotCalendarioDetail from '@/assets/screenshot-calendario-detail.png';
import screenshotMargemDetail from '@/assets/screenshot-margem-detail.png';

const features = [
  {
    icon: Kanban,
    title: 'Kanban Visual',
    description: 'Acompanhe cada projeto desde a captação até a entrega final com um fluxo visual intuitivo.',
  },
  {
    icon: Users,
    title: 'CRM Integrado',
    description: 'Gerencie todos os seus clientes, contactos e histórico de projetos num só lugar.',
  },
  {
    icon: Calendar,
    title: 'Calendário',
    description: 'Visualize compromissos, sessões e prazos com integração Google Calendar.',
  },
  {
    icon: CreditCard,
    title: 'Pagamentos',
    description: 'Controle receitas, custos e pagamentos de forma simples e organizada.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Export Excel & PDF',
    description: 'Exporte dados para faturar externamente ou criar relatórios personalizados.',
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
    question: 'Precisa de cartão para testar?',
    answer: 'Sim, usamos o modelo de trial com cartão. Os 7 dias são completamente grátis e só cobramos após o período de teste. Pode cancelar a qualquer momento.',
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
    question: 'Dá para ter freelancers?',
    answer: 'Sim! Pode convidar membros com diferentes roles: Admin, Editor, Captação, Freelancer ou Visualizador. Cada role tem permissões específicas.',
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
    image: screenshotKanbanDetail,
    description: 'Acompanhe cada projeto desde a captação até a entrega',
  },
  {
    id: 'financas',
    label: 'Finanças',
    image: screenshotReceitaDetail,
    description: 'Controle receitas, custos e lucro em tempo real',
  },
  {
    id: 'calendario',
    label: 'Calendário',
    image: screenshotCalendarioDetail,
    description: 'Visualize compromissos, sessões e entregas',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    image: screenshotMargemDetail,
    description: 'Analise o desempenho do seu negócio',
  },
];

// Plan definitions matching Pricing page
const plans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Para freelancers e profissionais independentes',
    priceEUR: { monthly: 14, annual: 11 },
    priceBRL: { monthly: 79, annual: 63 },
    limits: {
      workspaces: '1 workspace',
      users: 'Até 2 utilizadores',
      projects: '20 projetos ativos',
    },
    features: [
      { name: 'Exportação Excel', included: true },
      { name: 'Relatórios simples', included: true },
      { name: 'Exportação PDF', included: false },
      { name: 'Google Calendar', included: false },
      { name: 'Meet integrado', included: false },
      { name: 'Frame.io', included: false },
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para equipas em crescimento',
    priceEUR: { monthly: 24, annual: 19 },
    priceBRL: { monthly: 149, annual: 119 },
    limits: {
      workspaces: 'Até 3 workspaces',
      users: 'Até 10 utilizadores',
      projects: 'Projetos ilimitados',
    },
    features: [
      { name: 'Exportação Excel + PDF', included: true },
      { name: 'Relatórios avançados', included: true },
      { name: 'Google Calendar', included: true },
      { name: 'Meet integrado', included: true },
      { name: 'Templates de projeto', included: true },
      { name: 'Frame.io', included: false },
    ],
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Para agências e produtoras',
    priceEUR: { monthly: 32, annual: 26 },
    priceBRL: { monthly: 197, annual: 158 },
    limits: {
      workspaces: 'Até 10 workspaces',
      users: 'Utilizadores ilimitados',
      projects: 'Projetos ilimitados',
    },
    features: [
      { name: 'Exportação Excel + PDF', included: true },
      { name: 'Relatórios avançados', included: true },
      { name: 'Google Calendar', included: true },
      { name: 'Meet integrado', included: true },
      { name: 'Frame.io integrado', included: true },
      { name: 'Automações avançadas', included: true },
    ],
    popular: false,
  },
];

// Showcase with Background and Floating Cards Component
function ShowcaseWithBackground({ features }: { features: typeof showcaseFeatures }) {
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);
  
  const featureIcons = [Kanban, CreditCard, Calendar, BarChart3];

  return (
    <div className="relative max-w-6xl mx-auto">
      {/* Background Image Container */}
      <div className="relative rounded-3xl overflow-hidden min-h-[500px] md:min-h-[600px]">
        {/* Hero Background Image */}
        <img 
          src={heroShowcase} 
          alt="WillFlow Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-kanban-cyan/10" />
        
        {/* Floating Cards Grid */}
        <div className="relative z-10 p-6 md:p-12 h-full flex items-center justify-center">
          <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-3xl w-full">
            {features.map((feature, index) => {
              const IconComponent = featureIcons[index];
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => setSelectedFeature(selectedFeature === index ? null : index)}
                  className="group cursor-pointer"
                >
                  <div className="relative backdrop-blur-xl bg-white/10 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:bg-white/15 dark:hover:bg-black/40 hover:border-white/30 hover:shadow-2xl hover:shadow-primary/20">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 backdrop-blur-sm group-hover:bg-primary/30 transition-colors">
                        <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white text-sm md:text-base">{feature.label}</h3>
                    </div>
                    
                    {/* Thumbnail */}
                    <div className="relative rounded-xl overflow-hidden mb-3 border border-white/10">
                      <img 
                        src={feature.image} 
                        alt={feature.label}
                        className="w-full h-24 md:h-32 object-cover object-top transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {/* Description */}
                    <p className="text-white/70 text-xs md:text-sm leading-relaxed">{feature.description}</p>
                    
                    {/* Hover Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-kanban-cyan/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity -z-10" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Corner Glow Effects */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/30 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-kanban-cyan/30 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Expanded Feature Modal */}
      <AnimatePresence>
        {selectedFeature !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedFeature(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-4xl w-full bg-card rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedFeature(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <img 
                src={features[selectedFeature].image} 
                alt={features[selectedFeature].label}
                className="w-full h-auto"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <h3 className="text-2xl font-bold text-white mb-2">{features[selectedFeature].label}</h3>
                <p className="text-white/80">{features[selectedFeature].description}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Background Glow */}
      <div className="absolute -inset-8 bg-gradient-to-r from-primary/15 via-purple-500/10 to-kanban-cyan/15 rounded-[3rem] blur-3xl -z-10 opacity-50" />
    </div>
  );
}

export default function Landing() {
  const [showBRL, setShowBRL] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  const getPrice = (plan: typeof plans[0]) => {
    const prices = showBRL ? plan.priceBRL : plan.priceEUR;
    return isAnnual ? prices.annual : prices.monthly;
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero with Depth of Field */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden hero-depth">
        {/* Premium Bokeh Background */}
        <div className="absolute inset-0 -z-10">
          {/* Large bokeh orbs */}
          <div className="bokeh-orb bokeh-orb-primary w-[500px] h-[500px] -top-32 left-1/4" style={{ animationDelay: '0s' }} />
          <div className="bokeh-orb bokeh-orb-accent w-[400px] h-[400px] bottom-0 right-1/4" style={{ animationDelay: '-4s' }} />
          <div className="bokeh-orb bokeh-orb-glow w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '-8s' }} />
          
          {/* Smaller accent orbs for depth */}
          <div className="bokeh-orb bokeh-orb-primary w-48 h-48 top-20 right-20 opacity-30" style={{ animationDelay: '-2s' }} />
          <div className="bokeh-orb bokeh-orb-accent w-32 h-32 bottom-40 left-20 opacity-40" style={{ animationDelay: '-6s' }} />
        </div>

        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="dof-focus"
          >
            <Badge variant="secondary" className="mb-6 backdrop-blur-sm">
              ✨ 7 dias grátis com cartão • Cancele quando quiser
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              O CRM + Kanban feito para{' '}
              <span className="gradient-text">Foto e Vídeo</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              Captação → Edição → Entrega. Gerencie projetos, clientes, calendário e finanças num só lugar.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> 7 dias grátis</span>
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> EUR ou BRL</span>
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> Dark/Light mode</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?trial=true">
                <Button size="lg" className="gradient-primary text-lg px-8 glow-ring lens-flare">
                  Começar teste grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/funcionalidades">
                <Button size="lg" variant="outline" className="text-lg px-8 backdrop-blur-sm border-kanban-cyan/50 text-kanban-cyan hover:bg-kanban-cyan/10 hover:border-kanban-cyan">
                  Ver funcionalidades
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Screenshots Showcase - Background with Floating Cards */}
      <section className="py-20 px-4 overflow-hidden relative">
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Veja o WillFlow em ação
            </motion.h2>
            <p className="text-lg text-muted-foreground">Clique nos cards para ver cada funcionalidade em detalhe</p>
          </div>

          {/* Showcase with Background and Cards */}
          <ShowcaseWithBackground features={showcaseFeatures} />
        </div>
      </section>

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
        {/* Background bokeh */}
        <div className="bokeh-orb bokeh-orb-glow w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
        
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
        {/* Background bokeh */}
        <div className="bokeh-orb bokeh-orb-primary w-80 h-80 top-20 -left-20 opacity-15" />
        <div className="bokeh-orb bokeh-orb-accent w-64 h-64 bottom-20 -right-20 opacity-10" />
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            {/* Trial Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success mb-6 backdrop-blur-sm"
            >
              <CreditCard className="h-4 w-4" />
              <span className="text-sm font-medium">
                ✅ 7 dias grátis com cartão (cobrança só após o trial)
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
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
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
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto focal-container">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
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
                    Mais vendido
                  </Badge>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  
                  {/* Price */}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      {showBRL ? 'R$' : '€'}{getPrice(plan)}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Faturado anualmente ({showBRL ? 'R$' : '€'}{getPrice(plan) * 12}/ano)
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-2 mb-6 pb-6 border-b border-border/50">
                  <p className="text-sm font-medium">{plan.limits.workspaces}</p>
                  <p className="text-sm font-medium">{plan.limits.users}</p>
                  <p className="text-sm font-medium">{plan.limits.projects}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-2 text-sm">
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

                <Link to="/auth?trial=true">
                  <Button
                    className={`w-full glow-ring ${plan.popular ? 'gradient-primary' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Começar 7 dias grátis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/planos">
              <Button variant="link" className="text-primary">
                Ver comparação completa →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ with premium styling */}
      <section className="py-20 px-4 bg-muted/30 relative overflow-hidden">
        <div className="bokeh-orb bokeh-orb-glow w-72 h-72 top-1/2 left-0 -translate-y-1/2 opacity-10" />
        
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
      <section className="py-20 px-4 relative overflow-hidden hero-depth">
        <div className="bokeh-orb bokeh-orb-primary w-96 h-96 top-0 right-0 opacity-20" />
        <div className="bokeh-orb bokeh-orb-accent w-64 h-64 bottom-0 left-0 opacity-15" />
        
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="focal-card p-12 text-center max-w-3xl mx-auto relative overflow-hidden"
          >
            {/* Premium gradient glow */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[hsl(180_100%_45%/0.1)] rounded-full blur-3xl" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para transformar a sua gestão?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              7 dias grátis com cartão. Cancele a qualquer momento.
            </p>
            <Link to="/auth?trial=true">
              <Button size="lg" className="gradient-primary text-lg px-8 glow-ring lens-flare">
                Começar teste grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
