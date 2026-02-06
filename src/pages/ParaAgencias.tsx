import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  FolderKanban,
  CreditCard,
  BarChart3,
  Calendar,
  ArrowRight,
  Star,
  Sparkles,
  CheckCircle,
  Shield,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { FlowDiagram } from '@/components/marketing/FlowDiagram';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { AutoBreadcrumbs } from '@/components/seo/Breadcrumbs';

const flowSteps = [
  { icon: Building2, title: 'Briefing', description: 'Recepção do projeto' },
  { icon: Users, title: 'Alocação', description: 'Equipa definida' },
  { icon: FolderKanban, title: 'Produção', description: 'Fases do projeto' },
  { icon: BarChart3, title: 'Revisão', description: 'Controlo de qualidade' },
  { icon: CheckCircle, title: 'Entrega', description: 'Cliente satisfeito' },
];

const comparisonItems: Array<{ feature: string; competitor: boolean | 'partial'; willflow: boolean }> = [
  { feature: 'Gestão multi-projeto', competitor: true, willflow: true },
  { feature: 'Permissões por equipa', competitor: 'partial', willflow: true },
  { feature: 'Dashboard financeiro', competitor: false, willflow: true },
  { feature: 'Campos específicos para produção', competitor: false, willflow: true },
  { feature: 'Pagamento de freelancers', competitor: false, willflow: true },
  { feature: 'Relatórios de margem', competitor: false, willflow: true },
  { feature: 'Chat interno por projeto', competitor: 'partial', willflow: true },
  { feature: 'Calendário sincronizado', competitor: true, willflow: true },
];

const challenges = [
  {
    icon: Users,
    problem: 'Equipa dispersa',
    solution: 'Todos os membros, freelancers e projetos numa única plataforma com permissões granulares.',
  },
  {
    icon: CreditCard,
    problem: 'Controlo financeiro caótico',
    solution: 'Saiba exatamente quanto ganha e gasta em cada projeto. Margens calculadas automaticamente.',
  },
  {
    icon: MessageSquare,
    problem: 'Comunicação fragmentada',
    solution: 'Chat integrado por projeto. Histórico completo de conversas com toda a equipa.',
  },
  {
    icon: BarChart3,
    problem: 'Sem visibilidade de performance',
    solution: 'Relatórios em tempo real de receita, despesas, projetos pendentes e muito mais.',
  },
];

const testimonials = [
  {
    name: 'Ricardo Almeida',
    role: 'Diretor Criativo, Agência Pixel',
    text: 'Gerimos mais de 50 projetos por mês. O WillFlow deu-nos a visibilidade que precisávamos.',
  },
  {
    name: 'Sofia Mendes',
    role: 'COO, Studio Creative',
    text: 'A funcionalidade de pagamentos a freelancers poupou-nos horas de trabalho administrativo.',
  },
];

export default function ParaAgencias() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>WillFlow para Agências | Gestão de Produção e Equipas</title>
        <meta name="description" content="Software de gestão para agências de produção audiovisual. Gerencie múltiplos projetos, equipas, freelancers e finanças. Dashboard completo e relatórios em tempo real." />
        <link rel="canonical" href="https://willflow.app/para-agencias" />
        <meta property="og:title" content="WillFlow para Agências | Gestão de Produção e Equipas" />
        <meta property="og:description" content="Software de gestão para agências de produção audiovisual. Gerencie múltiplos projetos, equipas e finanças." />
        <meta property="og:url" content="https://willflow.app/para-agencias" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WillFlow para Agências | Gestão de Produção e Equipas" />
        <meta name="twitter:description" content="Software de gestão para agências de produção audiovisual." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Para Agências", "item": "https://willflow.app/para-agencias" }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "WillFlow para Agências",
            "description": "Sistema de gestão de projetos e equipas para agências de produção audiovisual",
            "brand": { "@type": "Brand", "name": "WillFlow" },
            "offers": {
              "@type": "Offer",
              "price": "49",
              "priceCurrency": "EUR",
              "priceValidUntil": "2026-12-31",
              "availability": "https://schema.org/InStock"
            }
          })}
        </script>
      </Helmet>
      <PublicHeader />

      <div className="pt-24 pb-4 px-4">
        <div className="container mx-auto">
          <AutoBreadcrumbs />
        </div>
      </div>

      {/* Hero */}
      <section className="pt-8 pb-16 px-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Building2 className="h-4 w-4" />
                Para Agências
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Gerencie a sua{' '}
                <span className="gradient-text">agência de produção</span>{' '}
                com clareza
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Múltiplos projetos, equipas internas, freelancers e clientes exigentes.
                O WillFlow organiza tudo para que possa escalar sem perder o controlo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
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

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <img
                src="/screenshots/banner-dashboard-overview.png"
                alt="Dashboard WillFlow para agências de produção mostrando múltiplos projetos e métricas financeiras"
                className="w-full screenshot-fog-hero"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Challenges */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Problemas que resolvemos</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Agências de produção enfrentam desafios únicos. Criámos o WillFlow para os resolver.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.problem}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10">
                    <challenge.icon className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-bold text-lg">{challenge.problem}</h3>
                </div>
                <p className="text-muted-foreground">{challenge.solution}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Diagram */}
      <FlowDiagram
        title="O fluxo de trabalho da sua agência"
        subtitle="Do briefing inicial à entrega final, tudo visível e organizado"
        steps={flowSteps}
        direction="horizontal"
      />

      {/* Feature Sections */}
      <FeatureSection
        icon={Users}
        title="Gestão de Equipas e Permissões"
        description="Defina quem pode ver o quê. Permissões granulares por projeto, área financeira e dados sensíveis."
        screenshot="/screenshots/banner-crm.png"
        features={[
          'Roles personalizáveis (admin, gestor, produtor)',
          'Permissões por projeto',
          'Acesso financeiro controlado',
          'Convidar membros por email',
        ]}
      />

      <FeatureSection
        icon={CreditCard}
        title="Pagamentos a Freelancers"
        description="Registe quanto deve a cada freelancer, marque como pago e tenha histórico completo."
        screenshot="/screenshots/banner-pagamentos.png"
        features={[
          'Controlo por projeto e freelancer',
          'Alertas de pagamentos pendentes',
          'Histórico de transações',
          'Relatório de despesas com equipa',
        ]}
        reversed
      />

      <FeatureSection
        icon={BarChart3}
        title="Relatórios em Tempo Real"
        description="Saiba exatamente como está a performance da sua agência. Receita, margem, projetos e muito mais."
        screenshot="/screenshots/banner-relatorios.png"
        features={[
          'Dashboard financeiro completo',
          'Margem por projeto calculada',
          'Comparativo mensal',
          'Export para contabilidade',
        ]}
      />

      <FeatureSection
        icon={MessageSquare}
        title="Chat Interno por Projeto"
        description="Mantenha toda a comunicação da equipa organizada. Cada projeto tem o seu canal dedicado."
        screenshot="/screenshots/banner-chat.png"
        features={[
          'Canais por projeto',
          'Mensagens diretas',
          'Menções e notificações',
          'Histórico pesquisável',
        ]}
        reversed
      />

      {/* Comparison Table */}
      <ComparisonTable
        title="WillFlow vs Monday / Asana"
        subtitle="Ferramentas genéricas vs software específico para produção"
        competitorName="Monday/Asana"
        items={comparisonItems}
      />

      {/* Testimonials */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Agências que confiam no WillFlow
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

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Porquê o WillFlow para a sua agência?</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Zap, title: 'Rápido de implementar', description: 'Comece a usar em minutos. Interface intuitiva sem curva de aprendizagem.' },
              { icon: Shield, title: 'Dados seguros', description: 'Infraestrutura na Europa, backups automáticos e conformidade RGPD.' },
              { icon: Users, title: 'Suporte dedicado', description: 'Planos Studio incluem suporte prioritário e onboarding personalizado.' },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mx-auto mb-4">
                  <benefit.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center max-w-3xl mx-auto"
          >
            <Building2 className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Escale a sua agência com confiança
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
