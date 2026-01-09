import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
  Video,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';

const features = [
  {
    icon: Kanban,
    title: 'Kanban Visual',
    description: 'Acompanhe cada projeto desde a captação até a entrega final com um fluxo visual intuitivo.',
    details: [
      'Colunas customizáveis por fase',
      'Coluna "Entregue" fixa no final',
      'Drag & drop para mover projetos',
      'Filtros por cliente, tipo, prioridade',
    ],
  },
  {
    icon: FolderKanban,
    title: 'Projetos Completos',
    description: 'Crie projetos de Fotografia, Vídeo ou ambos. Cada tipo com o seu fluxo específico.',
    details: [
      'Tipos: Fotografia, Vídeo, Foto + Vídeo',
      'Categorias: Hotel, Experiência, Evento, Outro',
      'Campos personalizados por projeto',
      'Notas internas e cliente',
    ],
  },
  {
    icon: CheckSquare,
    title: 'Tarefas & Checklists',
    description: 'Pop-up de tarefa estilo Asana com checklist obrigatório antes de avançar.',
    details: [
      'Checklists por fase (Captação/Edição)',
      'Assignees por tarefa',
      'Anexos e comentários',
      'Histórico de atividade',
    ],
  },
  {
    icon: Users,
    title: 'CRM Integrado',
    description: 'Gerencie todos os seus clientes, contactos e histórico de projetos num só lugar.',
    details: [
      'Ficha completa do cliente',
      'Histórico de projetos',
      'Métricas: receita total, projetos ativos',
      'Tags e categorização',
    ],
  },
  {
    icon: Calendar,
    title: 'Calendário',
    description: 'Visualize compromissos, sessões e prazos com integração Google Calendar.',
    details: [
      'Vista mês, semana, dia',
      'Sincronização Google Calendar',
      'Eventos de projeto automáticos',
      'Google Meet integrado',
    ],
  },
  {
    icon: CreditCard,
    title: 'Pagamentos',
    description: 'Controle receitas, custos e pagamentos de forma simples e organizada.',
    details: [
      'A receber vs A pagar',
      'Status: Pendente, Pago, Vencido',
      'Previsão de cash flow',
      'Associação a projetos e clientes',
    ],
  },
  {
    icon: FileSpreadsheet,
    title: 'Export & Faturação',
    description: 'Exporte dados para faturar externamente. Excel e PDF disponíveis.',
    details: [
      'Export Excel (todos os planos)',
      'Export PDF (Pro e Studio)',
      'Dados formatados para faturação',
      'Relatórios personalizáveis',
    ],
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Analise o desempenho do seu negócio com relatórios visuais e detalhados.',
    details: [
      'Top clientes por receita',
      'Projetos por categoria',
      'Performance da equipa',
      'Tendências mensais',
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
    icon: Video,
    title: 'Frame.io',
    description: 'Integração com Frame.io para review de vídeos diretamente no WillFlow.',
    details: [
      'Embed de projetos Frame.io',
      'Comentários sincronizados',
      'Status de aprovação',
      'Disponível no plano Studio',
    ],
  },
];

export default function Features() {
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
                Começar teste grátis (7 dias)
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="glass-card p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {detail}
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
              7 dias grátis com cartão. Cancele a qualquer momento.
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
