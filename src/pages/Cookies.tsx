import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Cookie,
  Settings,
  BarChart3,
  Shield,
  Clock,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const cookieTypes = [
  {
    type: 'Essenciais',
    icon: Shield,
    required: true,
    description: 'Necessários para o funcionamento básico do site. Não podem ser desativados.',
    cookies: [
      { name: 'sb-auth-token', purpose: 'Autenticação de utilizador', duration: 'Sessão' },
      { name: 'sb-refresh-token', purpose: 'Renovação de sessão', duration: '7 dias' },
      { name: 'theme', purpose: 'Preferência de tema (claro/escuro)', duration: '1 ano' },
      { name: 'workspace_id', purpose: 'Workspace selecionado', duration: 'Sessão' },
    ],
  },
  {
    type: 'Funcionais',
    icon: Settings,
    required: false,
    description: 'Permitem funcionalidades adicionais como preferências e personalização.',
    cookies: [
      { name: 'sidebar_collapsed', purpose: 'Estado do menu lateral', duration: 'Persistente' },
      { name: 'tour_completed', purpose: 'Tour do produto concluído', duration: '1 ano' },
      { name: 'notification_preferences', purpose: 'Preferências de notificações', duration: '1 ano' },
    ],
  },
  {
    type: 'Analíticos',
    icon: BarChart3,
    required: false,
    description: 'Ajudam-nos a entender como os utilizadores interagem com o site.',
    cookies: [
      { name: 'session_id', purpose: 'Identificador de sessão anónimo', duration: 'Sessão' },
      { name: '_ga', purpose: 'Google Analytics - distinção de utilizadores', duration: '2 anos' },
      { name: '_gid', purpose: 'Google Analytics - distinção de utilizadores', duration: '24 horas' },
    ],
  },
];

const sections = [
  {
    id: 'o-que-sao',
    title: 'O que são Cookies?',
    content: `Cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo (computador, tablet ou telemóvel) quando visita um website.

São amplamente utilizados para fazer os websites funcionarem de forma mais eficiente, bem como para fornecer informações aos proprietários do site.`,
  },
  {
    id: 'como-usamos',
    title: 'Como Usamos Cookies',
    content: `Utilizamos cookies para:

• **Autenticação:** Manter a sua sessão iniciada enquanto navega no site
• **Preferências:** Lembrar as suas escolhas, como o tema de cores
• **Funcionalidade:** Permitir funcionalidades como o estado do menu lateral
• **Analytics:** Compreender como os utilizadores interagem com o nosso serviço para o melhorar`,
  },
  {
    id: 'gerir-cookies',
    title: 'Como Gerir Cookies',
    content: `Pode controlar e/ou eliminar cookies conforme desejar. A maioria dos browsers permite:

• **Bloquear todos os cookies:** Pode configurar o seu browser para bloquear todos os cookies. No entanto, isto pode impedir o funcionamento correto do site.
• **Eliminar cookies:** Pode eliminar todos os cookies já armazenados no seu dispositivo.
• **Bloquear cookies de terceiros:** Pode optar por bloquear apenas cookies de terceiros.

**Instruções por browser:**
• Chrome: Definições > Privacidade e segurança > Cookies
• Firefox: Definições > Privacidade & Segurança > Cookies
• Safari: Preferências > Privacidade
• Edge: Definições > Privacidade e serviços > Cookies`,
  },
  {
    id: 'consentimento',
    title: 'O Seu Consentimento',
    content: `Ao continuar a usar o nosso site após a apresentação do aviso de cookies, está a consentir o uso de cookies de acordo com esta política.

Pode retirar o seu consentimento a qualquer momento eliminando os cookies do seu browser ou alterando as suas preferências de cookies.

Note que a desativação de certos cookies pode afetar a funcionalidade do site.`,
  },
];

export default function Cookies() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Política de Cookies | WillFlow</title>
        <meta name="description" content="Política de Cookies do WillFlow. Saiba como utilizamos cookies para melhorar a sua experiência." />
        <link rel="canonical" href="https://willflow.app/cookies" />
      </Helmet>

      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-primary/10">
                <Cookie className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Política de <span className="gradient-text">Cookies</span>
            </h1>
            <p className="text-muted-foreground mb-4">
              Última atualização: 17 de Janeiro de 2025
            </p>
            <p className="text-lg text-muted-foreground">
              Esta política explica como utilizamos cookies e tecnologias similares.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Cookie Types */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-center mb-8"
          >
            Cookies que Utilizamos
          </motion.h2>

          <div className="space-y-6">
            {cookieTypes.map((category, index) => (
              <motion.div
                key={category.type}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{category.type}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {category.required ? (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Obrigatório
                      </span>
                    ) : (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        Opcional
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">Cookie</th>
                        <th className="text-left py-2 font-medium">Finalidade</th>
                        <th className="text-left py-2 font-medium">Duração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.cookies.map((cookie) => (
                        <tr key={cookie.name} className="border-b border-border/50 last:border-0">
                          <td className="py-2 font-mono text-xs text-primary">{cookie.name}</td>
                          <td className="py-2 text-muted-foreground">{cookie.purpose}</td>
                          <td className="py-2 text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {cookie.duration}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Sections */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl space-y-8">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              viewport={{ once: true }}
              className="glass-card p-6 md:p-8"
            >
              <h2 className="text-xl font-bold mb-4">{section.title}</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {section.content.split('\n').map((paragraph, i) => {
                  if (paragraph.startsWith('•')) {
                    return (
                      <p key={i} className="text-muted-foreground ml-4">
                        {paragraph}
                      </p>
                    );
                  }
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return (
                      <p key={i} className="font-semibold text-foreground mt-4">
                        {paragraph.replace(/\*\*/g, '')}
                      </p>
                    );
                  }
                  return (
                    <p key={i} className="text-muted-foreground">
                      {paragraph.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </p>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-8 md:p-12 text-center max-w-3xl mx-auto"
          >
            <h2 className="text-2xl font-bold mb-4">
              Saiba mais sobre a nossa privacidade
            </h2>
            <p className="text-muted-foreground mb-6">
              Consulte a nossa política de privacidade completa para mais informações.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/privacidade">
                <Button variant="outline">
                  Política de Privacidade
                </Button>
              </Link>
              <Link to="/seguranca">
                <Button className="gradient-primary">
                  Segurança
                  <ArrowRight className="ml-2 h-4 w-4" />
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
