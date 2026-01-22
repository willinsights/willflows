import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UserPlus,
  MapPin,
  LayoutDashboard,
  Plus,
  Kanban,
  Film,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  UserCog,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { cn } from '@/lib/utils';

const tutorialSteps = [
  {
    id: 'criar-conta',
    icon: UserPlus,
    title: '1. Criar Conta',
    description: 'Acesse willflow.app e clique em "Começar teste grátis". Preencha o seu email e crie uma password segura. Pode também registar-se com a sua conta Google.',
    screenshot: '/screenshots/screenshot-onboarding-regiao.png',
    tips: [
      'Use um email válido para receber notificações',
      'A password deve ter pelo menos 6 caracteres',
      'O registo com Google é mais rápido',
    ],
  },
  {
    id: 'escolher-regiao',
    icon: MapPin,
    title: '2. Escolher Região',
    description: 'Selecione Portugal (EUR) ou Brasil (BRL) como a sua região. Isto define a moeda e o fuso horário do seu workspace.',
    screenshot: '/screenshots/screenshot-onboarding-planos.png',
    tips: [
      'A moeda pode ser alterada depois nas configurações',
      'O fuso horário afeta os lembretes e notificações',
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: '3. Conhecer o Dashboard',
    description: 'O Dashboard é a sua página inicial. Aqui vê um resumo de projetos, pagamentos pendentes, eventos próximos e atividade recente.',
    screenshot: '/screenshots/screenshot-dashboard-dark-full.png',
    tips: [
      'Os cards são clicáveis e levam à secção correspondente',
      'O gráfico mostra a evolução financeira dos últimos meses',
      'Pode alternar entre tema claro e escuro no canto superior',
    ],
  },
  {
    id: 'criar-projeto',
    icon: Plus,
    title: '4. Criar o Primeiro Projeto',
    description: 'Clique em "Novo Projeto" para criar o seu primeiro trabalho. Preencha o nome, cliente, tipo (Foto/Vídeo) e categoria.',
    screenshot: '/screenshots/screenshot-projeto-modal.png',
    tips: [
      'Se o cliente não existir, pode criar um novo no momento',
      'O tipo define se o projeto passa pela fase de Edição',
      'Adicione links externos na aba "Links e Pastas"',
    ],
  },
  {
    id: 'kanban-captacao',
    icon: Kanban,
    title: '5. Usar o Kanban de Captação',
    description: 'O Kanban mostra os seus projetos em colunas por estado. Arraste os cards entre colunas para atualizar o progresso.',
    screenshot: '/screenshots/screenshot-kanban-full.png',
    tips: [
      'Clique num card para ver detalhes e adicionar tarefas',
      'Use os filtros para encontrar projetos rapidamente',
      'A última coluna "Entregue" é fixa e marca a conclusão',
    ],
  },
  {
    id: 'kanban-edicao',
    icon: Film,
    title: '6. Fase de Edição',
    description: 'Projetos de vídeo passam automaticamente para o Kanban de Edição quando a captação é concluída. Gerencie a pós-produção aqui.',
    screenshot: '/screenshots/screenshot-kanban-full.png',
    tips: [
      'Projetos só de fotografia pulam esta fase',
      'Adicione editores como freelancers para rastrear pagamentos',
      'Use checklists para garantir qualidade antes da entrega',
    ],
  },
  {
    id: 'clientes',
    icon: Users,
    title: '7. Gerir Clientes',
    description: 'O CRM guarda todos os dados dos seus clientes: contactos, histórico de projetos e métricas de faturação.',
    screenshot: '/screenshots/screenshot-captacao-estudio.png',
    tips: [
      'Adicione notas para lembrar preferências do cliente',
      'Veja o total faturado por cliente ao longo do tempo',
      'Use tags para categorizar clientes (VIP, Recorrente, etc.)',
    ],
  },
  {
    id: 'calendario',
    icon: Calendar,
    title: '8. Calendário',
    description: 'Visualize todas as sessões, reuniões e prazos de entrega. Sincronize com o Google Calendar para manter tudo atualizado.',
    screenshot: '/screenshots/screenshot-calendario-full.png',
    tips: [
      'Arraste eventos para reagendar rapidamente',
      'Eventos de projeto são criados automaticamente',
      'Ative a sincronização nas Configurações > Integrações',
    ],
  },
  {
    id: 'pagamentos',
    icon: CreditCard,
    title: '9. Controlar Pagamentos',
    description: 'Registe valores a receber de clientes e a pagar a freelancers. Acompanhe o status e evite atrasos.',
    screenshot: '/screenshots/screenshot-pagamentos.png',
    tips: [
      'Associe pagamentos a projetos para melhor rastreamento',
      'Use filtros para ver apenas pendentes ou vencidos',
      'Exporte para Excel para integrar com a sua contabilidade',
    ],
  },
  {
    id: 'relatorios',
    icon: BarChart3,
    title: '10. Analisar Relatórios',
    description: 'Veja métricas do seu negócio: receita por período, top clientes, projetos por categoria e performance da equipa.',
    screenshot: '/screenshots/screenshot-relatorios-6m.png',
    tips: [
      'Alterne entre períodos de 3, 6 ou 12 meses',
      'Identifique os clientes mais rentáveis',
      'Use os dados para tomar decisões estratégicas',
    ],
  },
  {
    id: 'equipa',
    icon: UserCog,
    title: '11. Convidar Equipa',
    description: 'Adicione membros à sua equipa com diferentes níveis de acesso. Editores, captadores, freelancers ou apenas visualizadores.',
    screenshot: '/screenshots/screenshot-permissoes.png',
    tips: [
      'Cada função tem permissões específicas',
      'Freelancers só veem as suas próprias tarefas e ganhos',
      'Admins têm acesso total ao workspace',
    ],
  },
  {
    id: 'configuracoes',
    icon: Settings,
    title: '12. Configurações e Planos',
    description: 'Personalize o seu workspace, gerencie integrações e escolha o plano ideal para as suas necessidades.',
    screenshot: '/screenshots/screenshot-conta-planos.png',
    tips: [
      'O trial de 30 dias dá acesso a todas as funcionalidades',
      'Pode fazer upgrade a qualquer momento',
      'Configure notificações por email nas preferências',
    ],
  },
];

export default function Tutorial() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const markAsComplete = (stepIndex: number) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
  };

  const progress = (completedSteps.length / tutorialSteps.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Tutorial | WillFlow - Como Começar</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-8 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Como Começar no{' '}
              <span className="gradient-text">WillFlow</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Siga este guia passo a passo para configurar o seu workspace e começar a gerir projetos como um profissional.
            </p>
            
            {/* Progress */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{completedSteps.length} de {tutorialSteps.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar / Index */}
            <aside className="lg:w-72 flex-shrink-0">
              <div className="lg:sticky lg:top-24 glass-card p-4 rounded-2xl">
                <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                  Índice
                </h3>
                <nav className="space-y-1">
                  {tutorialSteps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => {
                        setActiveStep(index);
                        document.getElementById(step.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transition-all",
                        activeStep === index 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {completedSteps.includes(index) ? (
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <step.icon className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="truncate">{step.title}</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 ml-auto transition-transform",
                        activeStep === index && "rotate-90"
                      )} />
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Steps Content */}
            <main className="flex-1 space-y-16">
              {tutorialSteps.map((step, index) => (
                <motion.section
                  key={step.id}
                  id={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  onViewportEnter={() => setActiveStep(index)}
                  className="scroll-mt-24"
                >
                  <div className="glass-card p-6 md:p-8 rounded-2xl">
                    {/* Step Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={cn(
                        "flex items-center justify-center w-14 h-14 rounded-2xl",
                        completedSteps.includes(index) 
                          ? "bg-success/10" 
                          : "bg-primary/10"
                      )}>
                        {completedSteps.includes(index) ? (
                          <CheckCircle2 className="h-7 w-7 text-success" />
                        ) : (
                          <step.icon className="h-7 w-7 text-primary" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{step.title}</h2>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>

                    {/* Screenshot */}
                    <div className="relative rounded-xl overflow-hidden border shadow-lg mb-6 bg-muted/20">
                      <img 
                        src={step.screenshot} 
                        alt={`Screenshot: ${step.title}`}
                        className="w-full"
                        loading="lazy"
                      />
                    </div>

                    {/* Tips */}
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        💡 Dicas
                      </h4>
                      <ul className="space-y-2">
                        {step.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (index > 0) {
                            setActiveStep(index - 1);
                            document.getElementById(tutorialSteps[index - 1].id)?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        disabled={index === 0}
                        className={index === 0 ? 'invisible' : ''}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Anterior
                      </Button>

                      <Button
                        variant={completedSteps.includes(index) ? "secondary" : "default"}
                        onClick={() => markAsComplete(index)}
                        className={completedSteps.includes(index) ? "" : "gradient-primary"}
                      >
                        {completedSteps.includes(index) ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Concluído
                          </>
                        ) : (
                          "Marcar como lido"
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (index < tutorialSteps.length - 1) {
                            setActiveStep(index + 1);
                            document.getElementById(tutorialSteps[index + 1].id)?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        disabled={index === tutorialSteps.length - 1}
                        className={index === tutorialSteps.length - 1 ? 'invisible' : ''}
                      >
                        Próximo
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </motion.section>
              ))}

              {/* Final CTA */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="glass-card p-12 text-center rounded-2xl"
              >
                <h2 className="text-3xl font-bold mb-4">
                  Pronto para começar? 🚀
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Agora que conhece o WillFlow, crie a sua conta e comece a gerir os seus projetos.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth?trial=true">
                    <Button size="lg" className="gradient-primary">
                      Criar conta grátis
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/ajuda">
                    <Button size="lg" variant="outline">
                      Preciso de ajuda
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </main>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
