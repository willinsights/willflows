import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Kanban,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  FolderKanban,
  CheckSquare,
  Clock,
  FileSpreadsheet,
  MessageCircle,
  FolderOpen,
  Archive,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const features = [
  {
    icon: MessageCircle,
    title: 'Chat de Equipa',
    description: 'Comunicação interna integrada com canais por projeto, criação de tarefas e follow-ups.',
    href: '/funcionalidades/chat',
    details: [
      'Canais por projeto automáticos',
      'Criar tarefas de mensagens',
      'Threads, reações e menções',
      'Follow-ups e lembretes',
    ],
  },
  {
    icon: Kanban,
    title: 'Kanban Visual',
    description: 'Acompanhe cada projeto desde a captação até a entrega final com um fluxo visual intuitivo.',
    href: '/funcionalidades/kanban',
    details: [
      'Colunas customizáveis por fase',
      'Drag & drop para mover projetos',
      'Transição automática de fases',
      'Filtros por cliente e prioridade',
    ],
  },
  {
    icon: Users,
    title: 'CRM Integrado',
    description: 'Gerencie todos os seus clientes, contactos e histórico de projetos num só lugar.',
    href: '/funcionalidades/crm',
    details: [
      'Ficha completa do cliente',
      'Histórico de projetos',
      'Métricas: receita total, projetos',
      'Notas e comunicações',
    ],
  },
  {
    icon: Calendar,
    title: 'Calendário',
    description: 'Visualize compromissos, sessões e prazos com integração Google Calendar.',
    href: '/funcionalidades/calendario',
    details: [
      'Vista mês, semana, dia',
      'Sincronização Google Calendar',
      'Eventos de projeto automáticos',
      'Arrastar para reagendar',
    ],
  },
  {
    icon: CreditCard,
    title: 'Pagamentos',
    description: 'Controle receitas, custos e pagamentos de forma simples e organizada.',
    href: '/funcionalidades/pagamentos',
    details: [
      'A receber vs A pagar',
      'Status: Pendente, Pago, Vencido',
      'Export Excel e PDF',
      'Dashboard financeiro',
    ],
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Analise o desempenho do seu negócio com relatórios visuais e detalhados.',
    href: '/funcionalidades/relatorios',
    details: [
      'Top clientes por receita',
      'Projetos por categoria',
      'Performance da equipa',
      'Tendências mensais',
    ],
  },
  {
    icon: FolderOpen,
    title: 'Media Hub',
    description: 'Centralize todos os links externos de media dos seus projetos.',
    href: '/funcionalidades/media-hub',
    details: [
      'Links de NAS organizados',
      'Vimeo, YouTube, Google Drive',
      'Pesquisa centralizada',
      'Acesso rápido a ficheiros',
    ],
  },
  {
    icon: FolderKanban,
    title: 'Projetos Completos',
    description: 'Crie projetos de Fotografia, Vídeo ou ambos. Cada tipo com o seu fluxo específico.',
    details: [
      'Tipos: Fotografia, Vídeo, Foto + Vídeo',
      'Categorias customizáveis',
      'Notas internas e cliente',
      'Checklists por fase',
    ],
  },
  {
    icon: CheckSquare,
    title: 'Tarefas & Checklists',
    description: 'Pop-up de tarefa estilo Asana com checklist obrigatório antes de avançar.',
    details: [
      'Checklists por fase',
      'Assignees por tarefa',
      'Anexos e comentários',
      'Histórico de atividade',
    ],
  },
  {
    icon: Clock,
    title: 'Fluxo Automático',
    description: 'Quando um projeto de Captação é entregue, a fase de Edição abre automaticamente.',
    details: [
      'Captação → Edição automático',
      'Notificações por fase',
      'Templates de projeto',
      'Prazos automáticos',
    ],
  },
  {
    icon: Archive,
    title: 'Arquivo de Finalizados',
    description: 'Projetos concluídos ficam organizados num arquivo separado para consulta.',
    details: [
      'Histórico completo de projetos',
      'Pesquisa por cliente ou data',
      'Métricas de projetos passados',
      'Reativar se necessário',
    ],
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Funcionalidades | WillFlow - Kanban, CRM, Chat, Calendário e Mais</title>
        <meta name="description" content="Descubra todas as funcionalidades do WillFlow: Kanban visual, CRM integrado, chat de equipa, calendário com Google Calendar, gestão de pagamentos, relatórios financeiros e muito mais." />
        <link rel="canonical" href="https://willflow.app/funcionalidades" />
        <meta property="og:title" content="Funcionalidades | WillFlow - Kanban, CRM, Chat, Calendário e Mais" />
        <meta property="og:description" content="Descubra todas as funcionalidades do WillFlow: Kanban visual, CRM integrado, chat de equipa, calendário com Google Calendar, gestão de pagamentos, relatórios financeiros e muito mais." />
        <meta property="og:url" content="https://willflow.app/funcionalidades" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Funcionalidades | WillFlow - Kanban, CRM, Chat, Calendário e Mais" />
        <meta name="twitter:description" content="Descubra todas as funcionalidades do WillFlow: Kanban visual, CRM integrado, chat de equipa, calendário com Google Calendar, gestão de pagamentos, relatórios financeiros e muito mais." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://willflow.app" },
              { "@type": "ListItem", "position": 2, "name": "Funcionalidades", "item": "https://willflow.app/funcionalidades" }
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
              Todas as ferramentas que precisa,{' '}
              <span className="gradient-text">num só lugar</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Do Kanban ao CRM, do calendário aos relatórios. O WillFlow foi desenhado 
              especificamente para o fluxo de trabalho de produção visual.
            </p>
            <Link to="/auth?trial=true">
              <Button size="lg" className="gradient-primary">
                Começar teste grátis (30 dias)
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const CardContent = (
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{feature.title}</h3>
                      {'href' in feature && (
                        <ChevronRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{feature.description}</p>
                    <ul className="space-y-1.5">
                      {feature.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                    {'href' in feature && (
                      <p className="text-primary text-sm font-medium mt-4">Ver detalhes →</p>
                    )}
                  </div>
                </div>
              );

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  {'href' in feature ? (
                    <Link to={feature.href} className="block glass-card p-6 group hover:border-primary/50 transition-colors">
                      {CardContent}
                    </Link>
                  ) : (
                    <div className="glass-card p-6">
                      {CardContent}
                    </div>
                  )}
                </motion.div>
              );
            })}
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
              Pronto para transformar a sua gestão?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              🎉 30 dias grátis como bónus de lançamento! Sem cartão necessário.
            </p>
            <Link to="/auth?trial=true">
              <Button size="lg" className="gradient-primary">
                Começar agora
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
