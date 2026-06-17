import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Circle, ArrowRight, PartyPopper, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

const MotionDiv = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <motion.div ref={ref} {...props} />
));
MotionDiv.displayName = 'MotionDiv';

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { shouldShowChecklist, shouldShowCongrats, progress, dismiss } = useOnboardingStatus();

  if (shouldShowCongrats) {
    return (
      <MotionDiv
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-success/40 bg-gradient-to-br from-success/10 via-background to-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-full bg-success/15">
              <PartyPopper className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Estás pronto! 🎉</div>
              <p className="text-sm text-muted-foreground">
                O teu workspace está configurado. Bom trabalho!
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => dismiss()}>
              <X className="h-4 w-4 mr-1" /> Dispensar
            </Button>
          </CardContent>
        </Card>
      </MotionDiv>
    );
  }

  if (!shouldShowChecklist) return null;

  const { done, total, items } = progress;
  const pct = Math.round((done / total) * 100);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Primeiros passos
                <Badge variant="secondary" className="ml-1">
                  {done} de {total} concluídos
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Acaba a configuração para tirar o máximo do teu workspace.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => dismiss()}
              title="Dispensar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={pct} className="h-2 mt-3" />
        </CardHeader>

        <CardContent className="pt-0">
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-3 py-2.5"
              >
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border',
                    item.done
                      ? 'bg-success/15 border-success/30 text-success'
                      : 'bg-muted/50 border-border text-muted-foreground',
                  )}
                >
                  {item.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
                </div>
                <span
                  className={cn(
                    'flex-1 text-sm',
                    item.done && 'line-through text-muted-foreground',
                  )}
                >
                  {item.label}
                </span>
                {!item.done && item.key !== 'workspace' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => navigate(item.path)}
                  >
                    {item.cta} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </MotionDiv>
  );
}
