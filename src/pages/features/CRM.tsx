import { Helmet } from 'react-helmet-async';
import {
  Users,
  UserCircle,
  History,
  FileText,
  MessageSquare,
  BarChart3,
  Tag,
  Building,
  Mail,
  Phone,
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
import { ArrowRight, FolderKanban, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const flowSteps = [
  {
    icon: UserCircle,
    title: 'Cliente',
    description: 'Ficha completa com todos os dados',
  },
  {
    icon: FolderKanban,
    title: 'Projetos',
    description: 'Histórico de todos os trabalhos',
  },
  {
    icon: CreditCard,
    title: 'Pagamentos',
    description: 'Receita total e pendentes',
  },
  {
    icon: BarChart3,
    title: 'Métricas',
    description: 'Análise de valor do cliente',
  },
];

const comparisonItems = [
  { feature: 'Ficha de cliente completa', competitor: true, willflow: true },
  { feature: 'Histórico de projetos', competitor: false, willflow: true },
  { feature: 'Receita por cliente', competitor: false, willflow: true },
  { feature: 'Notas e comunicações', competitor: 'partial' as const, willflow: true },
  { feature: 'Integrado com Kanban', competitor: false, willflow: true },
  { feature: 'Chat por projeto', competitor: false, willflow: true },
  { feature: 'Tags personalizadas', competitor: true, willflow: true },
  { feature: 'Sem limite de contactos', competitor: 'partial' as const, willflow: true },
];

export default function CRMFeature() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>CRM para Criativos | WillFlow - Gestão de Clientes para Fotógrafos e Videomakers</title>
        <meta
          name="description"
          content="CRM simples e poderoso para freelancers e produtoras. Gestão de clientes com histórico de projetos, pagamentos, notas e comunicações integradas."
        />
        <link rel="canonical" href="https://willflow.app/funcionalidades/crm" />
        <meta property="og:title" content="CRM para Criativos | WillFlow" />
        <meta property="og:description" content="CRM simples e poderoso para freelancers e produtoras. Gestão de clientes integrada com projetos." />
        <meta property="og:url" content="https://willflow.app/funcionalidades/crm" />
        <meta property="og:type" content="product" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CRM para Criativos | WillFlow" />
        <meta name="twitter:description" content="CRM simples e poderoso para freelancers e produtoras. Gestão de clientes integrada com projetos." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow CRM",
            "description": "CRM integrado para gestão de clientes de produtoras visuais.",
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
              { "@type": "ListItem", "position": 3, "name": "CRM", "item": "https://willflow.app/funcionalidades/crm" }
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
        icon={Users}
        badge="Gestão de Clientes"
        title="CRM Feito para"
        titleHighlight="Criativos"
        subtitle="Conheça os seus clientes como nunca. Histórico completo de projetos, pagamentos e comunicações — tudo num só lugar."
        screenshot="/screenshots/banner-crm.png"
      />

      <FlowDiagram
        title="Visão 360º de Cada Cliente"
        subtitle="Toda a informação que precisa, organizada e acessível"
        steps={flowSteps}
        direction="horizontal"
      />

      <FeatureSection
        icon={UserCircle}
        title="Ficha de Cliente Completa"
        description="Todos os dados do cliente organizados. Nome, empresa, contactos, morada, NIF para faturação — tudo acessível instantaneamente."
        screenshot="/screenshots/screenshot-dashboard-light-full.png"
        features={[
          'Dados de contacto completos',
          'Empresa e NIF para faturação',
          'Morada e localização',
          'Campos personalizados',
        ]}
      />

      <FeatureSection
        icon={History}
        title="Histórico de Projetos"
        description="Veja todos os projetos realizados para cada cliente. Saiba exatamente o que foi feito, quando, e quanto rendeu."
        screenshot="/screenshots/screenshot-projeto-modal.png"
        features={[
          'Lista de todos os projetos',
          'Status atual de cada projeto',
          'Datas de início e conclusão',
          'Acesso rápido aos detalhes',
        ]}
        reversed
      />

      <FeatureSection
        icon={BarChart3}
        title="Métricas por Cliente"
        description="Saiba quanto cada cliente vale para o seu negócio. Receita total, projetos ativos, média por projeto."
        screenshot="/screenshots/screenshot-relatorios-6m.png"
        features={[
          'Receita total do cliente',
          'Número de projetos',
          'Valor médio por projeto',
          'Pagamentos pendentes',
        ]}
      />

      <FeatureSection
        icon={FileText}
        title="Notas e Comunicações"
        description="Registe notas internas e histórico de comunicações. Nunca mais esqueça detalhes importantes sobre um cliente."
        screenshot="/screenshots/screenshot-calendario-full.png"
        features={[
          'Notas internas por cliente',
          'Histórico de contactos',
          'Preferências do cliente',
          'Alertas e lembretes',
        ]}
        reversed
      />

      <ComparisonTable
        title="WillFlow CRM vs Excel / HubSpot"
        subtitle="Um CRM que percebe o seu negócio"
        competitorName="Excel / HubSpot"
        items={comparisonItems}
      />

      <RelatedFeatures currentFeature="/funcionalidades/crm" />

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <Users className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Conheça Melhor os Seus Clientes
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              30 dias grátis. Sem cartão necessário. Comece a construir relações mais fortes hoje.
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
