import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Video,
  CalendarCheck,
  Users,
  CreditCard,
  FolderOpen,
  CheckSquare,
  Clock,
  ArrowRight,
  Star,
  Sparkles,
  Clapperboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const features = [
  {
    icon: Clapperboard,
    title: 'Fases de Produção',
    description: 'Kanban com fases específicas: Pré-produção, Filmagem, Edição, Color, Entrega.',
  },
  {
    icon: CalendarCheck,
    title: 'Calendário de Produções',
    description: 'Visualize todas as filmagens e deadlines com sincronização Google Calendar.',
  },
  {
    icon: Users,
    title: 'Gestão de Equipa',
    description: 'Atribua tarefas a operadores de câmara, editores e coloristas.',
  },
  {
    icon: CreditCard,
    title: 'Orçamentos & Pagamentos',
    description: 'Controle custos de produção, freelancers e pagamentos de clientes.',
  },
  {
    icon: FolderOpen,
    title: 'Media Hub',
    description: 'Centralize links de drives, proxies, masters e entregas Vimeo/YouTube.',
  },
  {
    icon: CheckSquare,
    title: 'Checklists de Produção',
    description: 'Checklists por fase: equipamento, autorizações, deliverables.',
  },
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

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Video className="h-4 w-4" />
              Para Videomakers
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Gestão completa para{' '}
              <span className="gradient-text">produções de vídeo</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Organize todas as suas produções, da pré-produção à entrega final. 
              Perfeito para freelancers e produtoras.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Ferramentas para cada fase da produção
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Do briefing à entrega, tudo organizado num fluxo visual.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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

      {/* Workflow */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              O fluxo de produção perfeito
            </h2>
          </div>
          <div className="space-y-8">
            {[
              { step: '1', title: 'Briefing & Orçamento', description: 'Registe o cliente, defina o scope e crie o orçamento do projeto.' },
              { step: '2', title: 'Pré-produção', description: 'Planeie locais, equipa e equipamento com checklists.' },
              { step: '3', title: 'Filmagem', description: 'Acompanhe a produção no Kanban. Marque tarefas e notas de set.' },
              { step: '4', title: 'Pós-produção', description: 'Edição, color e sound design organizados por fase.' },
              { step: '5', title: 'Entrega', description: 'Adicione links de entrega e marque como concluído.' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex gap-6 items-start"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
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
            <Clock className="h-12 w-12 text-primary mx-auto mb-6" />
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
