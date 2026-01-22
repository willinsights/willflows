import { Helmet } from 'react-helmet-async';
import {
  BarChart3,
  TrendingUp,
  Users,
  FolderKanban,
  PieChart,
  Calendar,
  ArrowUpDown,
  Target,
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
    title: 'Dados',
    description: 'Projetos, clientes, pagamentos',
  },
  {
    icon: BarChart3,
    title: 'Análise',
    description: 'Processamento automático',
  },
  {
    icon: TrendingUp,
    title: 'Insights',
    description: 'Tendências e padrões',
  },
  {
    icon: Target,
    title: 'Decisões',
    description: 'Ações informadas',
  },
];

const comparisonItems = [
  { feature: 'Top clientes por receita', competitor: 'partial' as const, willflow: true },
  { feature: 'Projetos por categoria', competitor: true, willflow: true },
  { feature: 'Tendências mensais', competitor: 'partial' as const, willflow: true },
  { feature: 'Performance da equipa', competitor: false, willflow: true },
  { feature: 'Comparação de períodos', competitor: 'partial' as const, willflow: true },
  { feature: 'Margens por projeto', competitor: false, willflow: true },
  { feature: 'Dados em tempo real', competitor: false, willflow: true },
  { feature: 'Sem fórmulas manuais', competitor: false, willflow: true },
];

export default function RelatoriosFeature() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Relatórios e Analytics | WillFlow - Análise de Desempenho para Produtoras</title>
        <meta
          name="description"
          content="Analise o desempenho do seu negócio. Top clientes, projetos por categoria, tendências mensais, performance da equipa e muito mais."
        />
        <link rel="canonical" href="https://willflow.app/funcionalidades/relatorios" />
        <meta property="og:title" content="Relatórios e Analytics | WillFlow" />
        <meta property="og:description" content="Analise o desempenho do seu negócio com relatórios visuais e detalhados." />
        <meta property="og:url" content="https://willflow.app/funcionalidades/relatorios" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow Relatórios",
            "description": "Analytics e relatórios para gestão de produtoras visuais.",
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
              { "@type": "ListItem", "position": 3, "name": "Relatórios", "item": "https://willflow.app/funcionalidades/relatorios" }
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
        icon={BarChart3}
        badge="Analytics"
        title="Dados que"
        titleHighlight="Contam Histórias"
        subtitle="Entenda o seu negócio com relatórios visuais. Top clientes, tendências, performance da equipa — tudo atualizado em tempo real."
        screenshot="/screenshots/screenshot-relatorios-6m.png"
      />

      <FlowDiagram
        title="De Dados a Decisões"
        subtitle="Transforme informação em ação"
        steps={flowSteps}
        direction="horizontal"
      />

      <FeatureSection
        icon={Users}
        title="Top Clientes por Receita"
        description="Saiba quem são os seus melhores clientes. Veja quem gera mais receita, quantos projetos fizeram, e como evoluem ao longo do tempo."
        screenshot="/screenshots/screenshot-relatorios-6m.png"
        features={[
          'Ranking de clientes por receita',
          'Número de projetos por cliente',
          'Valor médio por projeto',
          'Evolução ao longo do tempo',
        ]}
      />

      <FeatureSection
        icon={PieChart}
        title="Projetos por Categoria"
        description="Entenda que tipos de projeto dominam o seu negócio. Fotografia vs vídeo, eventos vs comercial, hotéis vs restaurantes."
        screenshot="/screenshots/screenshot-relatorios-3m.png"
        features={[
          'Distribuição por tipo',
          'Distribuição por categoria',
          'Comparação de margens',
          'Tendências por segmento',
        ]}
        reversed
      />

      <FeatureSection
        icon={TrendingUp}
        title="Tendências Mensais"
        description="Veja como o seu negócio evolui mês a mês. Receita, número de projetos, margem média — tudo em gráficos claros."
        screenshot="/screenshots/screenshot-dashboard-light-full.png"
        features={[
          'Gráfico de receita mensal',
          'Comparação com período anterior',
          'Projeções baseadas em tendência',
          'Sazonalidade identificada',
        ]}
      />

      <FeatureSection
        icon={ArrowUpDown}
        title="Performance da Equipa"
        description="Acompanhe a produtividade de cada membro. Projetos atribuídos, concluídos, tempo médio por fase."
        screenshot="/screenshots/screenshot-permissoes.png"
        features={[
          'Projetos por membro',
          'Taxa de conclusão',
          'Tempo médio por fase',
          'Carga de trabalho atual',
        ]}
        reversed
      />

      <ComparisonTable
        title="WillFlow Relatórios vs Excel Manual"
        subtitle="Insights automáticos vs horas de trabalho manual"
        competitorName="Excel Manual"
        items={comparisonItems}
      />

      <RelatedFeatures currentFeature="/funcionalidades/relatorios" />

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Tome Decisões Baseadas em Dados
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              30 dias grátis. Sem cartão necessário. Veja o seu negócio de forma diferente.
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
