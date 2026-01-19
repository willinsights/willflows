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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const values = [
  {
    icon: Target,
    title: 'Focados no Produtor',
    description: 'Cada funcionalidade é desenhada a pensar nas necessidades reais de fotógrafos e filmmakers.',
  },
  {
    icon: Lightbulb,
    title: 'Simplicidade',
    description: 'Acreditamos que a gestão deve ser simples. Sem complicações, sem funcionalidades desnecessárias.',
  },
  {
    icon: Heart,
    title: 'Paixão pela Produção',
    description: 'Nascemos do mundo da produção. Entendemos os desafios porque já os vivemos.',
  },
  {
    icon: Users,
    title: 'Comunidade',
    description: 'Construímos o WillFlow junto com a nossa comunidade de produtores em Portugal e Brasil.',
  },
];

const story = [
  {
    year: '2023',
    title: 'A ideia nasce',
    description: 'Frustrados com ferramentas genéricas que não entendiam o fluxo de trabalho de produção, decidimos criar algo específico.',
  },
  {
    year: '2024',
    title: 'Desenvolvimento',
    description: 'Meses de pesquisa, entrevistas com produtores e desenvolvimento intensivo para criar a ferramenta ideal.',
  },
  {
    year: '2025',
    title: 'Lançamento',
    description: 'O WillFlow é lançado com funcionalidades core: Kanban, CRM, Calendário e Gestão Financeira.',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Sobre Nós | WillFlow - A Nossa História</title>
        <meta name="description" content="Conheça a história do WillFlow, o sistema de gestão criado por produtores para produtores. A nossa missão é simplificar a gestão de projetos de fotografia e vídeo." />
        <link rel="canonical" href="https://willflow.app/sobre" />
        <meta property="og:title" content="Sobre Nós | WillFlow - A Nossa História" />
        <meta property="og:description" content="Conheça a história do WillFlow, o sistema de gestão criado por produtores para produtores." />
        <meta property="og:url" content="https://willflow.app/sobre" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Sobre Nós | WillFlow - A Nossa História" />
        <meta name="twitter:description" content="Conheça a história do WillFlow, o sistema de gestão criado por produtores para produtores." />
      </Helmet>
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
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
              entendiam o fluxo de trabalho único da produção audiovisual.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-4">A nossa missão</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simplificar a gestão de projetos de fotografia e vídeo para que os 
              produtores possam focar no que realmente importa: <strong>criar</strong>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4">
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
      <section className="py-20 px-4 bg-muted/30">
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
                  <span className="font-bold text-primary">{item.year}</span>
                </div>
                <div className="glass-card p-6 flex-1">
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
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
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:geral@willflow.app">
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  geral@willflow.app
                </Button>
              </a>
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
