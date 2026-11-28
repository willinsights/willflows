import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Video, TrendingUp, CreditCard, Calendar, ArrowRight, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { CompetitorComparison } from '@/components/marketing/CompetitorComparison';
import { ReleaseBadge } from '@/components/marketing/ReleaseBadge';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

const keyDifferences = [
  {
    icon: TrendingUp,
    title: 'Mais que um Kanban',
    description: 'Trello é um excelente quadro Kanban. WillFlow é um sistema completo com CRM, finanças e relatórios incluídos.',
  },
  {
    icon: CreditCard,
    title: 'Gestão Financeira',
    description: 'No Trello isto depende de Power-Ups ou ferramentas externas. No WillFlow, recebimentos, freelancers e lucro estão em todos os planos.',
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
    description: 'Envie um link ao cliente para aprovar vídeos, compare versões A/B lado a lado e defina a estrutura de edição com a Timeline. E no 2.0, galerias de fotografia para o cliente (plano Studio).',
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
                className="w-full h-auto"
                loading="eager"
              />
            </motion.div>
          </div>

          {/* Comparison Table */}
          <section aria-labelledby="comparacao" className="max-w-5xl mx-auto mb-20">
            <div className="mb-8 text-center">
              <div className="mb-3 flex justify-center"><ReleaseBadge kind="versao" /></div>
              <h2 id="comparacao" className="text-3xl font-bold">WillFlow 2.0 vs Trello, funcionalidade a funcionalidade</h2>
              <p className="mt-3 text-muted-foreground">Organizado por área. As funcionalidades marcadas com NOVO chegaram no WillFlow 2.0.</p>
            </div>
            <CompetitorComparison competitor="trello" />
            <div className="mt-8 flex justify-center">
              <Button size="lg" className="gradient-primary" asChild>
                <Link to="/auth?trial=true">Começar 7 dias grátis<ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </section>

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
              Teste o WillFlow grátis durante 7 dias. Migre do Trello sem perder produtividade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-primary" asChild>
                <Link to="/auth?trial=true">
                  Começar 7 dias grátis
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
