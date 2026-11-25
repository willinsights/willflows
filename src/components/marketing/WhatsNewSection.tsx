import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CalendarCheck, Images, Film, Workflow, BarChart3, ShieldCheck, ArrowRight } from 'lucide-react';

type Kind = 'Novo' | 'Melhorado' | 'Corrigido';

// Only features confirmed in the current product (25/11/2026).
const items: { kind: Kind; icon: typeof Images; title: string; text: string; plan?: string }[] = [
  { kind: 'Novo', icon: CalendarCheck, title: 'Ecrã Hoje', text: 'Abra o WillFlow e veja logo as gravações, sessões, prazos e pagamentos que precisam de si hoje.' },
  { kind: 'Novo', icon: Images, title: 'Galerias de fotografia', text: 'Envie uma galeria ao cliente, que escolhe as favoritas, comenta num ponto da foto e pede fotos extra.', plan: 'Plano Studio' },
  { kind: 'Melhorado', icon: Film, title: 'Aprovação de vídeo com a sua marca', text: 'O cliente vê o logótipo e o nome do seu estúdio, comenta no momento exato e aprova sem criar conta.' },
  { kind: 'Melhorado', icon: Workflow, title: 'Automações mais fiáveis', text: 'Quando um cartão muda de coluna, avisos e emails são enviados uma vez, com nova tentativa se algo falhar.' },
  { kind: 'Melhorado', icon: BarChart3, title: 'Relatórios coerentes', text: 'Receita, custos e lucro usam a mesma regra em todos os ecrãs, com base nos projetos entregues.' },
  { kind: 'Corrigido', icon: ShieldCheck, title: 'Mais estabilidade e segurança', text: 'Links externos abrem sem login, os formulários mostram o que falta preencher e os dados de cada estúdio estão mais protegidos.' },
];

const kindStyle: Record<Kind, string> = {
  Novo: 'bg-kanban-cyan/15 text-kanban-cyan border-kanban-cyan/40',
  Melhorado: 'bg-kanban-purple/15 text-kanban-purple border-kanban-purple/40',
  Corrigido: 'bg-success/15 text-success border-success/40',
};

export function WhatsNewSection() {
  const reduce = useReducedMotion();
  return (
    <section id="novidades" aria-labelledby="novidades-title" className="py-24 px-4 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 15% 20%, hsl(var(--kanban-cyan) / 0.12), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 80%, hsl(var(--kanban-purple) / 0.14), transparent 60%)' }} />
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <span className="inline-flex items-center rounded-full border border-kanban-cyan/40 bg-kanban-cyan/10 px-4 py-1 text-xs font-semibold tracking-[0.2em] uppercase text-kanban-cyan">WillFlow 2.0</span>
          <h2 id="novidades-title" className="mt-5 text-3xl md:text-5xl font-bold tracking-tight">O que há de novo no 2.0</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Mais clareza no dia a dia, entregas mais profissionais ao cliente e números em que pode confiar.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <motion.article key={it.title}
              initial={reduce ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-kanban-cyan/40 via-border/40 to-kanban-purple/40">
              <div className="h-full rounded-2xl bg-card/80 backdrop-blur-md p-6 transition-colors group-hover:bg-card">
                <div className="flex items-center justify-between mb-5">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-kanban-cyan/20 to-kanban-purple/20 flex items-center justify-center">
                    <it.icon className="h-5 w-5 text-kanban-cyan" aria-hidden="true" />
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kindStyle[it.kind]}`}>{it.kind}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{it.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{it.text}</p>
                {it.plan && <p className="mt-4 text-xs font-medium text-kanban-purple">{it.plan}</p>}
              </div>
            </motion.article>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/funcionalidades" className="inline-flex items-center gap-2 text-kanban-cyan font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            Ver todas as funcionalidades <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
