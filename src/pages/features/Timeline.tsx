import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clapperboard,
  Clock,
  Layers,
  Copy,
  Move,
  ArrowRight,
  Timer,
  Layout,
  Save,
  Sparkles,
  FileVideo,
  Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { RelatedFeatures } from '@/components/marketing/RelatedFeatures';
import { SEOHead } from '@/components/seo/SEOHead';

const features = [
  {
    icon: Layers,
    title: 'Segmentos Visuais',
    description: 'Defina a estrutura do vídeo: Intro, Hook, Conteúdo, CTA, Outro.',
  },
  {
    icon: Timer,
    title: 'Durações Precisas',
    description: 'Especifique duração mínima e máxima para cada segmento (ex: 5-7s).',
  },
  {
    icon: Move,
    title: 'Drag & Drop',
    description: 'Reordene segmentos arrastando. A timeline actualiza automaticamente.',
  },
  {
    icon: Save,
    title: 'Templates Reutilizáveis',
    description: 'Guarde estruturas como templates para usar em projetos futuros.',
  },
  {
    icon: Ruler,
    title: 'Timecode SMPTE',
    description: 'Formato profissional HH:MM:SS:FF para precisão ao frame.',
  },
  {
    icon: FileVideo,
    title: 'Por Tarefa ou Projeto',
    description: 'Associe timelines a tarefas específicas ou ao projeto inteiro.',
  },
];

const useCases = [
  { title: 'Vídeos Corporativos', example: 'Intro 5s → Logo 3s → Conteúdo 60s → CTA 5s' },
  { title: 'Reels/Shorts', example: 'Hook 3s → Problema 5s → Solução 10s → CTA 3s' },
  { title: 'Casamentos', example: 'Teaser 30s → Preparativos 2min → Cerimónia 3min → Festa 2min' },
  { title: 'Documentários', example: 'Abertura 2min → Cap.1 5min → Cap.2 5min → Conclusão 2min' },
];

const seoSchema = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
      { "@type": "ListItem", "position": 2, "name": "Funcionalidades", "item": "https://willflow.app/funcionalidades" },
      { "@type": "ListItem", "position": 3, "name": "Desenho de Timeline", "item": "https://willflow.app/funcionalidades/timeline" }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "WillFlow Desenho de Timeline",
    "description": "Ferramenta de estruturação visual para edição de vídeo com segmentos e durações",
    "brand": { "@type": "Brand", "name": "WillFlow" },
    "category": "Video Editing Software",
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

export default function TimelineFeature() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Desenho de Timeline | WillFlow - Estrutura Visual para Edição"
        description="Ferramenta de estruturação visual para edição de vídeo. Defina segmentos, durações e guie editores com templates reutilizáveis. Exclusivo plano Studio."
        canonical="/funcionalidades/timeline"
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
                🎞️ Desenho de Timeline{' '}
                <span className="gradient-text">para Edição</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Estruture visualmente os seus vídeos antes de editar. 
                Defina segmentos, durações e guie a equipa com templates reutilizáveis.
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
                ✓ Incluído no plano Studio · ✓ Templates ilimitados
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visual Timeline Example */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Visualize a estrutura antes de editar
            </h2>
            <p className="text-muted-foreground">
              Exemplo de timeline para um vídeo corporativo de 90 segundos
            </p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="glass-card p-6 overflow-x-auto">
              <div className="flex gap-2 min-w-[600px]">
                {[
                  { name: 'Intro', duration: '5s', color: 'bg-blue-500/20 border-blue-500/50' },
                  { name: 'Logo', duration: '3s', color: 'bg-purple-500/20 border-purple-500/50' },
                  { name: 'Problema', duration: '15s', color: 'bg-orange-500/20 border-orange-500/50' },
                  { name: 'Solução', duration: '30s', color: 'bg-green-500/20 border-green-500/50' },
                  { name: 'Features', duration: '25s', color: 'bg-cyan-500/20 border-cyan-500/50' },
                  { name: 'CTA', duration: '7s', color: 'bg-pink-500/20 border-pink-500/50' },
                  { name: 'Outro', duration: '5s', color: 'bg-gray-500/20 border-gray-500/50' },
                ].map((segment, index) => (
                  <motion.div
                    key={segment.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className={`flex-1 min-w-[70px] p-4 rounded-lg border-2 ${segment.color} text-center`}
                  >
                    <p className="font-medium text-sm">{segment.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{segment.duration}</p>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                <span>00:00:00:00</span>
                <span>Total: 01:30</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Ferramentas de estruturação profissional
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tudo o que precisa para planear vídeos antes da edição
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

      {/* Use Cases */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Templates para cada tipo de produção
            </h2>
            <p className="text-muted-foreground">
              Exemplos de estruturas comuns que pode guardar e reutilizar
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Layout className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{useCase.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground font-mono bg-muted/50 p-3 rounded-lg">
                  {useCase.example}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <FeatureSection
        icon={Move}
        title="Arraste e Reorganize"
        description="Interface drag & drop intuitiva. Mova segmentos e veja a timeline actualizar automaticamente."
        screenshot="/screenshots/screenshot-kanban-full.png"
        screenshotAlt="Interface drag and drop do WillFlow para reorganizar segmentos de timeline de vídeo"
        features={[
          'Drag & drop fluido',
          'Reordenação instantânea',
          'Undo/redo suportado',
          'Preview em tempo real',
        ]}
      />

      <FeatureSection
        icon={Copy}
        title="Templates Reutilizáveis"
        description="Guarde estruturas como templates. Aplique a novos projetos com um clique."
        screenshot="/screenshots/screenshot-calendario-full.png"
        screenshotAlt="Biblioteca de templates de timeline do WillFlow para reutilizar estruturas de vídeo"
        features={[
          'Guardar como template',
          'Biblioteca de templates',
          'Aplicar a novos projetos',
          'Editar templates existentes',
        ]}
        reversed
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
              <Clapperboard className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Estruture os seus vídeos como um profissional
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Experimente o plano Studio com 30 dias grátis. Inclui desenho de timeline, 
                aprovação de vídeo e 10GB de armazenamento.
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
      <RelatedFeatures currentFeature="/funcionalidades/timeline" />

      <PublicFooter />
    </div>
  );
}
