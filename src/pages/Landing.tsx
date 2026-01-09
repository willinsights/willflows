import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Calendar,
  CreditCard,
  Users,
  Check,
  ArrowRight,
  Kanban,
  FolderKanban,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const features = [
  {
    icon: Kanban,
    title: 'Kanban Visual',
    description: 'Acompanhe cada projeto desde a captação até a entrega final com um fluxo visual intuitivo.',
  },
  {
    icon: Users,
    title: 'CRM Integrado',
    description: 'Gerencie todos os seus clientes, contactos e histórico de projetos num só lugar.',
  },
  {
    icon: Calendar,
    title: 'Calendário',
    description: 'Visualize compromissos, sessões e prazos com integração Google Calendar.',
  },
  {
    icon: CreditCard,
    title: 'Pagamentos',
    description: 'Controle receitas, custos e pagamentos de forma simples e organizada.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Export Excel & PDF',
    description: 'Exporte dados para faturar externamente ou criar relatórios personalizados.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Analise o desempenho do seu negócio com relatórios visuais e detalhados.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Crie o seu workspace',
    description: 'Escolha Portugal (EUR) ou Brasil (BRL) para configurar moeda e fuso horário automaticamente.',
  },
  {
    number: '02',
    title: 'Adicione projetos',
    description: 'Crie projetos de Fotografia, Vídeo ou ambos. Cada tipo com o seu fluxo específico.',
  },
  {
    number: '03',
    title: 'Entrega automática',
    description: 'Quando um projeto de Captação é entregue, a fase de Edição abre automaticamente.',
  },
];

const faqs = [
  {
    question: 'Precisa de cartão para testar?',
    answer: 'Sim, usamos o modelo de trial com cartão. Os 7 dias são completamente grátis e só cobramos após o período de teste. Pode cancelar a qualquer momento.',
  },
  {
    question: 'Posso trocar de EUR para BRL?',
    answer: 'A moeda é definida por workspace no momento da criação. Portugal = EUR, Brasil = BRL. Se precisar de outra moeda, pode criar um novo workspace.',
  },
  {
    question: 'Posso cancelar antes do trial acabar?',
    answer: 'Sim! Pode cancelar a qualquer momento durante o trial de 7 dias e não será cobrado absolutamente nada.',
  },
  {
    question: 'Dá para ter freelancers?',
    answer: 'Sim! Pode convidar membros com diferentes roles: Admin, Editor, Captação, Freelancer ou Visualizador. Cada role tem permissões específicas.',
  },
  {
    question: 'Tem faturação?',
    answer: 'O WillFlow exporta dados formatados (Excel/PDF) para que possa faturar usando o seu software de faturação preferido. Não emitimos faturas diretamente.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6">
              ✨ 7 dias grátis com cartão • Cancele quando quiser
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              O CRM + Kanban feito para{' '}
              <span className="gradient-text">Foto e Vídeo</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              Captação → Edição → Entrega. Gerencie projetos, clientes, calendário e finanças num só lugar.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> 7 dias grátis</span>
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> EUR ou BRL</span>
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> Dark/Light mode</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?trial=true">
                <Button size="lg" className="gradient-primary text-lg px-8">
                  Começar teste grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/funcionalidades">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Ver funcionalidades
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona</h2>
            <p className="text-lg text-muted-foreground">3 passos simples para começar</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl font-bold gradient-text mb-4">{step.number}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo o que precisa, num só lugar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas pensadas especificamente para o fluxo de trabalho de criadores visuais
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/funcionalidades">
              <Button variant="outline" size="lg">
                Ver todas as funcionalidades
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="glass-card px-6">
                <AccordionTrigger className="text-left font-medium">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-8">
            <Link to="/ajuda">
              <Button variant="link">Ver todas as perguntas →</Button>
            </Link>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para transformar a sua gestão?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              7 dias grátis com cartão. Cancele a qualquer momento.
            </p>
            <Link to="/auth?trial=true">
              <Button size="lg" className="gradient-primary text-lg px-8">
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
