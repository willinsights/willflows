import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, HelpCircle, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
const faqs = [
  {
    question: 'Como posso começar a usar o WillFlow?',
    answer: 'Basta criar uma conta gratuita e terá acesso a 30 dias de teste com todas as funcionalidades.',
  },
  {
    question: 'Posso migrar dados de outro sistema?',
    answer: 'Sim! A nossa equipa pode ajudar na migração de dados de Excel, Notion ou outros sistemas.',
  },
  {
    question: 'O WillFlow funciona em dispositivos móveis?',
    answer: 'Sim, o WillFlow é 100% responsivo e funciona em qualquer dispositivo com navegador web.',
  },
];

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;

    try {
      const { data, error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          template: 'contact_message',
          to: 'geral@willflow.app',
          data: { name, email, subject, message },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSubmitted(true);
      toast.success('Mensagem enviada com sucesso!');
    } catch (err: any) {
      logger.error('Error sending contact form:', err);
      toast.error(err?.message || 'Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contato - WillFlow',
    description: 'Entre em contato com a equipa WillFlow para suporte, dúvidas ou parcerias.',
    url: 'https://willflow.app/contato',
    mainEntity: {
      '@type': 'Organization',
      name: 'WillFlow',
      email: 'geral@willflow.app',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'geral@willflow.app',
        availableLanguage: ['Portuguese', 'English'],
      },
    },
  };

  return (
    <>
      <Helmet>
        <title>Contato - WillFlow | Fale Connosco</title>
        <meta 
          name="description" 
          content="Entre em contato com a equipa WillFlow. Suporte técnico, dúvidas sobre planos, parcerias ou sugestões. Resposta em até 24 horas." 
        />
        <link rel="canonical" href="https://willflow.app/contato" />
        <meta property="og:title" content="Contato - WillFlow | Fale Connosco" />
        <meta property="og:description" content="Entre em contato com a equipa WillFlow. Suporte técnico, dúvidas sobre planos, parcerias ou sugestões." />
        <meta property="og:url" content="https://willflow.app/contato" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://willflow.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="WillFlow" />
        <meta property="og:locale" content="pt_PT" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contato - WillFlow | Fale Connosco" />
        <meta name="twitter:description" content="Entre em contato com a equipa WillFlow. Suporte técnico, dúvidas sobre planos." />
        <meta name="twitter:image" content="https://willflow.app/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <PublicHeader />

      <main className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <Breadcrumbs 
            items={[{ label: 'Contato' }]} 
            className="mb-8"
          />

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Fale Connosco
            </h1>
            <p className="text-lg text-muted-foreground">
              Tem dúvidas, sugestões ou precisa de ajuda? A nossa equipa está pronta para ajudar.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-card border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  Enviar Mensagem
                </h2>

                {isSubmitted ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Mensagem Enviada!</h3>
                    <p className="text-muted-foreground">
                      Obrigado pelo contacto. Responderemos em até 24 horas.
                    </p>
                    <Button 
                      onClick={() => setIsSubmitted(false)} 
                      variant="outline" 
                      className="mt-6"
                    >
                      Enviar nova mensagem
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          placeholder="Seu nome" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          placeholder="seu@email.com" 
                          required 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Assunto</Label>
                      <Input 
                        id="subject" 
                        name="subject" 
                        placeholder="Como podemos ajudar?" 
                        required 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem</Label>
                      <Textarea 
                        id="message" 
                        name="message" 
                        placeholder="Descreva a sua questão ou sugestão..." 
                        rows={5}
                        required 
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full gradient-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        'A enviar...'
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Mensagem
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Contact Info & FAQs */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              {/* Direct Contact */}
              <div className="bg-card border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Mail className="h-6 w-6 text-primary" />
                  Contacto Direto
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email de suporte</p>
                    <a 
                      href="mailto:geral@willflow.app" 
                      className="text-lg font-medium text-primary hover:underline"
                    >
                      geral@willflow.app
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tempo de resposta</p>
                    <p className="font-medium">Até 24 horas úteis</p>
                  </div>
                </div>
              </div>

              {/* Quick FAQs */}
              <div className="bg-card border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <HelpCircle className="h-6 w-6 text-primary" />
                  Perguntas Frequentes
                </h2>

                <div className="space-y-6">
                  {faqs.map((faq, index) => (
                    <div key={index}>
                      <h3 className="font-medium mb-1">{faq.question}</h3>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-6" asChild>
                  <a href="/ajuda">Ver todas as perguntas</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
