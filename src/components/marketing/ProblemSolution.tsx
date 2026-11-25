import { MessageSquareWarning, CalendarX2, Wallet, Images } from 'lucide-react';

// Each pain maps to a capability that exists in the product today.
const pairs = [
  { icon: MessageSquareWarning, pain: 'O feedback do cliente chega por WhatsApp, email e áudio.', fix: 'O cliente comenta no segundo exato do vídeo e aprova num link com a marca do seu estúdio, sem criar conta.' },
  { icon: CalendarX2, pain: 'Não sabe o que está em captação, em edição ou à espera de entrega.', fix: 'Cada projeto avança num quadro Captação → Edição → Entrega, e o ecrã Hoje mostra o que precisa de si agora.' },
  { icon: Wallet, pain: 'No fim do mês, não sabe quanto ganhou em cada trabalho.', fix: 'Valor acordado, custos da equipa e custos extra ficam no projeto, e os relatórios contam os projetos entregues.' },
  { icon: Images, pain: 'A seleção de fotos é feita por listas de números de ficheiro.', fix: 'O cliente escolhe as favoritas numa galeria com limite, comenta num ponto da foto e pede extras (plano Studio).' },
];

export function ProblemSolution() {
  return (
    <section aria-labelledby="problema-title" className="py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 id="problema-title" className="text-3xl md:text-4xl font-bold tracking-tight">Conhece estas situações?</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">O dia a dia de quem fotografa e filma, e como o WillFlow ajuda.</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {pairs.map((p) => (
            <li key={p.pain} className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 p-6">
              <div className="flex items-start gap-3">
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-muted-foreground line-through decoration-muted-foreground/40">{p.pain}</p>
              </div>
              <p className="mt-4 border-l-2 border-kanban-cyan pl-4 font-medium leading-relaxed">{p.fix}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
