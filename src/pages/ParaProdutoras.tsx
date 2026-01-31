import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Film,
  Video,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  ArrowRight,
  Star,
  Sparkles,
  CheckCircle,
  Clapperboard,
  Clock,
  FolderKanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { AutoBreadcrumbs } from '@/components/seo/Breadcrumbs';

const flowSteps = [
  { icon: Clapperboard, title: 'Pré-Produção', description: 'Briefing e planeamento' },
  { icon: Video, title: 'Produção', description: 'Filmagem no terreno' },
  { icon: Film, title: 'Pós-Produção', description: 'Edição e efeitos' },
  { icon: CheckCircle, title: 'Revisão', description: 'Feedback do cliente' },
  { icon: Star, title: 'Entrega', description: 'Projeto finalizado' },
];

const comparisonItems: Array<{ feature: string; competitor: boolean | 'partial'; willflow: boolean }> = [
  { feature: 'Kanban por fases de produção', competitor: 'partial', willflow: true },
  { feature: 'Campos específicos para vídeo', competitor: false, willflow: true },
  { feature: 'Gestão de equipa de filmagem', competitor: 'partial', willflow: true },
  { feature: 'Calendário de produções', competitor: true, willflow: true },
  { feature: 'Orçamentos e margens', competitor: false, willflow: true },
  { feature: 'Pagamento de freelancers', competitor: false, willflow: true },
  { feature: 'Chat por projeto', competitor: 'partial', willflow: true },
  { feature: 'Relatórios financeiros', competitor: false, willflow: true },
];

const productionTypes = [
  'Vídeos Corporativos',
  'Documentários',
  'Publicidade',
  'Eventos ao Vivo',
  'Videoclips',
  'Conteúdo para Redes Sociais',
  'Filmes Institucionais',
  'Streaming e Webinars',
];

const testimonials = [
  {
    name: 'Miguel Ferreira',
    role: 'Produtor Executivo, Lighthouse Films',
    text: 'O WillFlow entende o fluxo de uma produtora. As fases do Kanban fazem todo o sentido para o nosso trabalho.',
  },
  {
    name: 'Ana Rodrigues',
    role: 'Diretora de Operações, Visually',
    text: 'Finalmente conseguimos ver a margem real de cada produção. Os relatórios são fantásticos.',
  },
];

const keyFeatures = [
  {
    icon: FolderKanban,
    title: 'Pré, Produção, Pós',
    description: 'Kanban configurado para as fases reais de produção audiovisual.',
  },
  {
    icon: Users,
    title: 'Equipas por projeto',
    description: 'Aloque realizadores, operadores, editores e freelancers por produção.',
  },
  {
    icon: Clock,
    title: 'Calendário de filmagens',
    description: 'Veja todas as produções agendadas. Sincronização com Google Calendar.',
  },
  {
    icon: CreditCard,
    title: 'Orçamentos completos',
    description: 'Custos de equipamento, locações, equipa. Margens calculadas automaticamente.',
  },
];

export default function ParaProdutoras() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>WillFlow para Produtoras | Gestão de Produção Audiovisual</title>
        <meta name="description" content="Software de gestão para produtoras de vídeo e cinema. Organize pré-produção, filmagem e pós-produção. Gerencie equipas, orçamentos e entregas. 30 dias grátis." />
        <link rel="canonical" href="https://willflow.app/para-produtoras" />
        <meta property="og:title" content="WillFlow para Produtoras | Gestão de Produção Audiovisual" />
        <meta property="og:description" content="Software de gestão para produtoras de vídeo e cinema. Organize todas as fases de produção." />
        <meta property="og:url" content="https://willflow.app/para-produtoras" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WillFlow para Produtoras | Gestão de Produção Audiovisual" />
        <meta name="twitter:description" content="Software de gestão para produtoras de vídeo e cinema." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Para Produtoras", "item": "https://willflow.app/para-produtoras" }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow para Produtoras",
            "description": "Sistema de gestão de produção audiovisual para produtoras de vídeo e cinema",
            "brand": { "@type": "Brand", "name": "WillFlow" },
            "offers": {
              "@type": "Offer",
              "price": "29",
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

      <div className="pt-24 pb-4 px-4">
        <div className="container mx-auto">
          <AutoBreadcrumbs />
        </div>
      </div>

      {/* Hero */}
      <section className="pt-8 pb-16 px-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Film className="h-4 w-4" />
                Para Produtoras
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Gestão completa para{' '}
                <span className="gradient-text">produção audiovisual</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Da pré-produção à entrega final. Organize filmagens, equipas, 
                orçamentos e prazos numa única plataforma feita para produtoras.
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
                alt="Kanban WillFlow para produtoras mostrando fases de pré-produção, produção e pós-produção"
                className="relative rounded-2xl shadow-2xl border border-border/50"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Production Types */}
      <section className="py-12 px-4 border-y border-border bg-muted/30">
        <div className="container mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Ideal para todos os tipos de produção
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {productionTypes.map((type) => (
              <span
                key={type}
                className="px-4 py-2 rounded-full bg-background border border-border text-sm"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Feito para produtoras</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Cada funcionalidade foi pensada para o fluxo de trabalho específico de produção audiovisual.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {keyFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6 text-center"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Diagram */}
      <FlowDiagram
        title="O ciclo de vida de uma produção"
        subtitle="Do briefing inicial à entrega do master final"
        steps={flowSteps}
        direction="horizontal"
      />

      {/* Feature Sections */}
      <FeatureSection
        icon={FolderKanban}
        title="Kanban por Fases de Produção"
        description="Visualize todas as suas produções organizadas por fase: Pré-Produção, Em Filmagem, Edição, Revisão, Entregue."
        screenshot="/screenshots/screenshot-kanban-full.png"
        features={[
          'Colunas personalizáveis por fase',
          'Arraste projetos entre fases',
          'Filtros por cliente e data',
          'Alertas de prazos',
        ]}
      />

      <FeatureSection
        icon={Calendar}
        title="Calendário de Produções"
        description="Veja todas as filmagens e entregas num calendário visual. Sincronização bidirecional com Google Calendar."
        screenshot="/screenshots/screenshot-calendario-full.png"
        features={[
          'Vista mensal, semanal e diária',
          'Dias de filmagem destacados',
          'Sync com Google Calendar',
          'Notificações automáticas',
        ]}
        reversed
      />

      <FeatureSection
        icon={Users}
        title="Gestão de Equipa de Produção"
        description="Aloque realizadores, diretores de fotografia, operadores de câmara e editores por projeto."
        screenshot="/screenshots/screenshot-permissoes.png"
        features={[
          'Equipas por produção',
          'Freelancers integrados',
          'Histórico de colaborações',
          'Permissões por role',
        ]}
      />

      <FeatureSection
        icon={BarChart3}
        title="Orçamentos e Margens"
        description="Saiba exatamente quanto ganha em cada produção. Custos de equipa, equipamento e locações centralizados."
        screenshot="/screenshots/screenshot-relatorios-3m.png"
        features={[
          'Orçamento por produção',
          'Despesas categorizadas',
          'Margem calculada automaticamente',
          'Relatórios financeiros',
        ]}
        reversed
      />

      {/* Comparison Table */}
      <ComparisonTable
        title="WillFlow vs Ferramentas Genéricas"
        subtitle="Software específico vs adaptações improvisadas"
        competitorName="Trello/Notion"
        items={comparisonItems}
      />

      {/* Testimonials */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Produtoras que usam o WillFlow
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
            <Film className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Produza mais, organize melhor
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
