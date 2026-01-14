import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Sparkles, LayoutDashboard, FolderKanban, Film, Users, Calendar, CreditCard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao WillFlow! 🎉',
    description: 'Está a usar o WillFlow com 30 dias grátis como bónus de lançamento! Vamos fazer um tour rápido. E não se esqueça: temos uma aba de Feedback — adoramos receber as suas sugestões!',
    icon: Sparkles,
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Aqui tem uma visão geral de todos os seus projetos, métricas importantes e atividade recente. Tudo num só lugar.',
    icon: LayoutDashboard,
  },
  {
    id: 'captacao',
    title: 'Kanban - Captação',
    description: 'Gerencie os projetos na fase de captação. Arraste os cards entre colunas para atualizar o estado de cada projeto.',
    icon: FolderKanban,
  },
  {
    id: 'edicao',
    title: 'Kanban - Edição',
    description: 'Acompanhe os projetos na fase de pós-produção. Os projetos passam automaticamente para cá após a captação.',
    icon: Film,
  },
  {
    id: 'clientes',
    title: 'CRM de Clientes',
    description: 'Mantenha todos os dados dos seus clientes organizados. Histórico de projetos, contactos e notas importantes.',
    icon: Users,
  },
  {
    id: 'calendario',
    title: 'Calendário',
    description: 'Visualize todos os seus compromissos, sessões e prazos de entrega. Integração disponível com Google Calendar.',
    icon: Calendar,
  },
  {
    id: 'pagamentos',
    title: 'Pagamentos',
    description: 'Controle receitas, custos e pagamentos pendentes. Saiba sempre quanto tem a receber e a pagar.',
    icon: CreditCard,
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    description: 'Personalize o seu workspace, gerencie a equipa e configure integrações. O tour está sempre disponível aqui!',
    icon: Settings,
  },
];

interface ProductTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ProductTour({ onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} de {tourSteps.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-1 mb-6" />

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"
                >
                  <step.icon className="h-10 w-10 text-primary" />
                </motion.div>
              </div>

              {/* Text */}
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirstStep}
              className={isFirstStep ? 'invisible' : ''}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <Button
              variant="ghost"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              Pular tour
            </Button>

            <Button
              onClick={handleNext}
              className="gradient-primary"
            >
              {isLastStep ? 'Concluir' : 'Próximo'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
