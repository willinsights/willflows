import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Target,
  Heart,
  Lightbulb,
  Users,
  ArrowRight,
  Camera,
  Video,
  Mail,
  Rocket,
  Globe,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { AutoBreadcrumbs } from '@/components/seo/Breadcrumbs';

const values = [
  {
    icon: Target,
    title: 'Focados no Produtor',
    description: 'Cada funcionalidade é desenhada a pensar nas necessidades reais de fotógrafos, videomakers e produtoras audiovisuais.',
  },
  {
    icon: Lightbulb,
    title: 'Simplicidade',
    description: 'Acreditamos que a gestão deve ser simples. Sem complicações, sem funcionalidades desnecessárias que só atrapalham.',
  },
  {
    icon: Heart,
    title: 'Paixão pela Produção',
    description: 'Nascemos do mundo da produção audiovisual. Entendemos os desafios porque já os vivemos no terreno.',
  },
  {
    icon: Users,
    title: 'Comunidade',
    description: 'Construímos o WillFlow junto com a nossa comunidade de produtores em Portugal, Brasil e outros países lusófonos.',
  },
];

const story = [
  {
    year: '2023',
    title: 'A ideia nasce',
    description: 'Frustrados com ferramentas genéricas como Notion, Trello e Asana que não entendiam o fluxo de trabalho único da produção audiovisual, decidimos criar algo específico para a nossa área.',
    icon: Lightbulb,
  },
  {
    year: '2024',
    title: 'Pesquisa e desenvolvimento',
    description: 'Meses de pesquisa intensa, entrevistas com mais de 100 produtores e desenvolvimento para criar uma ferramenta que realmente resolve os problemas do dia-a-dia.',
    icon: Clock,
  },
  {
    year: '2025',
    title: 'Lançamento oficial',
    description: 'O WillFlow é lançado com as funcionalidades core: Kanban por fases de produção, CRM de clientes, Calendário integrado, Chat de equipa e Gestão Financeira completa.',
    icon: Rocket,
  },
  {
    year: '2026',
    title: 'Expansão e crescimento',
    description: 'Integrações com Google Calendar, novas funcionalidades de relatórios avançados e expansão para mercados internacionais de língua portuguesa.',
    icon: Globe,
  },
];

const stats = [
  { value: '500+', label: 'Produtores ativos' },
  { value: '10.000+', label: 'Projetos geridos' },
  { value: '2M€+', label: 'Faturação processada' },
  { value: '99.9%', label: 'Uptime garantido' },
];

const roadmap = [
  {
    quarter: 'Q1 2026',
    items: ['Integração Frame.io', 'App mobile iOS/Android', 'Relatórios personalizados'],
    status: 'in-progress',
  },
  {
    quarter: 'Q2 2026',
    items: ['Integração Dropbox/Drive', 'Automações Zapier', 'Faturação automática'],
    status: 'planned',
  },
  {
    quarter: 'Q3 2026',
    items: ['API pública', 'Marketplace de templates', 'Multi-idioma'],
    status: 'planned',
  },
  {
    quarter: 'Q4 2026',
    items: ['IA para orçamentos', 'Analytics avançados', 'Integrações contabilidade'],
    status: 'planned',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Sobre Nós | WillFlow - A Nossa História e Missão</title>
        <meta name="description" content="Conheça a história do WillFlow, o sistema de gestão criado por produtores para produtores. A nossa missão é simplificar a gestão de projetos de fotografia e vídeo em Portugal e Brasil." />
        <link rel="canonical" href="https://willflow.app/sobre" />
        <meta property="og:title" content="Sobre Nós | WillFlow - A Nossa História" />
        <meta property="og:description" content="Conheça a história do WillFlow, o sistema de gestão criado por produtores para produtores." />
        <meta property="og:url" content="https://willflow.app/sobre" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Sobre Nós | WillFlow - A Nossa História" />
        <meta name="twitter:description" content="Conheça a história do WillFlow, o sistema de gestão criado por produtores para produtores." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "name": "Sobre o WillFlow",
            "description": "A história e missão do WillFlow - sistema de gestão para produtores audiovisuais",
            "mainEntity": {
              "@type": "Organization",
              "name": "WillFlow",
              "description": "Sistema de gestão para fotógrafos, videomakers e produtoras",
              "url": "https://willflow.app",
              "foundingDate": "2023",
              "areaServed": ["Portugal", "Brasil"]
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
      <section className="pt-8 pb-16 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Video className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Criado por <span className="gradient-text">produtores</span>,{' '}
              <br className="hidden sm:block" />
              para produtores
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              O WillFlow nasceu da frustração com ferramentas genéricas que não 
              entendiam o fluxo de trabalho único da produção audiovisual. Decidimos 
              criar a ferramenta que sempre quisemos ter.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-border bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 md:p-12"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-center">A nossa missão</h2>
            <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-6">
              Simplificar a gestão de projetos de fotografia e vídeo para que os 
              produtores possam focar no que realmente importa: <strong>criar conteúdo incrível</strong>.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Segurança</h3>
                <p className="text-sm text-muted-foreground">Dados encriptados e backups automáticos</p>
              </div>
              <div className="text-center">
                <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Crescimento</h3>
                <p className="text-sm text-muted-foreground">Ferramentas para escalar o seu negócio</p>
              </div>
              <div className="text-center">
                <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Inovação</h3>
                <p className="text-sm text-muted-foreground">Novas funcionalidades a cada mês</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-12 text-center">Os nossos valores</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6 text-center"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Timeline */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold mb-12 text-center">A nossa história</h2>
          
          <div className="space-y-8">
            {story.map((item, index) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="glass-card p-6 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      {item.year}
                    </span>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-4 text-center">Roadmap de produto</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            O WillFlow está em constante evolução. Veja o que estamos a desenvolver para os próximos meses.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roadmap.map((quarter, index) => (
              <motion.div
                key={quarter.quarter}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`glass-card p-6 ${quarter.status === 'in-progress' ? 'border-primary/50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-bold">{quarter.quarter}</span>
                  {quarter.status === 'in-progress' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Em progresso
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {quarter.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Rocket className="h-3 w-3 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 md:p-12 text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-xl bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4">Entre em contacto</h2>
            <p className="text-muted-foreground mb-6">
              Tem dúvidas, sugestões ou quer saber mais sobre o WillFlow? 
              A nossa equipa está disponível para ajudar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contato">
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  Contactar-nos
                </Button>
              </Link>
              <Link to="/auth?trial=true">
                <Button className="gradient-primary">
                  Começar teste grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
