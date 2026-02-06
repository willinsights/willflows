import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Minus, Camera, Video, TrendingUp, CreditCard, Calendar, ArrowRight, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

type ComparisonStatus = boolean | 'partial';

const comparisonData: Array<{ feature: string; trello: ComparisonStatus; willflow: ComparisonStatus }> = [
  { feature: 'Kanban visual por fases', trello: true, willflow: true },
  { feature: 'Fases pré-configuradas para produção', trello: false, willflow: true },
  { feature: 'CRM integrado com clientes', trello: false, willflow: true },
  { feature: 'Gestão de pagamentos a receber', trello: false, willflow: true },
  { feature: 'Pagamentos a freelancers', trello: false, willflow: true },
  { feature: 'Calendário integrado', trello: 'partial', willflow: true },
  { feature: 'Margem de lucro por projeto', trello: false, willflow: true },
  { feature: 'Relatórios financeiros', trello: false, willflow: true },
  { feature: 'Chat de equipa integrado', trello: false, willflow: true },
  { feature: 'Alertas de prazos automáticos', trello: 'partial', willflow: true },
  { feature: 'Dashboard com métricas', trello: false, willflow: true },
  { feature: 'Interface em português', trello: true, willflow: true },
  { feature: 'Aprovação de vídeo com link para cliente', trello: false, willflow: true },
  { feature: 'Comparação A/B de versões', trello: false, willflow: true },
  { feature: 'Desenho de Timeline para edição', trello: false, willflow: true },
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
    icon: TrendingUp,
    title: 'Mais que um Kanban',
    description: 'Trello é um excelente quadro Kanban. WillFlow é um sistema completo com CRM, finanças e relatórios incluídos.',
  },
  {
    icon: CreditCard,
    title: 'Gestão Financeira',
    description: 'No Trello precisaria de Power-Ups pagos ou ferramentas externas. WillFlow tem tudo incluído desde o plano base.',
  },
  {
    icon: Camera,
    title: 'Feito para Produção Visual',
    description: 'Colunas como Captação, Edição, Color e Entrega já vêm prontas. Campos específicos para tipo de sessão, localização e equipa.',
  },
  {
    icon: Calendar,
    title: 'Calendário Inteligente',
    description: 'Eventos criados automaticamente a partir de projetos. Sincronização bidirecional com Google Calendar incluída.',
  },
  {
    icon: Film,
    title: 'Produção de Vídeo Completa',
    description: 'Envie um link ao cliente para aprovar vídeos, compare versões A/B lado a lado e defina a estrutura de edição com a Timeline. O Trello não tem funcionalidades de vídeo.',
  },
];

export default function VsTrello() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'WillFlow vs Trello: Qual o Melhor para Produção Visual?',
    description: 'Comparação detalhada entre WillFlow e Trello para gestão de projetos de fotografia e vídeo.',
    author: { '@type': 'Organization', name: 'WillFlow' },
    publisher: { '@type': 'Organization', name: 'WillFlow' },
    url: 'https://willflow.app/vs/trello',
  };

  return (
    <>
      <Helmet>
        <title>WillFlow vs Trello: Comparação para Fotógrafos e Videomakers</title>
        <meta 
          name="description" 
          content="Trello é simples e visual, mas WillFlow adiciona CRM, finanças e relatórios específicos para fotógrafos e videomakers." 
        />
        <link rel="canonical" href="https://willflow.app/vs/trello" />
        <meta property="og:title" content="WillFlow vs Trello: Comparação Completa" />
        <meta property="og:description" content="Kanban simples vs sistema completo para produção visual. Qual escolher?" />
        <meta property="og:url" content="https://willflow.app/vs/trello" />
        <meta property="og:type" content="article" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WillFlow vs Trello: Comparação Completa" />
        <meta name="twitter:description" content="Kanban simples vs sistema completo para produção visual. Qual escolher?" />
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
              { label: 'WillFlow vs Trello' }
            ]} 
            className="mb-8"
          />

          {/* Hero */}
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Video className="h-4 w-4" />
                Comparação 2026
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                WillFlow vs Trello
              </h1>
              <p className="text-xl text-muted-foreground">
                Trello é perfeito para listas e quadros simples. Mas para gerir 
                <span className="text-foreground font-medium"> projetos de foto e vídeo profissionalmente</span>, precisa de mais.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:block"
            >
              <img
                src="/screenshots/banner-dashboard-overview.png"
                alt="Dashboard WillFlow - sistema completo de gestão para produção visual"
                className="rounded-2xl shadow-2xl w-full"
                loading="eager"
              />
            </motion.div>
          </div>

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
                <div>Trello</div>
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
                    <StatusIcon status={item.trello} />
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
              Pronto para ir além do Kanban?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Teste o WillFlow grátis durante 30 dias. Migre do Trello sem perder produtividade.
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
