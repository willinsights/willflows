import { forwardRef, useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Loader2, Film, Building2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingStatus, type BusinessType } from '@/hooks/useOnboardingStatus';
import { useToast } from '@/hooks/use-toast';

const MotionDiv = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <motion.div ref={ref} {...props} />
));
MotionDiv.displayName = 'MotionDiv';

interface TypeOption {
  id: BusinessType;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
  title: string;
  description: string;
  roles: string[];
  columns: number;
  summary: string;
}

const OPTIONS: TypeOption[] = [
  {
    id: 'freelancer',
    icon: Film,
    emoji: '🎬',
    title: 'Freelancer',
    description: 'Trabalho sozinho ou com poucos colaboradores pontuais',
    roles: ['Admin'],
    columns: 4,
    summary: 'Kanban simples com 4 colunas (A fazer → Em edição → Revisão → Entregue).',
  },
  {
    id: 'studio',
    icon: Building2,
    emoji: '🏢',
    title: 'Pequeno estúdio',
    description: 'Equipa de 2 a 10 pessoas, clientes recorrentes',
    roles: ['Admin', 'Edição', 'Captação'],
    columns: 5,
    summary: 'Roles essenciais e 5 colunas de Kanban com revisão de cliente.',
  },
  {
    id: 'agency',
    icon: Rocket,
    emoji: '🚀',
    title: 'Agência',
    description: 'Equipa grande, múltiplos clientes em paralelo, faturação complexa',
    roles: ['Admin', 'Edição', 'Captação', 'Gestão', 'Visualização'],
    columns: 6,
    summary: 'Todos os roles activados e Kanban completo com SLAs.',
  },
];

export function WelcomeWizard() {
  const { shouldShowModal, completeOnboarding } = useOnboardingStatus();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<BusinessType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!shouldShowModal) return null;

  const selectedOption = OPTIONS.find((o) => o.id === selected);

  const handleStart = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await completeOnboarding(selected);
      toast({
        title: '🎉 Configuração concluída',
        description: 'O teu workspace está pronto. Segue a checklist no Dashboard.',
      });
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message ?? 'Não foi possível concluir o onboarding.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => { /* locked until completed */ }}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary">Passo {step} de 2</Badge>
          </div>
          <DialogTitle>
            {step === 1 ? 'Que tipo de negócio és?' : 'Vamos configurar a tua equipa'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Vamos pré-configurar o teu workspace com base na tua resposta.'
              : 'Resumo do que vai ser activado. Podes ajustar tudo depois nas definições.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <MotionDiv
              key="step-1"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="grid gap-3 sm:grid-cols-3"
            >
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelected(opt.id)}
                    className={cn(
                      'group text-left rounded-xl border-2 p-4 transition-all flex flex-col gap-2',
                      active
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden>
                        {opt.emoji}
                      </span>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="font-semibold">{opt.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </MotionDiv>
          )}

          {step === 2 && selectedOption && (
            <MotionDiv
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{selectedOption.emoji}</span>
                  <div>
                    <div className="font-semibold">{selectedOption.title}</div>
                    <div className="text-xs text-muted-foreground">{selectedOption.summary}</div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-background p-3 border">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Roles activados
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOption.roles.map((r) => (
                        <Badge key={r} variant="outline" className="font-normal">
                          <Check className="h-3 w-3 mr-1" /> {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-background p-3 border">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Kanban padrão
                    </div>
                    <div className="text-sm font-semibold">{selectedOption.columns} colunas</div>
                    <div className="text-xs text-muted-foreground">
                      Personalizáveis em Captação / Edição.
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Vais poder convidar a equipa, ajustar permissões e personalizar o Kanban a qualquer
                momento.
              </p>
            </MotionDiv>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-2 pt-2">
          {step === 2 ? (
            <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          ) : (
            <span />
          )}

          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!selected}>
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={submitting} className="gradient-primary">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> A configurar...
                </>
              ) : (
                <>
                  Começar <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
