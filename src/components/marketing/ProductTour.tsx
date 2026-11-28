import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const tabs = [
  { id: 'kanban', label: 'Quadro', img: '/screenshots/banner-kanban.png', title: 'Da captação à entrega num só quadro', text: 'Arraste cada projeto entre fases. Quando a captação termina, o projeto passa para a edição.' },
  { id: 'aprovacao', label: 'Aprovação', img: '/screenshots/banner-video-approval.png', title: 'O cliente aprova com a sua marca', text: 'Envie um link. O cliente vê o vídeo, comenta no momento exato e aprova sem criar conta.' },
  { id: 'calendario', label: 'Calendário', img: '/screenshots/banner-calendario.png', title: 'Gravações, sessões e prazos juntos', text: 'Veja a semana da equipa e ligue o Google Calendar nos planos que o incluem.' },
  { id: 'financas', label: 'Finanças', img: '/screenshots/banner-pagamentos.png', title: 'O que entrou, o que falta e o que pagar', text: 'Acompanhe pagamentos de clientes e da equipa, com valores em EUR ou BRL.' },
];

export function ProductTour() {
  return (
    <section id="como-funciona" aria-labelledby="tour-title" className="py-20 px-4 scroll-mt-20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h2 id="tour-title" className="text-3xl md:text-4xl font-bold tracking-tight">Veja o WillFlow a funcionar</h2>
          <p className="mt-4 text-lg text-muted-foreground">Imagens reais da aplicação.</p>
        </div>
        <Tabs defaultValue="kanban">
          <TabsList className="mx-auto mb-8 grid h-auto w-full max-w-xl grid-cols-2 gap-1 rounded-2xl p-1 sm:grid-cols-4">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="min-h-11 rounded-xl">{t.label}</TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-0">
              <div className="grid items-center gap-8 lg:grid-cols-[1fr_2fr]">
                <div>
                  <h3 className="text-2xl font-semibold">{t.title}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{t.text}</p>
                </div>
                <div>
                  <img src={t.img} alt={`Ecrã ${t.label} do WillFlow`} loading="lazy" decoding="async" className="w-full h-auto" />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
