import { Helmet } from 'react-helmet-async';
import {
  Calendar,
  CalendarDays,
  CalendarClock,
  RefreshCw,
  GripVertical,
  Palette,
  Bell,
  Globe,
  FolderKanban,
  CheckCircle,
} from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FeatureHero } from '@/components/marketing/FeatureHero';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { RelatedFeatures } from '@/components/marketing/RelatedFeatures';
import { AutoBreadcrumbs } from '@/components/seo/Breadcrumbs';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const flowSteps = [
  {
    icon: FolderKanban,
    title: 'Projeto Criado',
    description: 'Novo projeto no Kanban',
  },
  {
    icon: Calendar,
    title: 'Evento Automático',
    description: 'Data aparece no calendário',
  },
  {
    icon: RefreshCw,
    title: 'Sync Google',
    description: 'Sincroniza bidireccionalmente',
  },
  {
    icon: Bell,
    title: 'Notificação',
    description: 'Lembrete antes do evento',
  },
];

const comparisonItems = [
  { feature: 'Vista mês/semana/dia', competitor: true, willflow: true },
  { feature: 'Eventos de projeto automáticos', competitor: false, willflow: true },
  { feature: 'Sincronização Google Calendar', competitor: false, willflow: true },
  { feature: 'Drag & drop para reagendar', competitor: true, willflow: true },
  { feature: 'Cores por tipo de evento', competitor: true, willflow: true },
  { feature: 'Contexto do projeto visível', competitor: false, willflow: true },
  { feature: 'Notificações integradas', competitor: 'partial' as const, willflow: true },
  { feature: 'Filtros por equipa', competitor: false, willflow: true },
];

export default function CalendarioFeature() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Calendário com Google Sync | WillFlow - Agenda Integrada para Produtoras</title>
        <meta
          name="description"
          content="Calendário integrado com sincronização Google Calendar. Eventos de projeto automáticos, drag & drop para reagendar, vistas flexíveis e notificações."
        />
        <link rel="canonical" href="https://willflow.app/funcionalidades/calendario" />
        <meta property="og:title" content="Calendário com Google Sync | WillFlow" />
        <meta property="og:description" content="Calendário integrado com sincronização Google Calendar e eventos de projeto automáticos." />
        <meta property="og:url" content="https://willflow.app/funcionalidades/calendario" />
        <meta property="og:type" content="product" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Calendário com Google Sync | WillFlow" />
        <meta name="twitter:description" content="Calendário integrado com sincronização Google Calendar e eventos de projeto automáticos." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow Calendário",
            "description": "Calendário integrado com Google Calendar para gestão de produção visual.",
            "brand": { "@type": "Brand", "name": "WillFlow" },
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "EUR",
              "lowPrice": "0",
              "highPrice": "49.99"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Funcionalidades", "item": "https://willflow.app/funcionalidades" },
              { "@type": "ListItem", "position": 3, "name": "Calendário", "item": "https://willflow.app/funcionalidades/calendario" }
            ]
          })}
        </script>
      </Helmet>

      <PublicHeader />

      <div className="pt-24 pb-4 px-4">
        <div className="container mx-auto">
          <AutoBreadcrumbs />
        </div>
      </div>

      <FeatureHero
        icon={Calendar}
        badge="Agenda Integrada"
        title="Calendário que"
        titleHighlight="Trabalha Consigo"
        subtitle="Todos os seus compromissos num só lugar. Sincronização com Google Calendar, eventos de projeto automáticos e vistas flexíveis."
        screenshot="/screenshots/screenshot-calendario-full.png"
      />

      <FlowDiagram
        title="Do Projeto ao Calendário Automaticamente"
        subtitle="Nunca mais esqueça uma sessão ou prazo"
        steps={flowSteps}
        direction="horizontal"
      />

      <FeatureSection
        icon={CalendarDays}
        title="Vistas Flexíveis"
        description="Veja a sua agenda como preferir. Vista de mês para planeamento, semana para gestão diária, ou dia para foco total."
        screenshot="/screenshots/screenshot-calendario-full.png"
        features={[
          'Vista de mês completo',
          'Vista de semana detalhada',
          'Vista de dia focada',
          'Navegação rápida entre datas',
        ]}
      />

      <FeatureSection
        icon={RefreshCw}
        title="Sincronização Google Calendar"
        description="Conecte o seu Google Calendar e veja todos os eventos num só lugar. Sincronização bidirecional — crie no WillFlow, aparece no Google e vice-versa."
        screenshot="/screenshots/screenshot-dashboard-light-full.png"
        features={[
          'Sincronização bidirecional',
          'Múltiplos calendários Google',
          'Sync automático em tempo real',
          'Escolher o que sincronizar',
        ]}
        reversed
      />

      <FeatureSection
        icon={CalendarClock}
        title="Eventos de Projeto"
        description="Quando cria um projeto com data de sessão, o evento aparece automaticamente no calendário. Com todos os detalhes do projeto visíveis."
        screenshot="/screenshots/screenshot-projeto-modal.png"
        features={[
          'Eventos criados automaticamente',
          'Detalhes do projeto no evento',
          'Cores por tipo de projeto',
          'Click para abrir o projeto',
        ]}
      />

      <FeatureSection
        icon={GripVertical}
        title="Reagendar com Drag & Drop"
        description="Mudou a data da sessão? Arraste o evento para o novo dia. O projeto é atualizado automaticamente."
        screenshot="/screenshots/screenshot-kanban-full.png"
        features={[
          'Arrastar para nova data',
          'Ajustar horário facilmente',
          'Projeto atualizado automaticamente',
          'Histórico de alterações',
        ]}
        reversed
      />

      <ComparisonTable
        title="WillFlow Calendário vs Google Calendar Standalone"
        subtitle="Mais do que uma agenda — um calendário de produção"
        competitorName="Google Calendar"
        items={comparisonItems}
      />

      <RelatedFeatures currentFeature="/funcionalidades/calendario" />

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <Calendar className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Organize a Sua Agenda de Produção
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              30 dias grátis. Sem cartão necessário. Conecte o Google Calendar e comece já.
            </p>
            <Link to="/auth?trial=true">
              <Button size="lg" className="gradient-primary">
                Começar agora
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
