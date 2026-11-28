import { Helmet } from 'react-helmet-async';
import { Images, Link as LinkIcon, Heart, Droplets, Clock, ArrowRight, Upload, Send, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FeatureHero } from '@/components/marketing/FeatureHero';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { RelatedFeatures } from '@/components/marketing/RelatedFeatures';
import { AutoBreadcrumbs } from '@/components/seo/Breadcrumbs';
import { Button } from '@/components/ui/button';

const flowSteps = [
  { icon: Upload, title: 'Carregar', description: 'Envie as fotos para a galeria do projeto' },
  { icon: Send, title: 'Partilhar', description: 'O cliente recebe um link privado' },
  { icon: Heart, title: 'Escolher', description: 'O cliente marca as favoritas' },
  { icon: CheckCircle, title: 'Entregar', description: 'Download das fotos finais' },
];

const desc = 'Galerias de fotos privadas para entregar sessões aos clientes: link seguro, favoritas, marca de água, download e data de expiração, ligadas ao projeto.';

export default function GaleriaFeature() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Galeria de Fotos para Fotógrafos | WillFlow</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href="https://willflow.app/funcionalidades/galeria" />
        <meta property="og:title" content="Galeria de Fotos para Fotógrafos | WillFlow" />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content="https://willflow.app/funcionalidades/galeria" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://willflow.app' },
              { '@type': 'ListItem', position: 2, name: 'Funcionalidades', item: 'https://willflow.app/funcionalidades' },
              { '@type': 'ListItem', position: 3, name: 'Galeria de Fotos', item: 'https://willflow.app/funcionalidades/galeria' },
            ],
          })}
        </script>
      </Helmet>

      <PublicHeader />
      <div className="pt-24 pb-4 px-4"><div className="container mx-auto"><AutoBreadcrumbs /></div></div>

      <FeatureHero
        icon={Images}
        badge="Para fotógrafos"
        title="Entregue as fotos numa"
        titleHighlight="galeria privada"
        subtitle="Cada projeto tem a sua galeria. O cliente abre um link seguro, escolhe as favoritas e descarrega as fotos — sem WeTransfer nem pastas soltas."
        screenshot="/screenshots/banner-dashboard-overview.png"
      />

      <FlowDiagram title="Da sessão à entrega" subtitle="Tudo dentro do mesmo projeto" steps={flowSteps} direction="horizontal" />

      <FeatureSection
        icon={LinkIcon}
        title="Link privado para o cliente"
        description="O cliente vê a galeria por um link único, sem precisar de criar conta. Só quem tem o link consegue abrir."
        screenshot="/screenshots/banner-dashboard-overview.png"
        features={['Sem conta para o cliente', 'Funciona no telemóvel', 'Ligada ao projeto e ao cliente']}
      />
      <FeatureSection
        icon={Heart}
        title="Favoritas e seleção"
        description="O cliente marca as fotos de que mais gosta e você vê logo a seleção no projeto."
        screenshot="/screenshots/banner-kanban.png"
        features={['Marcar favoritas', 'Ver a seleção no estúdio', 'Menos emails de ida e volta']}
        reversed
      />
      <FeatureSection
        icon={Droplets}
        title="Marca de água e download"
        description="Mostre as provas com marca de água e liberte o download quando quiser."
        screenshot="/screenshots/banner-pagamentos.png"
        features={['Marca de água nas provas', 'Download controlado por si', 'Registo de quando o cliente descarregou']}
      />
      <FeatureSection
        icon={Clock}
        title="Data de expiração"
        description="Defina até quando a galeria fica disponível e mantenha o espaço de armazenamento organizado."
        screenshot="/screenshots/banner-calendario.png"
        features={['Expiração por galeria', 'Espaço usado visível no plano', 'Entrega simples']}
        reversed
      />

      <RelatedFeatures currentFeature="/funcionalidades/galeria" />

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-8 sm:p-12 text-center max-w-3xl mx-auto">
            <Images className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Entregue a próxima sessão com o WillFlow</h2>
            <p className="text-lg text-muted-foreground mb-8">7 dias grátis. Sem cartão necessário.</p>
            <Link to="/auth?trial=true">
              <Button size="lg" className="gradient-primary">Começar agora<ArrowRight className="ml-2 h-5 w-5" /></Button>
            </Link>
          </motion.div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
