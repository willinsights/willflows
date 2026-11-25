import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Video, DollarSign, Users, Zap, ArrowRight, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { CompetitorComparison } from '@/components/marketing/CompetitorComparison';
import { ReleaseBadge } from '@/components/marketing/ReleaseBadge';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

const keyDifferences = [
  {
    icon: Zap,
    title: 'Simplicidade vs Complexidade',
    description: 'ClickUp tem centenas de funcionalidades. WillFlow tem exatamente o que fotógrafos e filmmakers precisam — nada mais, nada menos.',
  },
  {
    icon: DollarSign,
    title: 'Finanças Integradas',
    description: 'Recebimentos, pagamentos a freelancers e lucro por projeto já vêm no WillFlow, sem montar campos ou fórmulas.',
  },
  {
    icon: Camera,
    title: 'Workflow de Produção Visual',
    description: 'Fases como Captação, Edição, Color e Entrega já vêm configuradas. No ClickUp, teria de criar tudo do zero.',
  },
  {
    icon: Users,
    title: 'CRM para Clientes Criativos',
    description: 'Histórico de sessões, comunicações e projetos por cliente. Sem configurar listas ou campos personalizados.',
  },
  {
    icon: Film,
    title: 'Review de Vídeo Nativo',
    description: 'Clientes aprovam vídeos via link seguro, com comparação A/B de versões e timeline de segmentos para guiar a edição. E no 2.0, galerias de fotografia com favoritas, comentários na foto e venda de extras (plano Studio).',
  },
];

export default function VsClickUp() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'WillFlow vs ClickUp: Qual o Melhor para Produção Visual?',
    description: 'Comparação detalhada entre WillFlow e ClickUp para gestão de projetos de fotografia e vídeo.',
    author: { '@type': 'Organization', name: 'WillFlow' },
    publisher: { '@type': 'Organization', name: 'WillFlow' },
    url: 'https://willflow.app/vs/clickup',
  };

  return (
    <>
      <Helmet>
        <title>WillFlow vs ClickUp: Comparação para Fotógrafos e Videomakers</title>
        <meta 
          name="description" 
          content="ClickUp é poderoso mas complexo. Descubra por que WillFlow é a escolha certa para fotógrafos e filmmakers que querem simplicidade." 
        />
        <link rel="canonical" href="https://willflow.app/vs/clickup" />
        <meta property="og:title" content="WillFlow vs ClickUp: Comparação Completa" />
        <meta property="og:description" content="Simplicidade focada vs complexidade generalista. Qual é melhor para produção visual?" />
        <meta property="og:url" content="https://willflow.app/vs/clickup" />
        <meta property="og:type" content="article" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WillFlow vs ClickUp: Comparação Completa" />
        <meta name="twitter:description" content="Simplicidade focada vs complexidade generalista. Qual é melhor para produção visual?" />
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
              { label: 'WillFlow vs ClickUp' }
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
                WillFlow vs ClickUp
              </h1>
              <p className="text-xl text-muted-foreground">
                ClickUp é uma ferramenta poderosa para qualquer equipa. Mas se trabalha com 
                <span className="text-foreground font-medium"> fotografia ou vídeo</span>, o WillFlow foi feito para si.
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
          <section aria-labelledby="comparacao" className="max-w-5xl mx-auto mb-20">
            <div className="mb-8 text-center">
              <div className="mb-3 flex justify-center"><ReleaseBadge kind="versao" /></div>
              <h2 id="comparacao" className="text-3xl font-bold">WillFlow 2.0 vs ClickUp, funcionalidade a funcionalidade</h2>
              <p className="mt-3 text-muted-foreground">Organizado por área. As funcionalidades marcadas com NOVO chegaram no WillFlow 2.0.</p>
            </div>
            <CompetitorComparison competitor="clickup" />
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
              Pronto para simplificar a gestão?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Teste o WillFlow grátis durante 7 dias. Sem configurações complexas, sem curva de aprendizagem.
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
