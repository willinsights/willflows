import { useState, memo, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { trackCtaClick } from '@/lib/google-ads';
import { isBetaModeEnabled } from '@/contexts/BetaContext';
import { AnimatePresence, motion } from 'framer-motion';
import Autoplay from 'embla-carousel-autoplay';
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { WaitlistForm } from '@/components/marketing/WaitlistForm';
import { LaunchBannerOptimized } from '@/components/marketing/LaunchBannerOptimized';
import { FloatingScreenshot } from '@/components/marketing/FloatingScreenshot';
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection';
import { SocialProofBanner } from '@/components/marketing/SocialProofBanner';

// Dark mode screenshots for the new hero
import screenshotDashboard from '@/assets/screenshot-dark-dashboard.png';
import screenshotKanban from '@/assets/screenshot-dark-kanban.png';
import screenshotCalendar from '@/assets/screenshot-dark-calendar.png';
import screenshotPayments from '@/assets/screenshot-dark-payments.png';

// Detail screenshots for modal
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
    question: 'Preciso de cartão para testar?',
    answer: 'Não! O trial de 30 dias é completamente grátis e não precisa de cartão. É o nosso bónus de lançamento para si! Só adiciona o cartão quando decidir subscrever.',
  },
  {
    question: 'Posso trocar de EUR para BRL?',
    answer: 'A moeda é definida por workspace no momento da criação. Portugal = EUR, Brasil = BRL. Se precisar de outra moeda, pode criar um novo workspace.',
  },
  {
    question: 'Posso cancelar antes do trial acabar?',
    answer: 'Sim! Pode cancelar a qualquer momento durante o trial de 30 dias e não será cobrado absolutamente nada.',
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

import { 
  PLANS, 
  PLAN_ORDER, 
  getDisplayPrice, 
  getCurrencySymbol,
  type PlanId,
  type Currency,
} from '@/lib/plans';

// Memoized mobile screenshot card with forwardRef for AnimatePresence compatibility
interface MobileScreenshotCardProps {
  src: string;
  alt: string;
  index: number;
  onClick: () => void;
}

const MobileScreenshotCard = memo(forwardRef<HTMLDivElement, MobileScreenshotCardProps>(
  function MobileScreenshotCard({ src, alt, index, onClick }, ref) {
    // First card is priority (LCP candidate on mobile)
    const isPriority = index === 0;
    
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={`Ver ${alt} em detalhe`}
        className="flex-shrink-0 snap-center first:ml-4 last:mr-4 cursor-pointer animate-in fade-in slide-in-from-right-4"
        style={{ animationDelay: `${0.3 + index * 0.1}s` }}
        onClick={onClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      >
        <div className="w-64 sm:w-72 rounded-xl overflow-hidden shadow-xl shadow-black/30 border border-white/10">
          <img 
            src={src} 
            alt={alt}
            width={288}
            height={187}
            loading={isPriority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={isPriority ? 'high' : 'auto'}
            className="w-full h-auto"
          />
        </div>
      </div>
    );
  }
));

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

  const heroScreenshots = [
    { src: screenshotDashboard, alt: 'Dashboard WillFlow' },
    { src: screenshotKanban, alt: 'Kanban WillFlow' },
    { src: screenshotCalendar, alt: 'Calendário WillFlow' },
    { src: screenshotPayments, alt: 'Pagamentos WillFlow' },
  ];

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>WillFlow - Gestão de Projetos para Fotógrafos e Filmmakers</title>
        <meta name="description" content="WillFlow é o sistema completo de gestão de projetos e produção para fotógrafos, filmmakers, agências e produtoras. Kanban, CRM, calendário e finanças num só lugar." />
        <link rel="canonical" href="https://willflow.app" />
        <meta property="og:title" content="WillFlow - Gestão de Projetos para Fotógrafos e Filmmakers" />
        <meta property="og:description" content="Sistema completo de gestão para produtores: Kanban visual, CRM, calendário, pagamentos e relatórios. 30 dias grátis." />
        <meta property="og:url" content="https://willflow.app" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="WillFlow - Gestão de Projetos para Fotógrafos e Filmmakers" />
        <meta name="twitter:description" content="Sistema completo de gestão para produtores: Kanban visual, CRM, calendário, pagamentos e relatórios. 30 dias grátis." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "WillFlow",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "Sistema de gestão de projetos para fotógrafos, videomakers, agências e produtoras. Kanban, CRM, calendário e finanças num só lugar.",
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "EUR",
              "lowPrice": "14",
              "highPrice": "49",
              "offerCount": "3"
            },
            "creator": {
              "@type": "Organization",
              "name": "WillFlow",
              "url": "https://willflow.app",
              "logo": "https://willflow.app/logo-willflow-purple.png",
              "sameAs": [
                "https://www.instagram.com/willflow.app",
                "https://www.linkedin.com/company/willflow"
              ]
            }
          })}
        </script>
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
      </Helmet>
      <PublicHeader />

      {/* Hero Section - ClickUp Style with Floating Screenshots */}
      <section className="relative min-h-[90vh] pt-24 pb-20 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 -z-10">
          {/* Main mesh gradient */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.25) 0%, transparent 50%),
                radial-gradient(ellipse 60% 50% at 80% 50%, hsl(180 100% 45% / 0.2) 0%, transparent 50%),
                radial-gradient(ellipse 50% 40% at 20% 80%, hsl(330 80% 55% / 0.15) 0%, transparent 50%),
                linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 100%)
              `,
            }}
          />
          
          {/* Animated gradient orbs - CSS animations for better performance */}
          <div 
            className="gradient-orb gradient-orb-1 absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30"
            aria-hidden="true"
          />
          <div 
            className="gradient-orb gradient-orb-2 absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-25"
            aria-hidden="true"
          />
          <div 
            className="gradient-orb gradient-orb-3 absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full opacity-20"
            aria-hidden="true"
          />
        </div>

        {/* Floating Screenshots - Desktop */}
        <div className="hidden lg:block">
          {/* Left side - Dashboard (partially visible) */}
          <FloatingScreenshot
            src={screenshotDashboard}
            alt="Dashboard WillFlow mostrando métricas e gráficos financeiros"
            className="left-[-8%] top-[20%] w-[380px] rotate-[-6deg]"
            delay={0}
            displayWidth={380}
            onClick={() => setSelectedImage(screenshotDashboard)}
          />
          
          {/* Right side - Kanban (larger, more visible) - Priority for LCP */}
          <FloatingScreenshot
            src={screenshotKanban}
            alt="Quadro Kanban WillFlow com projetos organizados por fase"
            className="right-[-5%] top-[18%] w-[420px] rotate-[4deg]"
            delay={0.3}
            displayWidth={420}
            priority
            onClick={() => setSelectedImage(screenshotKanban)}
          />
          
          {/* Bottom left - Calendar */}
          <FloatingScreenshot
            src={screenshotCalendar}
            alt="Calendário WillFlow com sessões e entregas agendadas"
            className="left-[2%] bottom-[5%] w-[320px] rotate-[-3deg]"
            delay={0.6}
            displayWidth={320}
            onClick={() => setSelectedImage(screenshotCalendar)}
          />
          
          {/* Bottom right - Payments */}
          <FloatingScreenshot
            src={screenshotPayments}
            alt="Controlo de pagamentos WillFlow com valores a receber"
            className="right-[3%] bottom-[8%] w-[340px] rotate-[5deg]"
            delay={0.9}
            displayWidth={340}
            onClick={() => setSelectedImage(screenshotPayments)}
          />
        </div>

        {/* Floating Screenshots - Tablet */}
        <div className="hidden md:block lg:hidden">
          <FloatingScreenshot
            src={screenshotDashboard}
            alt="Dashboard WillFlow mostrando métricas e gráficos financeiros"
            className="left-[-15%] top-[25%] w-[280px] rotate-[-6deg] opacity-70"
            delay={0}
            displayWidth={280}
            onClick={() => setSelectedImage(screenshotDashboard)}
          />
          <FloatingScreenshot
            src={screenshotKanban}
            alt="Quadro Kanban WillFlow com projetos organizados por fase"
            className="right-[-12%] top-[22%] w-[300px] rotate-[4deg] opacity-70"
            delay={0.3}
            displayWidth={300}
            onClick={() => setSelectedImage(screenshotKanban)}
          />
        </div>

        {/* Central Content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center pt-12 lg:pt-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge variant="secondary" className="mb-6 backdrop-blur-md bg-background/60 border-primary/20">
                {isBetaMode ? (
                  '🚀 Beta Privado • Acesso por convite'
                ) : (
                  '🎉 30 dias grátis • Bónus de lançamento!'
                )}
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
                O CRM + Kanban{' '}
                <br className="hidden sm:block" />
                feito para{' '}
                <span className="gradient-text">Foto e Vídeo</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                Captação → Edição → Entrega. Gerencie projetos, clientes, calendário e finanças num só lugar.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-10">
                <span className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
                  <Check className="h-4 w-4 text-success" /> 30 dias grátis
                </span>
                <span className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
                  <Check className="h-4 w-4 text-success" /> EUR ou BRL
                </span>
                <span className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
                  <Check className="h-4 w-4 text-success" /> Dark/Light mode
                </span>
              </div>
              
              {isBetaMode ? (
                <div className="max-w-xl mx-auto">
                  <WaitlistForm variant="hero" />
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <span className="text-muted-foreground">Já tem convite?</span>
                    <Link to="/auth">
                      <Button variant="ghost" size="sm">
                        Entrar na conta
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/auth?trial=true" onClick={() => trackCtaClick('hero')}>
                    <Button size="lg" className="gradient-primary text-lg px-8 h-14 glow-ring lens-flare">
                      Começar teste grátis
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/funcionalidades">
                    <Button size="lg" variant="outline" className="text-lg px-8 h-14 backdrop-blur-sm border-kanban-cyan/50 text-kanban-cyan hover:bg-kanban-cyan/10 hover:border-kanban-cyan">
                      Ver funcionalidades
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Mobile Screenshots Preview */}
        <div className="lg:hidden mt-12 px-4">
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            {heroScreenshots.map((screenshot, index) => (
              <MobileScreenshotCard
                key={screenshot.alt}
                src={screenshot.src}
                alt={screenshot.alt}
                index={index}
                onClick={() => setSelectedImage(screenshot.src)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By Section - Premium Carousel */}
      <section className="py-16 px-4 border-y border-border/20 bg-gradient-to-b from-muted/10 to-background">
        <div className="container mx-auto">
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-xs text-muted-foreground mb-10 tracking-[0.25em] uppercase font-medium"
          >
            Usado por produtores em Portugal e Brasil
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative max-w-4xl mx-auto"
          >
            {/* Fade gradient left */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            
            <Carousel
              opts={{
                align: "center",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 3000,
                  stopOnInteraction: false,
                  stopOnMouseEnter: true,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent className="-ml-8">
                {[
                  { src: "/logos/logo-cliente-1.png", name: "Produtora parceira" },
                  { src: "/logos/logo-cliente-2.png", name: "Cliente parceiro" },
                  { src: "/logos/tempspian.png", name: "Tempspian" },
                  { src: "/logos/logo-cliente-1.png", name: "Produtora parceira" },
                  { src: "/logos/logo-cliente-2.png", name: "Cliente parceiro" },
                  { src: "/logos/tempspian.png", name: "Tempspian" },
                ].map((logo, index) => (
                  <CarouselItem key={index} className="pl-8 basis-1/2 md:basis-1/3 lg:basis-1/4">
                    <div className="flex items-center justify-center h-20 p-4">
                      <img 
                        src={logo.src}
                        alt={logo.name}
                        width={140}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-auto max-w-[140px] object-contain 
                                   invert dark:invert-0
                                   opacity-50 hover:opacity-100 transition-all duration-500"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            
            {/* Fade gradient right */}
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-5xl w-full bg-card rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                aria-label="Fechar imagem ampliada"
              >
                <X className="h-5 w-5" />
              </button>
              <img 
                src={selectedImage} 
                alt="Screenshot ampliado do WillFlow"
                className="w-full h-auto"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Social Proof Banner */}
      <SocialProofBanner />

      {/* Testimonials */}
      <TestimonialsSection />

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
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                🎉 30 dias grátis • Bónus de lançamento!
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
                  aria-label="Alternar moeda entre Euro e Real Brasileiro"
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
              const displayFeatures = plan.features.filter(f => f.category !== 'limit' && f.included);
              
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
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 mb-6 pb-6 border-b border-border/50">
                    <p className="text-sm font-medium">{plan.limitsDisplay.workspaces}</p>
                    <p className="text-sm font-medium">{plan.limitsDisplay.users}</p>
                    <p className="text-sm font-medium">{plan.limitsDisplay.projects}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {displayFeatures.slice(0, 6).map((feature) => (
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
                      Testar grátis 30 dias
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
              🎉 30 dias grátis como bónus de lançamento! Sem cartão necessário.
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

      <PublicFooter />
      
      {/* Launch promotion banner - optimized */}
      {!isBetaMode && <LaunchBannerOptimized />}
    </div>
  );
}
