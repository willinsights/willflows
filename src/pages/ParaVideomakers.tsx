import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Video,
  CalendarCheck,
  Users,
  CreditCard,
  FolderOpen,
  ArrowRight,
  Star,
  Sparkles,
  FileText,
  Clapperboard,
  Film,
  Palette,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';

const flowSteps = [
  { icon: FileText, title: 'Briefing', description: 'Scope e orçamento' },
  { icon: Clapperboard, title: 'Pré-Produção', description: 'Planeamento' },
  { icon: Film, title: 'Filmagem', description: 'Produção' },
  { icon: Palette, title: 'Pós-Produção', description: 'Edição e color' },
  { icon: CheckCircle, title: 'Entrega', description: 'Master final' },
];

const comparisonItems: Array<{ feature: string; competitor: boolean | 'partial'; willflow: boolean }> = [
  { feature: 'Kanban com fases de vídeo', competitor: false, willflow: true },
  { feature: 'Timeline de produções', competitor: 'partial', willflow: true },
  { feature: 'Gestão de equipa', competitor: false, willflow: true },
  { feature: 'Orçamentos por projeto', competitor: 'partial', willflow: true },
  { feature: 'Media links centralizados', competitor: false, willflow: true },
  { feature: 'Pagamentos de freelancers', competitor: false, willflow: true },
  { feature: 'Chat integrado por projeto', competitor: false, willflow: true },
  { feature: 'Relatórios de produção', competitor: false, willflow: true },
];

const testimonials = [
  {
    name: 'João Ferreira',
    role: 'Filmmaker Freelancer',
    text: 'O WillFlow é perfeito para gerir várias produções em simultâneo. O Kanban visual é exatamente o que precisava.',
  },
  {
    name: 'Ana Rodrigues',
    role: 'Produtora Executiva',
    text: 'Finalmente consigo ver todos os projetos da equipa num só lugar. As fases automáticas poupam imenso tempo.',
  },
];

const useCases = [
  'Vídeos Corporativos',
  'Casamentos & Eventos',
  'Documentários',
  'Publicidade',
  'Conteúdo Social Media',
  'Videoclips Musicais',
];

export default function ParaVideomakers() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>WillFlow para Videomakers | Gestão de Produções de Vídeo</title>
        <meta name="description" content="Sistema de gestão para videomakers e produtoras. Organize produções, equipas e entregas. Kanban com fases de vídeo, timeline de projetos e controlo financeiro. 30 dias grátis." />
        <link rel="canonical" href="https://willflow.app/para-videomakers" />
        <meta property="og:title" content="WillFlow para Videomakers | Gestão de Produções de Vídeo" />
        <meta property="og:description" content="Sistema de gestão para videomakers e produtoras. Organize produções, equipas e entregas. 30 dias grátis." />
        <meta property="og:url" content="https://willflow.app/para-videomakers" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="WillFlow para Videomakers | Gestão de Produções de Vídeo" />
        <meta name="twitter:description" content="Sistema de gestão para videomakers e produtoras. Organize produções, equipas e entregas. 30 dias grátis." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Para Videomakers", "item": "https://willflow.app/para-videomakers" }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow para Videomakers",
            "description": "Sistema de gestão de produções desenhado para videomakers e produtoras",
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
              "ratingValue": "4.8",
              "reviewCount": "67"
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
                <Video className="h-4 w-4" />
                Para Videomakers
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Gestão completa para{' '}
                <span className="gradient-text">produções de vídeo</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Organize todas as suas produções, da pré-produção à entrega final. 
                Perfeito para freelancers e produtoras.
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
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-3xl blur-3xl" />
              <img
                src="/screenshots/screenshot-kanban-full.png"
                alt="Kanban WillFlow para produções de vídeo"
                className="relative rounded-2xl shadow-2xl border border-border/50"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 px-4 border-y border-border bg-muted/30">
        <div className="container mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Ideal para todos os tipos de produção
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
        title="O fluxo de produção perfeito"
        subtitle="Do briefing ao master final, tudo automatizado"
        steps={flowSteps}
        direction="horizontal"
      />

      {/* Feature Sections with Screenshots */}
      <FeatureSection
        icon={Clapperboard}
        title="Kanban com Fases de Produção"
        description="Colunas específicas para vídeo: Briefing, Pré-produção, Filmagem, Edição, Color, Som e Entrega."
        screenshot="/screenshots/screenshot-kanban-full.png"
        features={[
          'Fases personalizáveis',
          'Arraste projetos entre fases',
          'Cores por tipo de produção',
          'Filtros por equipa',
        ]}
      />

      <FeatureSection
        icon={CalendarCheck}
        title="Timeline de Produções"
        description="Visualize todas as filmagens e deadlines num calendário visual com sync Google Calendar."
        screenshot="/screenshots/screenshot-calendario-full.png"
        features={[
          'Vista de timeline',
          'Sync bidirecional',
          'Alertas de deadline',
          'Eventos de equipa',
        ]}
        reversed
      />

      <FeatureSection
        icon={Users}
        title="Gestão de Equipa"
        description="Atribua tarefas a operadores, editores, coloristas e designers de som. Veja quem está livre."
        screenshot="/screenshots/screenshot-dashboard-estudio.png"
        features={[
          'Membros por projeto',
          'Permissões por função',
          'Chat de equipa',
          'Notificações em tempo real',
        ]}
      />

      <FeatureSection
        icon={CreditCard}
        title="Orçamentos & Pagamentos"
        description="Controle custos de produção, pagamentos a freelancers e faturas de clientes num só lugar."
        screenshot="/screenshots/screenshot-pagamentos-estudio.png"
        features={[
          'Orçamento por projeto',
          'Custos de freelancers',
          'Pagamentos de clientes',
          'Margem de lucro automática',
        ]}
        reversed
      />

      <FeatureSection
        icon={FolderOpen}
        title="Media Hub Centralizado"
        description="Centralize todos os links: drives, proxies, masters, entregas Vimeo/YouTube e mais."
        screenshot="/screenshots/screenshot-relatorios-6m.png"
        features={[
          'Links por projeto',
          'Categorias de media',
          'Histórico de versões',
          'Partilha com cliente',
        ]}
      />

      <FeatureSection
        icon={BarChart3}
        title="Relatórios de Produção"
        description="Veja a performance da sua produtora: projetos por mês, receita, margens e tendências."
        screenshot="/screenshots/screenshot-relatorios-3m.png"
        features={[
          'Dashboard financeiro',
          'Projetos por categoria',
          'Análise de margem',
          'Export para Excel',
        ]}
        reversed
      />

      {/* Comparison Table */}
      <ComparisonTable
        title="WillFlow vs Frame.io / Notion"
        subtitle="Porque é que produtoras profissionais escolhem o WillFlow"
        competitorName="Frame.io/Notion"
        items={comparisonItems}
      />

      {/* Testimonials */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Videomakers que já usam o WillFlow
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
            <Video className="h-12 w-12 text-primary mx-auto mb-6" />
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
