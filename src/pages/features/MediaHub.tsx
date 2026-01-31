import { Helmet } from 'react-helmet-async';
import {
  FolderOpen,
  Link as LinkIcon,
  Search,
  ExternalLink,
  FolderKanban,
  Video,
  HardDrive,
  Cloud,
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
    title: 'Projeto',
    description: 'Ficheiros guardados no NAS',
  },
  {
    icon: LinkIcon,
    title: 'Adicionar Link',
    description: 'Cole o link externo',
  },
  {
    icon: Search,
    title: 'Pesquisar',
    description: 'Encontre por projeto ou cliente',
  },
  {
    icon: ExternalLink,
    title: 'Aceder',
    description: 'Um click para abrir',
  },
];

const comparisonItems = [
  { feature: 'Links organizados por projeto', competitor: false, willflow: true },
  { feature: 'Pesquisa centralizada', competitor: false, willflow: true },
  { feature: 'Suporte NAS local', competitor: 'partial' as const, willflow: true },
  { feature: 'Integração Vimeo/YouTube', competitor: 'partial' as const, willflow: true },
  { feature: 'Google Drive links', competitor: true, willflow: true },
  { feature: 'Sem limite de links', competitor: true, willflow: true },
  { feature: 'Contexto do cliente', competitor: false, willflow: true },
  { feature: 'Histórico de projetos', competitor: false, willflow: true },
];

export default function MediaHubFeature() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Media Hub | WillFlow - Gestão de Links de Media para Produtoras</title>
        <meta
          name="description"
          content="Centralize todos os links de media dos seus projetos. NAS, Vimeo, YouTube, Google Drive — tudo organizado e pesquisável num só lugar."
        />
        <link rel="canonical" href="https://willflow.app/funcionalidades/media-hub" />
        <meta property="og:title" content="Media Hub | WillFlow" />
        <meta property="og:description" content="Centralize todos os links de media dos seus projetos num só lugar." />
        <meta property="og:url" content="https://willflow.app/funcionalidades/media-hub" />
        <meta property="og:type" content="product" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Media Hub | WillFlow" />
        <meta name="twitter:description" content="Centralize todos os links de media dos seus projetos num só lugar." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow Media Hub",
            "description": "Gestão centralizada de links de media para produtoras visuais.",
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
              { "@type": "ListItem", "position": 3, "name": "Media Hub", "item": "https://willflow.app/funcionalidades/media-hub" }
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
        icon={FolderOpen}
        badge="Gestão de Media"
        title="Todos os Ficheiros,"
        titleHighlight="Um Só Lugar"
        subtitle="Links do NAS, Vimeo, YouTube, Google Drive — organizados por projeto e pesquisáveis em segundos. Acabou a caça ao ficheiro."
        screenshot="/screenshots/screenshot-dashboard-light-full.png"
      />

      <FlowDiagram
        title="Do NAS ao Click de Acesso"
        subtitle="Organize uma vez, acesse sempre"
        steps={flowSteps}
        direction="horizontal"
      />

      <FeatureSection
        icon={HardDrive}
        title="Links de NAS Organizados"
        description="O seu NAS continua a ser o armazém. O WillFlow é o índice. Cole links para pastas do NAS e aceda rapidamente por projeto."
        screenshot="/screenshots/screenshot-projeto-modal.png"
        features={[
          'Links para pastas do NAS',
          'Organização por projeto',
          'Descrição do conteúdo',
          'Acesso com um click',
        ]}
      />

      <FeatureSection
        icon={Video}
        title="Integração Vimeo e YouTube"
        description="Cole links de vídeos finais publicados. Mantenha referência ao trabalho entregue junto com o projeto."
        screenshot="/screenshots/screenshot-captacao-estudio.png"
        features={[
          'Links Vimeo privados',
          'Links YouTube',
          'Preview do vídeo',
          'Histórico de versões',
        ]}
        reversed
      />

      <FeatureSection
        icon={Cloud}
        title="Google Drive e Dropbox"
        description="Links para pastas partilhadas com clientes ou colaboradores. Tudo centralizado na ficha do projeto."
        screenshot="/screenshots/screenshot-kanban-full.png"
        features={[
          'Links Google Drive',
          'Links Dropbox',
          'Links WeTransfer',
          'Qualquer URL externa',
        ]}
      />

      <FeatureSection
        icon={Search}
        title="Pesquisa Centralizada"
        description="Encontre ficheiros de qualquer projeto em segundos. Pesquise por nome do projeto, cliente ou tipo de media."
        screenshot="/screenshots/screenshot-dashboard-dark-full.png"
        features={[
          'Pesquisa instantânea',
          'Filtros por projeto',
          'Filtros por cliente',
          'Filtros por tipo de media',
        ]}
        reversed
      />

      <ComparisonTable
        title="WillFlow Media Hub vs Pastas Soltas"
        subtitle="Organização vs caos de ficheiros"
        competitorName="Pastas / Bookmarks"
        items={comparisonItems}
      />

      <RelatedFeatures currentFeature="/funcionalidades/media-hub" />

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <FolderOpen className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Organize os Seus Ficheiros de Vez
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              30 dias grátis. Sem cartão necessário. Centralize todos os links num só lugar.
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
