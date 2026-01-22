import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Video, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

const comparisons = [
  {
    name: 'Asana',
    slug: 'asana',
    tagline: 'Gestão de projetos generalista vs especializada',
    highlights: ['Sem CRM integrado', 'Sem gestão financeira', 'Curva de aprendizagem alta'],
    willflowWins: ['CRM nativo', 'Pagamentos integrados', 'Fases de produção visual'],
  },
  {
    name: 'ClickUp',
    slug: 'clickup',
    tagline: 'Complexidade vs simplicidade focada',
    highlights: ['Centenas de funcionalidades', 'Configuração demorada', 'Precisa de add-ons'],
    willflowWins: ['Interface simples', 'Pronto a usar', 'Tudo incluído'],
  },
  {
    name: 'Trello',
    slug: 'trello',
    tagline: 'Kanban simples vs sistema completo',
    highlights: ['Apenas quadros Kanban', 'Sem finanças', 'Power-Ups pagos'],
    willflowWins: ['CRM + Kanban + Finanças', 'Relatórios incluídos', 'Dashboard completo'],
  },
];

export default function ComparisonsHub() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Comparações - WillFlow vs Concorrentes',
    description: 'Compare o WillFlow com Asana, ClickUp, Trello e outras ferramentas de gestão de projetos.',
    url: 'https://willflow.app/vs',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: comparisons.map((comp, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://willflow.app/vs/${comp.slug}`,
        name: `WillFlow vs ${comp.name}`,
      })),
    },
  };

  return (
    <>
      <Helmet>
        <title>Comparações - WillFlow vs Asana, ClickUp, Trello</title>
        <meta 
          name="description" 
          content="Compare o WillFlow com ferramentas populares como Asana, ClickUp e Trello. Descubra qual é a melhor para fotógrafos e videomakers." 
        />
        <link rel="canonical" href="https://willflow.app/vs" />
        <meta property="og:title" content="Comparações - WillFlow vs Concorrentes" />
        <meta property="og:description" content="Compare o WillFlow com Asana, ClickUp, Trello e outras ferramentas de gestão de projetos." />
        <meta property="og:url" content="https://willflow.app/vs" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <PublicHeader />

      <main className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <Breadcrumbs 
            items={[{ label: 'Comparações' }]} 
            className="mb-8"
          />

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Video className="h-4 w-4" />
              Comparações 2026
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              WillFlow vs Alternativas
            </h1>
            <p className="text-xl text-muted-foreground">
              Descubra por que o WillFlow é a escolha certa para 
              <span className="text-foreground font-medium"> fotógrafos, filmmakers e produtoras</span> 
              {' '}que querem gerir projetos de forma profissional.
            </p>
          </motion.div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            {comparisons.map((comp, index) => (
              <motion.div
                key={comp.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-2xl font-bold mb-2">
                  WillFlow vs {comp.name}
                </h2>
                <p className="text-muted-foreground mb-6">{comp.tagline}</p>

                <div className="mb-6">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Limitações do {comp.name}:
                  </p>
                  <ul className="space-y-1">
                    {comp.highlights.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <p className="text-sm font-medium text-primary mb-2">
                    Vantagens do WillFlow:
                  </p>
                  <ul className="space-y-1">
                    {comp.willflowWins.map((item) => (
                      <li key={item} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button className="w-full" variant="outline" asChild>
                  <Link to={`/vs/${comp.slug}`}>
                    Ver comparação completa
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Pronto para experimentar?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Teste o WillFlow grátis durante 30 dias. Sem cartão de crédito, sem compromisso.
            </p>
            <Button size="lg" className="gradient-primary" asChild>
              <Link to="/auth?trial=true">
                Começar teste grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.section>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
