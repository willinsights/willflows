import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Kanban, Users, PlayCircle, Euro, MessageCircle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCtaClick } from '@/lib/google-ads';
import dashboardPrint from '@/assets/prints/willflow-dashboard-insights.webp.asset.json';

type Orbit = { icon: LucideIcon; label: string; x: number; y: number; ax: number; ay: number };

// x/y: card centre in % of the stage; ax/ay: where its light line meets the laptop.
const orbits: Orbit[] = [
  { icon: Calendar, label: 'Agenda', x: 8, y: 12, ax: 24, ay: 20 },
  { icon: Kanban, label: 'Projetos', x: 92, y: 12, ax: 76, ay: 20 },
  { icon: Users, label: 'Clientes', x: 6, y: 52, ax: 20, ay: 52 },
  { icon: PlayCircle, label: 'Aprovação de vídeo', x: 94, y: 52, ax: 80, ay: 52 },
  { icon: Euro, label: 'Finanças', x: 30, y: 92, ax: 38, ay: 76 },
  { icon: MessageCircle, label: 'Chat', x: 70, y: 92, ax: 62, ay: 76 },
];

const OrbitCard = forwardRef<HTMLDivElement, { orbit: Orbit; index: number }>(({ orbit, index }, ref) => {
  const Icon = orbit.icon;
  return (
    <div ref={ref} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${orbit.x}%`, top: `${orbit.y}%` }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.5 + index * 0.08 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="grid h-16 w-16 xl:h-20 xl:w-20 place-items-center rounded-2xl border border-kanban-cyan/60 bg-background/40 backdrop-blur-xl shadow-[0_0_30px_hsl(var(--kanban-cyan)/0.45),inset_0_0_18px_hsl(var(--kanban-cyan)/0.15)]">
        <Icon className="h-8 w-8 xl:h-9 xl:w-9 text-foreground" strokeWidth={1.6} aria-hidden="true" />
      </div>
      <span className="text-xs font-semibold text-foreground/80 whitespace-nowrap">{orbit.label}</span>
    </motion.div>
    </div>
  );
});
OrbitCard.displayName = 'OrbitCard';

export function OneSystemHero({ isBetaMode, betaSlot }: { isBetaMode: boolean; betaSlot?: React.ReactNode }) {
  return (
    <section className="relative pt-28 pb-20 overflow-hidden">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 45% at 50% 62%, hsl(var(--kanban-cyan) / 0.22) 0%, transparent 60%),
              radial-gradient(ellipse 35% 30% at 90% 10%, hsl(var(--kanban-purple) / 0.12) 0%, transparent 60%),
              radial-gradient(ellipse 35% 30% at 5% 40%, hsl(var(--kanban-cyan) / 0.10) 0%, transparent 60%),
              hsl(var(--background))
            `,
          }}
        />
      </div>

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-kanban-cyan/50 bg-kanban-cyan/10 px-3 py-1 text-xs font-semibold tracking-wide text-kanban-cyan">
            {isBetaMode ? 'Beta Privado · Acesso por convite' : '7 dias grátis · Sem cartão'}
          </span>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.02] tracking-tight">
            Tudo num só <span className="text-kanban-cyan drop-shadow-[0_0_24px_hsl(var(--kanban-cyan)/0.5)]">sistema.</span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-foreground/85">
            Feito exclusivamente para fotógrafos e filmmakers.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isBetaMode ? betaSlot : (
              <>
                <Link to="/auth?trial=true" data-tracked onClick={() => trackCtaClick('hero')}>
                  <Button size="lg" className="text-lg px-8 h-14 rounded-full bg-kanban-cyan text-background hover:bg-kanban-cyan/90 shadow-[0_0_30px_hsl(var(--kanban-cyan)/0.5)]">
                    Experimente 7 dias grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#como-funciona">
                  <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-full border-kanban-cyan/50 text-kanban-cyan hover:bg-kanban-cyan/10">
                    Ver como funciona
                  </Button>
                </a>
              </>
            )}
          </div>
        </motion.div>

        {/* Stage: laptop with the real dashboard and the functions around it */}
        <div className="relative mx-auto mt-14 max-w-6xl md:aspect-[16/9.5]">
          <svg className="absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {orbits.map((o) => (
              <path
                key={o.label}
                d={`M ${o.x} ${o.y} C ${(o.x + o.ax) / 2} ${o.y}, ${(o.x + o.ax) / 2} ${o.ay}, ${o.ax} ${o.ay}`}
                fill="none"
                stroke="hsl(var(--kanban-cyan))"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                style={{ filter: 'drop-shadow(0 0 4px hsl(var(--kanban-cyan)))' }}
              />
            ))}
          </svg>

          <div className="relative mx-auto md:absolute md:left-[20%] md:top-[8%] md:w-[60%]">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-t-2xl border-2 border-kanban-cyan/80 bg-background p-2 shadow-[0_0_60px_hsl(var(--kanban-cyan)/0.45)]">
              <img
                src={dashboardPrint.url}
                alt="Dashboard real do WillFlow com o que fazer hoje, projetos em captação e edição, e receita, custo e lucro previstos do mês"
                className="w-full rounded-lg"
                width={1600}
                height={1000}
                loading="eager"
                decoding="async"
                {...({ fetchpriority: 'high' } as Record<string, string>)}
              />
            </div>
            <div className="mx-auto h-3 w-[112%] -ml-[6%] rounded-b-xl bg-gradient-to-b from-muted to-muted/40 border-x border-b border-kanban-cyan/40" />
          </motion.div>
          </div>

          <div className="hidden md:block">
            {orbits.map((o, i) => <OrbitCard key={o.label} orbit={o} index={i} />)}
          </div>

          {/* Mobile: functions as a grid under the laptop */}
          <div className="mt-10 grid grid-cols-3 gap-4 md:hidden">
            {orbits.map((o) => {
              const Icon = o.icon;
              return (
                <div key={o.label} className="flex flex-col items-center gap-2">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-kanban-cyan/60 bg-background/40 shadow-[0_0_20px_hsl(var(--kanban-cyan)/0.4)]">
                    <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-foreground/80 text-center">{o.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
