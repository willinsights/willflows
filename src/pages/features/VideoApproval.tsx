import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Film,
  Play,
  MessageSquare,
  CheckCircle,
  Upload,
  Eye,
  ArrowRight,
  Clock,
  GitCompare,
  Bell,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { RelatedFeatures } from '@/components/marketing/RelatedFeatures';
import { SEOHead } from '@/components/seo/SEOHead';

const flowSteps = [
  { icon: Upload, title: 'Upload', description: 'Carrega versão' },
  { icon: Eye, title: 'Review', description: 'Cliente visualiza' },
  { icon: MessageSquare, title: 'Feedback', description: 'Comentários timestamp' },
  { icon: CheckCircle, title: 'Aprovação', description: 'Cliente aprova' },
];

const comparisonItems: Array<{ feature: string; competitor: boolean | 'partial'; willflow: boolean }> = [
  { feature: 'Comentários por timestamp', competitor: true, willflow: true },
  { feature: 'Comparação de versões A/B', competitor: true, willflow: true },
  { feature: 'Integrado com gestão de projetos', competitor: false, willflow: true },
  { feature: 'CRM e clientes incluído', competitor: false, willflow: true },
  { feature: 'Kanban de produção', competitor: false, willflow: true },
  { feature: 'Pagamentos e finanças', competitor: false, willflow: true },
  { feature: 'Sem custos de egress', competitor: false, willflow: true },
  { feature: 'Preço acessível', competitor: false, willflow: true },
];

const features = [
  {
    icon: MessageSquare,
    title: 'Comentários por Timestamp',
    description: 'Clientes comentam no segundo exato usando timecode profissional SMPTE.',
  },
  {
    icon: GitCompare,
    title: 'Comparação A/B',
    description: 'Alterna entre versões mantendo o mesmo timecode para comparação direta.',
  },
  {
    icon: Bell,
    title: 'Notificações',
    description: 'Receba alertas quando clientes visualizam ou comentam os vídeos.',
  },
  {
    icon: Shield,
    title: 'Links Seguros',
    description: 'Tokens únicos por cliente. Protegido contra indexação de motores de pesquisa.',
  },
  {
    icon: Clock,
    title: 'Retenção Automática',
    description: 'Ficheiros eliminados 7 dias após conclusão para optimizar custos.',
  },
  {
    icon: Play,
    title: 'Streaming Optimizado',
    description: 'HLS adaptativo para reprodução fluida em qualquer conexão.',
  },
];

const seoSchema = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
      { "@type": "ListItem", "position": 2, "name": "Funcionalidades", "item": "https://willflow.app/funcionalidades" },
      { "@type": "ListItem", "position": 3, "name": "Aprovação de Vídeo", "item": "https://willflow.app/funcionalidades/video-approval" }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "WillFlow Aprovação de Vídeo",
    "description": "Portal de review de vídeo para clientes com comentários por timestamp e comparação de versões",
    "brand": { "@type": "Brand", "name": "WillFlow" },
    "category": "Video Review Software",
    "offers": {
      "@type": "Offer",
      "price": "42",
      "priceCurrency": "EUR",
      "priceValidUntil": "2026-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Incluído no plano Studio"
    }
  }
];

export default function VideoApprovalFeature() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Aprovação de Vídeo | WillFlow - Alternativa ao Frame.io"
        description="Portal de review de vídeo para clientes. Comentários por timestamp SMPTE, comparação de versões A/B e aprovação online. Exclusivo plano Studio."
        canonical="/funcionalidades/video-approval"
        schemaData={seoSchema}
      />
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-6 bg-gradient-to-r from-primary to-purple-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Exclusivo Plano Studio
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                🎬 Aprovação de Vídeo{' '}
                <span className="gradient-text">para Clientes</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Portal de review integrado onde clientes comentam por timestamp, 
                comparam versões e aprovam online. Alternativa ao Frame.io incluída no WillFlow.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?trial=true">
                  <Button size="lg" className="gradient-primary w-full sm:w-auto">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Começar 30 dias grátis
                  </Button>
                </Link>
                <Link to="/planos">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Ver plano Studio
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                ✓ Incluído no plano Studio · ✓ Sem custos de egress
              </p>
            </motion.div>

            {/* Hero Screenshot */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-12 relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-50" />
              <img
                src="/screenshots/banner-video-approval.png"
                alt="Interface WillFlow de aprovação de vídeo com player, comentários por timestamp e comparação de versões"
                title="Aprovação de Vídeo para Clientes"
                className="relative rounded-2xl shadow-2xl border border-border/50 w-full max-w-4xl mx-auto"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Flow Diagram */}
      <FlowDiagram
        title="Fluxo de Aprovação Simplificado"
        subtitle="Do upload à aprovação final em 4 passos"
        steps={flowSteps}
        direction="horizontal"
      />

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Tudo o que precisa para review profissional
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades de nível Frame.io integradas no seu fluxo de trabalho
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections with Details */}
      <FeatureSection
        icon={MessageSquare}
        title="Comentários por Timecode SMPTE"
        description="Clientes clicam no vídeo para marcar o segundo exato. Formato profissional HH:MM:SS:FF usado pela indústria."
        screenshot="/screenshots/banner-studio-review.png"
        screenshotAlt="Interface de comentários por timestamp no WillFlow mostrando feedback de cliente com timecode SMPTE profissional"
        features={[
          'Click-to-comment no player',
          'Timecode preciso ao frame',
          'Respostas aninhadas',
          'Marcar como resolvido',
        ]}
      />

      <FeatureSection
        icon={GitCompare}
        title="Comparação de Versões A/B"
        description="Carregue múltiplas versões (V1, V2, V3...) e alterne instantaneamente mantendo o mesmo timecode."
        screenshot="/screenshots/screenshot-calendario-full.png"
        screenshotAlt="Comparação de versões A/B no WillFlow permitindo alternar entre V1 e V2 do vídeo no mesmo timestamp"
        features={[
          'Upload ilimitado de versões',
          'Toggle instantâneo V1/V2',
          'Mesmo timestamp preservado',
          'Histórico completo',
        ]}
        reversed
      />

      <FeatureSection
        icon={Shield}
        title="Portal Seguro para Clientes"
        description="Links únicos por projeto. Protegidos contra indexação e com política de retenção automática."
        screenshot="/screenshots/screenshot-dashboard-estudio.png"
        screenshotAlt="Portal seguro Studio Review do WillFlow com link único para cliente visualizar e aprovar vídeos"
        features={[
          'Token único por cliente',
          'Noindex, nofollow automático',
          'Retenção de 7 dias pós-conclusão',
          'Identificação do cliente',
        ]}
      />

      {/* Comparison Table */}
      <ComparisonTable
        title="WillFlow vs Frame.io"
        subtitle="Funcionalidades de review incluídas, sem custos extra"
        competitorName="Frame.io"
        items={comparisonItems}
      />

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10" />
            <div className="relative z-10">
              <Film className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Pronto para simplificar aprovações?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Experimente o plano Studio com 30 dias grátis. Inclui aprovação de vídeo, 
                timeline design e 10GB de armazenamento.
              </p>
              <Link to="/auth?trial=true">
                <Button size="lg" className="gradient-primary">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Começar teste grátis
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Related Features */}
      <RelatedFeatures currentFeature="/funcionalidades/video-approval" />

      <PublicFooter />
    </div>
  );
}
