import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const faqs = [
  {
    q: 'Quanto se cobra por um vídeo institucional?',
    a: 'Não existe tabela única: o preço justo é a soma das horas de captação e edição ao teu valor/hora, mais custos diretos (deslocações, equipamento alugado, música, colaboradores) e a margem que queres ter. Esta calculadora faz essa conta em segundos.',
  },
  {
    q: 'A margem deve ser calculada sobre o custo ou sobre o preço final?',
    a: 'Aqui a margem é aplicada sobre o preço final (markup sobre custo total), que é a forma mais comum de garantir que a percentagem de lucro se mantém depois de somar todos os custos.',
  },
  {
    q: 'Devo incluir IVA no valor apresentado ao cliente?',
    a: 'A calculadora apresenta o valor sem IVA e o valor com IVA à taxa que indicares. Para clientes empresa costuma comunicar-se o valor sem IVA; para particulares, o valor final com IVA.',
  },
  {
    q: 'E se o cliente pedir alterações extra?',
    a: 'Define no orçamento quantas rondas de revisão estão incluídas e o preço por ronda adicional. Uma reedição costuma custar entre 15% e 30% do valor da edição inicial.',
  },
];

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(
    Number.isFinite(v) ? v : 0
  );

export default function CalculadoraPrecoVideo() {
  const [hourRate, setHourRate] = useState(35);
  const [shootHours, setShootHours] = useState(8);
  const [editHours, setEditHours] = useState(12);
  const [preHours, setPreHours] = useState(3);
  const [directCosts, setDirectCosts] = useState(150);
  const [crewCosts, setCrewCosts] = useState(0);
  const [margin, setMargin] = useState(30);
  const [vat, setVat] = useState(23);

  const result = useMemo(() => {
    const labour = (shootHours + editHours + preHours) * hourRate;
    const cost = labour + directCosts + crewCosts;
    const marginPct = Math.min(Math.max(margin, 0), 90) / 100;
    const priceNet = cost / (1 - marginPct);
    const profit = priceNet - cost;
    const priceGross = priceNet * (1 + vat / 100);
    return { labour, cost, priceNet, profit, priceGross };
  }, [hourRate, shootHours, editHours, preHours, directCosts, crewCosts, margin, vat]);

  const fields: Array<[string, number, (v: number) => void, string]> = [
    ['Valor/hora (€)', hourRate, setHourRate, 'O teu custo-hora de referência'],
    ['Horas de pré-produção', preHours, setPreHours, 'Reuniões, guião, planeamento'],
    ['Horas de captação', shootHours, setShootHours, 'Dias de filmagem × horas'],
    ['Horas de edição', editHours, setEditHours, 'Montagem, cor, som, exportação'],
    ['Custos diretos (€)', directCosts, setDirectCosts, 'Deslocações, aluguer, música, storage'],
    ['Colaboradores (€)', crewCosts, setCrewCosts, 'Segundo operador, drone, editor externo'],
    ['Margem desejada (%)', margin, setMargin, 'Lucro sobre o preço final'],
    ['IVA (%)', vat, setVat, 'Taxa aplicável ao cliente'],
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Calculadora de preço de vídeo: quanto cobrar por um vídeo | WillFlow</title>
        <meta
          name="description"
          content="Calculadora gratuita para saber quanto cobrar por um vídeo: horas de captação e edição, custos, margem de lucro e IVA. Resultado imediato, sem registo."
        />
        <link rel="canonical" href="https://willflow.app/ferramentas/calculadora-preco-video" />
        <meta property="og:title" content="Calculadora de preço de vídeo — quanto cobrar por um vídeo" />
        <meta
          property="og:description"
          content="Calcula o preço justo de um vídeo com base em horas, custos e margem."
        />
        <meta property="og:url" content="https://willflow.app/ferramentas/calculadora-preco-video" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Calculadora de preço de vídeo',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: 'https://willflow.app/ferramentas/calculadora-preco-video',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ])}
        </script>
      </Helmet>

      <PublicHeader />

      <main>
        <section className="pt-16 pb-8 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Calculadora de preço de vídeo
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Quanto cobrar por um vídeo? Indica as horas de trabalho, os custos do projeto e a
              margem que queres ter — a calculadora mostra o preço a apresentar ao cliente.
            </p>
          </div>
        </section>

        <section className="pb-16 px-4">
          <div className="container mx-auto max-w-4xl grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Dados do projeto</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {fields.map(([label, value, setter, hint]) => (
                  <div key={label} className="space-y-1.5">
                    <Label htmlFor={label}>{label}</Label>
                    <Input
                      id={label}
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setter(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="h-fit sticky top-24">
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Mão de obra" value={eur(result.labour)} />
                <Row label="Custo total do projeto" value={eur(result.cost)} />
                <Row label="Lucro estimado" value={eur(result.profit)} />
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Preço a cobrar (sem IVA)</p>
                  <p className="text-3xl font-bold text-primary">{eur(result.priceNet)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Com IVA: <strong>{eur(result.priceGross)}</strong>
                  </p>
                </div>
                <Button asChild className="w-full gradient-primary">
                  <Link to="/auth">Controlar isto em cada projeto</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="pb-16 px-4">
          <div className="container mx-auto max-w-3xl space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-3">Como calcular o preço de um vídeo</h2>
              <p className="text-muted-foreground mb-4">
                O erro mais comum em audiovisual é orçamentar por comparação ("o colega cobra X").
                O preço sustentável nasce de quatro parcelas:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Tempo real de trabalho</strong> — pré-produção,
                  captação e edição, multiplicado pelo teu valor/hora (calcula-o na{' '}
                  <Link className="text-primary hover:underline" to="/ferramentas/calculadora-preco-hora">
                    calculadora de preço/hora
                  </Link>
                  ).
                </li>
                <li>
                  <strong className="text-foreground">Custos diretos</strong> — deslocações, aluguer
                  de equipamento, licenças de música, armazenamento e entregas.
                </li>
                <li>
                  <strong className="text-foreground">Colaboradores</strong> — segundo operador,
                  piloto de drone, editor externo, colorista.
                </li>
                <li>
                  <strong className="text-foreground">Margem</strong> — o que sobra para investir,
                  cobrir períodos parados e crescer. Abaixo de 20% o negócio fica frágil.
                </li>
              </ol>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">Perguntas frequentes</h2>
              <div className="space-y-5">
                {faqs.map((f) => (
                  <div key={f.q}>
                    <h3 className="font-semibold mb-1">{f.q}</h3>
                    <p className="text-muted-foreground">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-6">
              <h2 className="text-xl font-bold mb-2">Do orçamento ao lucro real</h2>
              <p className="text-muted-foreground mb-4">
                Orçamentar bem é metade do trabalho — a outra metade é saber, no fim do mês, quanto
                sobrou mesmo. O WillFlow regista custos, pagamentos a colaboradores e margem por
                projeto automaticamente.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="gradient-primary">
                  <Link to="/auth">Começar gratuitamente</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/para-videomakers">WillFlow para videomakers</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
