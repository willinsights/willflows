import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Calendar,
  Video,
  Film,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const integrations = [
  {
    name: 'Google Calendar',
    description: 'Sincronize sessões, prazos e reuniões automaticamente com o seu Google Calendar.',
    icon: Calendar,
    plan: 'Pro',
    features: [
      'Sincronização bidirecional',
      'Eventos de projeto automáticos',
      'Lembretes de prazos',
      'Cores por tipo de evento',
    ],
    status: 'available',
  },
  {
    name: 'Google Meet',
    description: 'Crie reuniões com clientes diretamente do WillFlow com link do Google Meet.',
    icon: Video,
    plan: 'Pro',
    features: [
      'Links de reunião automáticos',
      'Integrado no calendário',
      'Convites enviados automaticamente',
      'Histórico de reuniões',
    ],
    status: 'available',
  },
  {
    name: 'Frame.io',
    description: 'Review de vídeos integrado. Veja comentários e aprovações sem sair do WillFlow.',
    icon: Film,
    plan: 'Studio',
    features: [
      'Embed de projetos Frame.io',
      'Comentários sincronizados',
      'Status de aprovação',
      'Notificações em tempo real',
    ],
    status: 'available',
  },
];

const comingSoon = [
  { name: 'Dropbox', description: 'Sincronização de ficheiros de projeto' },
  { name: 'Outlook Calendar', description: 'Alternativa ao Google Calendar' },
  { name: 'Zapier', description: 'Conecte com milhares de apps' },
  { name: 'Slack', description: 'Notificações e comandos' },
  { name: 'QuickBooks', description: 'Sincronização de faturação' },
  { name: 'Notion', description: 'Documentação de projetos' },
];

export default function Integrations() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Integrações | WillFlow - Google Calendar, Frame.io e Mais</title>
        <meta name="description" content="Integre o WillFlow com as suas apps favoritas: Google Calendar, Google Meet, Frame.io e muito mais. Sincronize calendários, reuniões e reviews de vídeo." />
        <link rel="canonical" href="https://willflow.app/integracoes" />
        <meta property="og:title" content="Integrações | WillFlow - Google Calendar, Frame.io e Mais" />
        <meta property="og:description" content="Integre o WillFlow com as suas apps favoritas: Google Calendar, Google Meet, Frame.io e muito mais." />
        <meta property="og:url" content="https://willflow.app/integracoes" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Integrações | WillFlow - Google Calendar, Frame.io e Mais" />
        <meta name="twitter:description" content="Integre o WillFlow com as suas apps favoritas: Google Calendar, Google Meet, Frame.io e muito mais." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Integrações", "item": "https://willflow.app/integracoes" }
            ]
          })}
        </script>
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Conecte as ferramentas que já{' '}
              <span className="gradient-text">usa</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Integre o WillFlow com as suas apps favoritas para um fluxo de trabalho ainda mais eficiente.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Available Integrations */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Integrações disponíveis</h2>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {integrations.map((integration, index) => (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                    <integration.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">{integration.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      Plano {integration.plan}+
                    </Badge>
                  </div>
                </div>
                
                <p className="text-muted-foreground text-sm mb-4">
                  {integration.description}
                </p>
                
                <ul className="space-y-2">
                  {integration.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Em breve</h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {comingSoon.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="glass-card p-4 opacity-60"
              >
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
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
              Falta alguma integração?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Diga-nos que integrações gostaria de ver no WillFlow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/ajuda">
                <Button variant="outline">Contactar suporte</Button>
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
