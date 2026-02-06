import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Camera,
  CalendarCheck,
  Users,
  CreditCard,
  FolderOpen,
  CheckSquare,
  ArrowRight,
  Star,
  Sparkles,
  UserPlus,
  Palette,
  CheckCircle,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';

const flowSteps = [
  { icon: UserPlus, title: 'Novo Cliente', description: 'Registo e briefing' },
  { icon: CalendarCheck, title: 'Agendamento', description: 'Sessão no calendário' },
  { icon: Camera, title: 'Captação', description: 'Dia da sessão' },
  { icon: Palette, title: 'Edição', description: 'Tratamento de imagem' },
  { icon: CheckCircle, title: 'Entrega', description: 'Galeria ao cliente' },
];

const comparisonItems: Array<{ feature: string; competitor: boolean | 'partial'; willflow: boolean }> = [
  { feature: 'Kanban visual por fase', competitor: false, willflow: true },
  { feature: 'Calendário integrado', competitor: 'partial', willflow: true },
  { feature: 'CRM com histórico de cliente', competitor: false, willflow: true },
  { feature: 'Checklists automáticos', competitor: false, willflow: true },
  { feature: 'Controlo de pagamentos', competitor: 'partial', willflow: true },
  { feature: 'Alertas de vencimento', competitor: false, willflow: true },
  { feature: 'Chat de equipa integrado', competitor: false, willflow: true },
  { feature: 'Relatórios financeiros', competitor: 'partial', willflow: true },
];

const testimonials = [
  {
    name: 'Mariana Costa',
    role: 'Fotógrafa de Casamentos',
    text: 'O WillFlow mudou a forma como organizo os meus casamentos. Consigo ver tudo numa só plataforma.',
  },
  {
    name: 'Pedro Santos',
    role: 'Fotógrafo de Produto',
    text: 'Finalmente um sistema feito para fotógrafos. Os checklists por sessão são geniais.',
  },
];

const useCases = [
  'Casamentos e Eventos',
  'Fotografia de Produto',
  'Retratos e Lifestyle',
  'Fotografia Imobiliária',
  'Sessões Newborn',
  'Fotografia Corporativa',
];

export default function ParaFotografos() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>WillFlow para Fotógrafos | Gestão de Sessões e Clientes</title>
        <meta name="description" content="Sistema de gestão completo para fotógrafos. Organize sessões, clientes, pagamentos e entregas. Kanban visual, CRM integrado e calendário. 30 dias grátis." />
        <link rel="canonical" href="https://willflow.app/para-fotografos" />
        <meta property="og:title" content="WillFlow para Fotógrafos | Gestão de Sessões e Clientes" />
        <meta property="og:description" content="Sistema de gestão completo para fotógrafos. Organize sessões, clientes, pagamentos e entregas. 30 dias grátis." />
        <meta property="og:url" content="https://willflow.app/para-fotografos" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WillFlow para Fotógrafos | Gestão de Sessões e Clientes" />
        <meta name="twitter:description" content="Sistema de gestão completo para fotógrafos. Organize sessões, clientes, pagamentos e entregas. 30 dias grátis." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Para Fotógrafos", "item": "https://willflow.app/para-fotografos" }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow para Fotógrafos",
            "description": "Sistema de gestão de projetos desenhado para fotógrafos profissionais",
            "brand": { "@type": "Brand", "name": "WillFlow" },
            "offers": {
              "@type": "Offer",
              "price": "14",
              "priceCurrency": "EUR",
              "priceValidUntil": "2026-12-31",
              "availability": "https://schema.org/InStock"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "89"
            }
          })}
        </script>
      </Helmet>
      <PublicHeader />

      {/* Hero with Screenshot */}
      <section className="pt-32 pb-16 px-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Camera className="h-4 w-4" />
                Para Fotógrafos
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Gestão completa para o seu{' '}
                <span className="gradient-text">estúdio fotográfico</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Organize todas as suas sessões, clientes e pagamentos num só lugar. 
                Do primeiro contacto à entrega final.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth?trial=true">
                  <Button size="lg" className="gradient-primary w-full sm:w-auto">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Começar 30 dias grátis
                  </Button>
                </Link>
                <Link to="/funcionalidades">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Ver funcionalidades
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                ✓ Sem cartão de crédito · ✓ Cancelar a qualquer momento
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <img
                src="/screenshots/banner-dashboard-overview.png"
                alt="Dashboard WillFlow para fotógrafos mostrando métricas de sessões, receitas mensais e projetos pendentes organizados por fase"
                title="Dashboard WillFlow para Fotógrafos"
                className="w-full screenshot-fog-hero"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 px-4 border-y border-border bg-muted/30">
        <div className="container mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Ideal para todos os tipos de fotografia
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {useCases.map((useCase) => (
              <span
                key={useCase}
                className="px-4 py-2 rounded-full bg-background border border-border text-sm"
              >
                {useCase}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Diagram */}
      <FlowDiagram
        title="O fluxo de trabalho perfeito"
        subtitle="Do primeiro contacto à entrega final, tudo automatizado"
        steps={flowSteps}
        direction="horizontal"
      />

      {/* Feature Sections with Screenshots */}
      <FeatureSection
        icon={Image}
        title="Kanban Visual de Sessões"
        description="Visualize todas as suas sessões organizadas por fase: Agendadas, Em Captação, Edição, Prontas para Entrega."
        screenshot="/screenshots/banner-kanban.png"
        screenshotAlt="Quadro Kanban WillFlow para fotógrafos com sessões fotográficas organizadas por fases de produção: agendamento, captação, edição e entrega"
        features={[
          'Arraste sessões entre fases',
          'Cores por tipo de sessão',
          'Filtros por cliente e data',
          'Alertas de prazos',
        ]}
      />

      <FeatureSection
        icon={CalendarCheck}
        title="Calendário Sincronizado"
        description="Todas as sessões e entregas num calendário visual com sincronização Google Calendar bidirecional."
        screenshot="/screenshots/banner-calendario.png"
        screenshotAlt="Calendário WillFlow sincronizado com Google Calendar mostrando sessões fotográficas agendadas, datas de entrega e eventos de produção"
        features={[
          'Vista mensal, semanal e diária',
          'Sync com Google Calendar',
          'Arrastar para reagendar',
          'Eventos automáticos de projeto',
        ]}
        reversed
      />

      <FeatureSection
        icon={Users}
        title="CRM para Fotógrafos"
        description="Mantenha o histórico completo de cada cliente: sessões anteriores, preferências e comunicações."
        screenshot="/screenshots/banner-crm.png"
        screenshotAlt="CRM WillFlow para fotógrafos com ficha de cliente, histórico de sessões anteriores, notas de preferências e registo de comunicações"
        features={[
          'Ficha de cliente completa',
          'Histórico de sessões',
          'Notas e preferências',
          'Comunicações registadas',
        ]}
      />

      <FeatureSection
        icon={CreditCard}
        title="Controlo de Pagamentos"
        description="Nunca perca um pagamento. Visualize o que está pendente, vencido e quanto tem a receber."
        screenshot="/screenshots/banner-pagamentos.png"
        screenshotAlt="Gestão de pagamentos WillFlow para fotógrafos mostrando valores pendentes, pagamentos vencidos e relatório de cash flow por sessão"
        features={[
          'Pagamentos por sessão',
          'Alertas de vencimento',
          'Relatório de cash flow',
          'Export para contabilidade',
        ]}
        reversed
      />

      {/* Comparison Table */}
      <ComparisonTable
        title="WillFlow vs Excel / Notion"
        subtitle="Porque é que fotógrafos profissionais escolhem o WillFlow"
        competitorName="Excel/Notion"
        items={comparisonItems}
      />

      {/* Testimonials */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Fotógrafos que já usam o WillFlow
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-lg mb-4">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
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
            <Camera className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Comece hoje mesmo
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              🎉 30 dias grátis como bónus de lançamento! Sem cartão necessário.
            </p>
            <Link to="/auth?trial=true">
              <Button size="lg" className="gradient-primary">
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
