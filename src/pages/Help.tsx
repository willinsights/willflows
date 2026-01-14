import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Mail,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const faqCategories = [
  {
    title: 'Teste Grátis & Pagamentos',
    faqs: [
      {
        question: 'Preciso de cartão para testar?',
        answer: 'Não! Como bónus de lançamento, oferecemos 30 dias grátis sem precisar de cartão. Só adiciona o cartão quando decidir subscrever.',
      },
      {
        question: 'Posso cancelar antes do trial acabar?',
        answer: 'Sim! Pode cancelar a qualquer momento durante o trial de 30 dias e não será cobrado nada.',
      },
      {
        question: 'Como funciona a cobrança?',
        answer: 'Oferecemos planos mensais ou anuais (com 20% de desconto). A cobrança é processada via Stripe, aceitamos todos os principais cartões.',
      },
      {
        question: 'Posso mudar de plano a qualquer momento?',
        answer: 'Sim, pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor é ajustado proporcionalmente no próximo ciclo.',
      },
      {
        question: 'O que acontece se o pagamento falhar?',
        answer: 'Tentamos cobrar novamente em 3 dias. Se falhar, a conta entra em modo restrito (apenas visualização) até regularizar o pagamento.',
      },
    ],
  },
  {
    title: 'Conta & Workspaces',
    faqs: [
      {
        question: 'Posso trocar de EUR para BRL?',
        answer: 'A moeda é definida por workspace no momento da criação (Portugal = EUR, Brasil = BRL). Se precisar de outra moeda, pode criar um novo workspace.',
      },
      {
        question: 'Quantos workspaces posso ter?',
        answer: 'Depende do plano: Starter (1), Pro (3), Studio (10). Cada workspace é independente com os seus próprios utilizadores, projetos e clientes.',
      },
      {
        question: 'Posso convidar freelancers?',
        answer: 'Sim! Pode convidar membros com diferentes roles: Admin, Editor, Captação, Freelancer ou Visualizador. Cada role tem permissões específicas.',
      },
      {
        question: 'Os freelancers são cobrados?',
        answer: 'Sim, cada utilizador conta para o limite do seu plano. Freelancers e outros roles são contados igualmente.',
      },
    ],
  },
  {
    title: 'Funcionalidades',
    faqs: [
      {
        question: 'Tem faturação integrada?',
        answer: 'O WillFlow permite exportar dados formatados (Excel/PDF) para que possa faturar usando o seu software de faturação preferido. Não emitimos faturas diretamente.',
      },
      {
        question: 'Como funciona o Kanban?',
        answer: 'Temos dois Kanbans: Captação e Edição. Os projetos fluem entre eles automaticamente. Quando um projeto de Captação é entregue, abre automaticamente na Edição.',
      },
      {
        question: 'Posso personalizar as colunas?',
        answer: 'Sim, pode criar e ordenar colunas como quiser. A única exceção é a coluna "Entregue" que fica sempre no final.',
      },
      {
        question: 'Funciona offline?',
        answer: 'O WillFlow é uma aplicação web e requer ligação à internet. Não temos modo offline no momento.',
      },
    ],
  },
  {
    title: 'Segurança & Privacidade',
    faqs: [
      {
        question: 'Os meus dados estão seguros?',
        answer: 'Sim. Usamos encriptação TLS 1.3 em trânsito e AES-256 em repouso. Os dados são armazenados em servidores seguros na União Europeia.',
      },
      {
        question: 'Estão em conformidade com o RGPD?',
        answer: 'Sim, estamos em total conformidade com o RGPD. Pode solicitar acesso, retificação ou eliminação dos seus dados a qualquer momento.',
      },
      {
        question: 'Fazem backups?',
        answer: 'Sim, fazemos backups automáticos diários com retenção de 30 dias.',
      },
    ],
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-primary/10">
                <HelpCircle className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Como podemos <span className="gradient-text">ajudar</span>?
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Encontre respostas às perguntas mais frequentes ou entre em contacto connosco.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          {faqCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-xl font-bold mb-4">{category.title}</h2>
              
              <Accordion type="single" collapsible className="space-y-2">
                {category.faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`${categoryIndex}-${index}`}
                    className="glass-card px-6"
                  >
                    <AccordionTrigger className="text-left font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Não encontrou a resposta?</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold">Email</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Envie-nos um email e responderemos em até 24 horas úteis.
              </p>
              <a href="mailto:suporte@willflow.app" className="text-primary hover:underline">
                suporte@willflow.app
              </a>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold">Chat</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Disponível para clientes com plano Studio. Resposta em tempo real.
              </p>
              <span className="text-muted-foreground text-sm">Disponível no app</span>
            </motion.div>
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
            <h2 className="text-3xl font-bold mb-4">
              Pronto para começar?
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
