import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Minus, Camera, Video, Users, CreditCard, Calendar, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

type ComparisonStatus = boolean | 'partial';

const comparisonData: Array<{ feature: string; asana: ComparisonStatus; willflow: ComparisonStatus }> = [
  { feature: 'Kanban visual por fases de produção', asana: 'partial', willflow: true },
  { feature: 'Campos específicos para foto/vídeo', asana: false, willflow: true },
  { feature: 'CRM integrado com clientes', asana: false, willflow: true },
  { feature: 'Gestão de pagamentos a receber', asana: false, willflow: true },
  { feature: 'Pagamentos a freelancers', asana: false, willflow: true },
  { feature: 'Calendário com Google Calendar', asana: true, willflow: true },
  { feature: 'Margem de lucro por projeto', asana: false, willflow: true },
  { feature: 'Relatórios financeiros', asana: 'partial', willflow: true },
  { feature: 'Chat de equipa integrado', asana: false, willflow: true },
  { feature: 'Export Excel/PDF', asana: true, willflow: true },
  { feature: 'Preço acessível para freelancers', asana: false, willflow: true },
  { feature: 'Interface em português', asana: false, willflow: true },
];

const StatusIcon = ({ status }: { status: boolean | 'partial' }) => {
  if (status === true) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <Minus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30">
      <X className="h-5 w-5 text-red-600 dark:text-red-400" />
    </div>
  );
};

const keyDifferences = [
  {
    icon: Camera,
    title: 'Feito para Criativos',
    description: 'WillFlow foi desenhado especificamente para fotógrafos e filmmakers, com campos e fluxos adaptados à produção visual.',
  },
  {
    icon: CreditCard,
    title: 'Gestão Financeira Integrada',
    description: 'Controle pagamentos de clientes, freelancers e custos extra num só lugar. O Asana não tem módulo financeiro.',
  },
  {
    icon: Users,
    title: 'CRM Nativo',
    description: 'Histórico de clientes, comunicações e projetos ligados automaticamente. No Asana precisaria de integrações externas.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios de Margem',
    description: 'Veja a margem de lucro real de cada projeto. No Asana, não há cálculos financeiros automáticos.',
  },
];

export default function VsAsana() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'WillFlow vs Asana: Qual o Melhor para Produção Visual?',
    description: 'Comparação detalhada entre WillFlow e Asana para gestão de projetos de fotografia e vídeo.',
    author: { '@type': 'Organization', name: 'WillFlow' },
    publisher: { '@type': 'Organization', name: 'WillFlow' },
    url: 'https://willflow.app/vs/asana',
  };

  return (
    <>
      <Helmet>
        <title>WillFlow vs Asana: Comparação para Fotógrafos e Videomakers</title>
        <meta 
          name="description" 
          content="Descubra as diferenças entre WillFlow e Asana para gestão de projetos de fotografia e vídeo. CRM, pagamentos e relatórios incluídos." 
        />
        <link rel="canonical" href="https://willflow.app/vs/asana" />
        <meta property="og:title" content="WillFlow vs Asana: Comparação Completa" />
        <meta property="og:description" content="Descubra qual ferramenta é melhor para gerir projetos de fotografia e vídeo." />
        <meta property="og:url" content="https://willflow.app/vs/asana" />
        <meta property="og:type" content="article" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WillFlow vs Asana: Comparação Completa" />
        <meta name="twitter:description" content="Descubra qual ferramenta é melhor para gerir projetos de fotografia e vídeo." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <PublicHeader />

      <main className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <Breadcrumbs 
            items={[
              { label: 'Comparações', href: '/vs' },
              { label: 'WillFlow vs Asana' }
            ]} 
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
              Comparação 2026
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              WillFlow vs Asana
            </h1>
            <p className="text-xl text-muted-foreground">
              Asana é excelente para equipas generalistas, mas o WillFlow foi criado especificamente para 
              <span className="text-foreground font-medium"> fotógrafos, filmmakers e produtoras</span>.
            </p>
          </motion.div>

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mx-auto mb-20"
          >
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold text-center">
                <div className="text-left pl-4">Funcionalidade</div>
                <div>Asana</div>
                <div className="text-primary">WillFlow</div>
              </div>
              
              {comparisonData.map((item, index) => (
                <motion.div
                  key={item.feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className={`grid grid-cols-3 p-4 items-center ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  }`}
                >
                  <div className="text-sm font-medium pl-4">{item.feature}</div>
                  <div className="flex justify-center">
                    <StatusIcon status={item.asana} />
                  </div>
                  <div className="flex justify-center">
                    <StatusIcon status={item.willflow} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Key Differences */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12">
              Por que escolher WillFlow?
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {keyDifferences.map((diff, index) => (
                <motion.div
                  key={diff.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <diff.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{diff.title}</h3>
                  <p className="text-muted-foreground">{diff.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Pronto para experimentar a diferença?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Teste o WillFlow grátis durante 30 dias. Sem cartão de crédito, sem compromisso.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-primary" asChild>
                <Link to="/auth?trial=true">
                  Começar teste grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/funcionalidades">Ver funcionalidades</Link>
              </Button>
            </div>
          </motion.section>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
