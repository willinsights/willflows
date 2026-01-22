import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Calendar,
  Video,
  Film,
  ArrowRight,
  Check,
  Clock,
  Zap,
  Shield,
  RefreshCw,
  Settings,
  Cloud,
  FolderSync,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { AutoBreadcrumbs } from '@/components/seo/Breadcrumbs';

const integrations = [
  {
    name: 'Google Calendar',
    description: 'Sincronize sessões, prazos e reuniões automaticamente com o seu Google Calendar. Bidirecional e em tempo real.',
    icon: Calendar,
    plan: 'Pro',
    features: [
      'Sincronização bidirecional automática',
      'Eventos de projeto criados automaticamente',
      'Lembretes de prazos e entregas',
      'Cores diferenciadas por tipo de evento',
      'Suporte a múltiplos calendários',
      'Escolher o que sincronizar (sessões, entregas, reuniões)',
    ],
    status: 'available',
    benefits: [
      'Nunca mais esqueça uma sessão',
      'Equipa sempre atualizada',
      'Clientes podem ver disponibilidade',
    ],
  },
];

const comingSoon = [
  { 
    name: 'Frame.io', 
    description: 'Review de vídeos integrado com comentários sincronizados. Feedback do cliente direto no WillFlow.', 
    icon: Film,
    priority: 'alta',
  },
  { 
    name: 'Google Meet', 
    description: 'Links de reunião automáticos integrados no calendário. Um clique para criar a sala.', 
    icon: Video,
    priority: 'alta',
  },
  { 
    name: 'Dropbox', 
    description: 'Sincronização de ficheiros de projeto. Pastas criadas automaticamente por projeto.',
    icon: FolderSync,
    priority: 'média',
  },
  { 
    name: 'Google Drive', 
    description: 'Organização automática de pastas e ficheiros de produção.',
    icon: Cloud,
    priority: 'média',
  },
  { 
    name: 'Outlook Calendar', 
    description: 'Alternativa ao Google Calendar para utilizadores Microsoft.',
    icon: Calendar,
    priority: 'média',
  },
  { 
    name: 'Zapier', 
    description: 'Conecte o WillFlow com milhares de apps através de automações.',
    icon: Zap,
    priority: 'alta',
  },
  { 
    name: 'Slack', 
    description: 'Notificações e comandos rápidos diretamente no Slack.',
    icon: Settings,
    priority: 'baixa',
  },
  { 
    name: 'Notion', 
    description: 'Sincronização de documentação e briefings de projetos.',
    icon: Settings,
    priority: 'baixa',
  },
];

const integrationBenefits = [
  {
    icon: RefreshCw,
    title: 'Sincronização em tempo real',
    description: 'Alterações refletem instantaneamente em todos os sistemas conectados.',
  },
  {
    icon: Shield,
    title: 'Conexões seguras',
    description: 'OAuth 2.0 e encriptação end-to-end para proteger os seus dados.',
  },
  {
    icon: Zap,
    title: 'Automatização inteligente',
    description: 'Reduza trabalho manual com sincronizações automáticas.',
  },
];

export default function Integrations() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Integrações | WillFlow - Google Calendar, Frame.io e Mais</title>
        <meta name="description" content="Integre o WillFlow com Google Calendar para sincronização automática de eventos. Frame.io, Dropbox, Zapier e mais integrações em desenvolvimento." />
        <link rel="canonical" href="https://willflow.app/integracoes" />
        <meta property="og:title" content="Integrações | WillFlow - Google Calendar e Mais" />
        <meta property="og:description" content="Integre o WillFlow com as suas apps favoritas: Google Calendar para sincronização de eventos e muito mais em desenvolvimento." />
        <meta property="og:url" content="https://willflow.app/integracoes" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Integrações | WillFlow - Google Calendar e Mais" />
        <meta name="twitter:description" content="Integre o WillFlow com as suas apps favoritas: Google Calendar para sincronização de eventos e muito mais em desenvolvimento." />
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Conecte as ferramentas que já{' '}
              <span className="gradient-text">usa</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Integre o WillFlow com as suas apps favoritas para um fluxo de trabalho 
              ainda mais eficiente. Menos tarefas manuais, mais tempo para criar.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Integration Benefits */}
      <section className="py-12 px-4 border-y border-border bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {integrationBenefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Available Integrations */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Integrações disponíveis</h2>
          
          <div className="max-w-2xl mx-auto">
            {integrations.map((integration, index) => (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-8"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10">
                    <integration.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{integration.name}</h3>
                    <Badge variant="secondary" className="text-xs mt-1">
                      Plano {integration.plan}+
                    </Badge>
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-6">
                  {integration.description}
                </p>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-3">Funcionalidades</h4>
                    <ul className="space-y-2">
                      {integration.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Benefícios</h4>
                    <ul className="space-y-2">
                      {integration.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center gap-2">
            <Clock className="h-6 w-6 text-muted-foreground" />
            Em desenvolvimento
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Estamos a trabalhar nestas integrações. Tem alguma sugestão? 
            <Link to="/contato" className="text-primary hover:underline ml-1">Diga-nos!</Link>
          </p>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {comingSoon.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">{item.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                <Badge 
                  variant={item.priority === 'alta' ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  Prioridade {item.priority}
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 text-center"
          >
            <Settings className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">API para desenvolvedores</h2>
            <p className="text-muted-foreground mb-6">
              Precisa de uma integração personalizada? A nossa API REST está em desenvolvimento 
              e permitirá conectar o WillFlow a qualquer sistema.
            </p>
            <Badge variant="outline">Em breve</Badge>
          </motion.div>
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
            <h2 className="text-3xl font-bold mb-4">
              Falta alguma integração?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Diga-nos que integrações gostaria de ver no WillFlow. 
              Priorizamos baseado no feedback da comunidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contato">
                <Button variant="outline">Sugerir integração</Button>
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
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Integrações | WillFlow - Google Calendar e Mais</title>
        <meta name="description" content="Integre o WillFlow com as suas apps favoritas: Google Calendar para sincronização de eventos e muito mais em desenvolvimento." />
        <link rel="canonical" href="https://willflow.app/integracoes" />
        <meta property="og:title" content="Integrações | WillFlow - Google Calendar e Mais" />
        <meta property="og:description" content="Integre o WillFlow com as suas apps favoritas: Google Calendar para sincronização de eventos e muito mais em desenvolvimento." />
        <meta property="og:url" content="https://willflow.app/integracoes" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Integrações | WillFlow - Google Calendar e Mais" />
        <meta name="twitter:description" content="Integre o WillFlow com as suas apps favoritas: Google Calendar para sincronização de eventos e muito mais em desenvolvimento." />
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
          
          <div className="grid md:grid-cols-1 gap-6 max-w-lg mx-auto">
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
          <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center gap-2">
            <Clock className="h-6 w-6 text-muted-foreground" />
            Em breve
          </h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {comingSoon.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="glass-card p-4 opacity-70"
              >
                <div className="flex items-center gap-2 mb-2">
                  {'icon' in item && item.icon && (
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold">{item.name}</h3>
                </div>
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
