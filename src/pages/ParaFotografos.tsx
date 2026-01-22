import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Camera,
  CalendarCheck,
  Users,
  CreditCard,
  FolderOpen,
  CheckSquare,
  Clock,
  ArrowRight,
  Star,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const features = [
  {
    icon: Camera,
    title: 'Gestão de Sessões',
    description: 'Organize todas as suas sessões fotográficas num único lugar. Da captação à entrega.',
  },
  {
    icon: CalendarCheck,
    title: 'Calendário Integrado',
    description: 'Visualize todas as sessões agendadas com sincronização Google Calendar.',
  },
  {
    icon: Users,
    title: 'CRM para Fotógrafos',
    description: 'Mantenha o histórico completo de cada cliente e suas preferências.',
  },
  {
    icon: CreditCard,
    title: 'Controlo de Pagamentos',
    description: 'Acompanhe pagamentos pendentes, datas de vencimento e cash flow.',
  },
  {
    icon: FolderOpen,
    title: 'Galerias Organizadas',
    description: 'Centralize links de entrega, galerias online e ficheiros de cada sessão.',
  },
  {
    icon: CheckSquare,
    title: 'Checklists por Sessão',
    description: 'Nunca esqueça um passo com checklists personalizáveis por tipo de sessão.',
  },
];

const testimonials = [
  {
    name: 'Mariana Costa',
    role: 'Fotógrafa de Casamentos',
    text: 'O WillFlow mudou a forma como organizo os meus casamentos. Consigo ver tudo numa só plataforma.',
  },
  {
    name: 'Pedro Santos',
    role: 'Fotógrafo de Produto',
    text: 'Finalmente um sistema feito para fotógrafos. Os checklists por sessão são geniais.',
  },
];

const useCases = [
  'Casamentos e Eventos',
  'Fotografia de Produto',
  'Retratos e Lifestyle',
  'Fotografia Imobiliária',
  'Sessões Newborn',
  'Fotografia Corporativa',
];

export default function ParaFotografos() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>WillFlow para Fotógrafos | Gestão de Sessões e Clientes</title>
        <meta name="description" content="Sistema de gestão completo para fotógrafos. Organize sessões, clientes, pagamentos e entregas. Kanban visual, CRM integrado e calendário. 30 dias grátis." />
        <link rel="canonical" href="https://willflow.app/para-fotografos" />
        <meta property="og:title" content="WillFlow para Fotógrafos | Gestão de Sessões e Clientes" />
        <meta property="og:description" content="Sistema de gestão completo para fotógrafos. Organize sessões, clientes, pagamentos e entregas. 30 dias grátis." />
        <meta property="og:url" content="https://willflow.app/para-fotografos" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="WillFlow para Fotógrafos | Gestão de Sessões e Clientes" />
        <meta name="twitter:description" content="Sistema de gestão completo para fotógrafos. Organize sessões, clientes, pagamentos e entregas. 30 dias grátis." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Para Fotógrafos", "item": "https://willflow.app/para-fotografos" }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow para Fotógrafos",
            "description": "Sistema de gestão de projetos desenhado para fotógrafos profissionais",
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
              "ratingValue": "4.9",
              "reviewCount": "89"
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
              <Camera className="h-4 w-4" />
              Para Fotógrafos
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Gestão completa para o seu{' '}
              <span className="gradient-text">estúdio fotográfico</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Organize todas as suas sessões, clientes e pagamentos num só lugar. 
              Do primeiro contacto à entrega final.
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
            Ideal para todos os tipos de fotografia
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
              Tudo o que precisa para gerir sessões
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ferramentas específicas para o fluxo de trabalho de fotógrafos profissionais.
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
              Fotógrafos que já usam o WillFlow
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
              O seu fluxo de trabalho, simplificado
            </h2>
          </div>
          <div className="space-y-8">
            {[
              { step: '1', title: 'Novo Cliente', description: 'Registe o cliente e crie o projeto com todos os detalhes da sessão.' },
              { step: '2', title: 'Sessão Fotográfica', description: 'Acompanhe a sessão no Kanban. Marque tarefas e checklists.' },
              { step: '3', title: 'Edição', description: 'A fase de edição abre automaticamente após a captação.' },
              { step: '4', title: 'Entrega', description: 'Adicione links de galeria e marque como entregue.' },
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
